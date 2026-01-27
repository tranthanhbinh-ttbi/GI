const { Document } = require('flexsearch');
// chokidar imported dynamically in init()
const fs = require('fs');
const fsPromises = require('fs').promises; // Add fs promises for async read
const path = require('path');
const frontMatter = require('front-matter');
const notificationService = require('./notification-service');
const MarkdownIt = require('markdown-it');
const { glob } = require('glob'); // Import glob


class SearchService {
    constructor() {
        this.md = new MarkdownIt({ html: true });
        // Cấu hình FlexSearch Document
        this.index = new Document({
            charset: "latin:extra",
            tokenize: "forward",
            cache: true,
            document: {
                id: "id",
                index: ["title", "description", "content"], // Index content để tìm kiếm
                store: ["title", "description", "slug", "url", "thumbnail", "date", "displayDate", "category", "type", "author", "rating", "ratingCount"] // KHÔNG lưu content vào store để tiết kiệm RAM
            }
        });

        this.documents = new Map(); // Cache metadata for filter-only search
        this.isReady = false;
        this.contentDir = path.join(__dirname, '../content');
    }

    /**
     * Khởi tạo và nạp toàn bộ file vào index
     */
    async init() {
        if (this.isInit) return;
        this.isInit = true;

        console.log('[SearchService] Initializing search index...');

        try {
            // Glob all .md files
            const files = await glob('**/*.md', { cwd: this.contentDir, absolute: true });

            // Read and index all files in parallel
            await Promise.all(files.map(async (filePath) => {
                try {
                    const content = await fsPromises.readFile(filePath, 'utf8');
                    this.addFile(filePath, content);
                } catch (err) {
                    console.error(`[SearchService] Failed to load ${filePath}:`, err.message);
                }
            }));

            this.isReady = true;
            console.log(`[SearchService] Search index ready. Indexed ${this.documents.size} documents.`);
        } catch (err) {
            console.error('[SearchService] Critical Error in init:', err);
            this.isReady = true;
        }
    }

    /**
     * Xử lý thêm file mới vào index
     * @param {string} filePath Absolute path to file
     * @param {string|null} preLoadedContent Optional content if already read
     */
    addFile(filePath, preLoadedContent = null) {
        if (path.extname(filePath) !== '.md') return;

        try {
            const data = this.parseFile(filePath, preLoadedContent);
            if (data) {
                this.index.add(data);

                // Tối ưu RAM: Chỉ lưu metadata vào Map, loại bỏ content text dài
                const { content, ...metadata } = data;
                this.documents.set(data.id, metadata);
            }
        } catch (error) {
            console.error(`[SearchService] Error indexing file ${filePath}:`, error.message);
        }
    }

    /**
     * Đọc và parse nội dung file
     * @param {string} filePath
     * @param {string|null} content Optional content
     */
    parseFile(filePath, content = null) {
        if (content === null) {
            content = fs.readFileSync(filePath, 'utf8');
        }

        const parsed = frontMatter(content);
        const relativePath = path.relative(this.contentDir, filePath);

        // Xác định loại bài viết dựa trên thư mục cha
        const folderName = path.dirname(relativePath).split(path.sep)[0];
        let type = 'other';
        let urlPrefix = '/';

        if (folderName === 'news') {
            type = 'news';
            urlPrefix = '/tin-tuc/';
        } else if (folderName === 'series') {
            type = 'series';
            urlPrefix = '/series/';
        } else if (folderName === 'explore') {
            type = 'explore';
            urlPrefix = '/kham-pha/';
        }

        // Tạo slug nếu không có trong frontmatter (dùng tên file)
        const slug = parsed.attributes.slug || path.basename(filePath, '.md');

        // FIX: Xử lý múi giờ trên Vercel (UTC environment)
        // Nếu chuỗi ngày không có múi giờ (vd: "2026-01-11 11:11"), 
        // Vercel parse thành 11:11 UTC (tức 18:11 VN), trong khi ý user là 11:11 VN.
        // Điều này khiến bài viết bị coi là "tương lai" và bị ẩn đi 7 tiếng.
        // Giải pháp: Nếu phát hiện format ngày không có timezone, force về UTC+7.
        let date = parsed.attributes.date;
        const dateMatch = content.match(/^date:\s*["']?(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}(?::\d{2})?)["']?\s*$/m);

        if (dateMatch) {
            // Found raw date string without timezone info
            const rawDate = dateMatch[1];
            // Force UTC+7 (Vietnam Time)
            date = new Date(`${rawDate}+07:00`);
        }

        // Format displayDate
        let displayDate = '';
        if (date) {
            const d = new Date(date);
            if (!isNaN(d.getTime())) {
                const day = d.getDate().toString().padStart(2, '0');
                const month = (d.getMonth() + 1).toString().padStart(2, '0');
                const year = d.getFullYear();
                displayDate = `${day} Tháng ${month}, ${year}`;
            }
        }

        return {
            id: relativePath, // Sử dụng relative path làm ID duy nhất
            title: parsed.attributes.title || 'Untitled',
            description: parsed.attributes.description || '',
            content: parsed.body, // Index cả nội dung bài viết
            slug: slug,
            url: urlPrefix + slug,
            thumbnail: parsed.attributes.thumbnail || '/photos/placeholder-m6a0q.png',
            date: date,
            displayDate: displayDate, // Thêm formatted date
            category: parsed.attributes.category,
            type: type,
            author: parsed.attributes.author || '',
            rating: parsed.attributes.rating || 0,
            ratingCount: parsed.attributes.ratingCount || 0
        };
    }

    /**
     * Tạo các biến thể của từ khóa (xử lý số <-> chữ)
     * Ví dụ: "3 của con" -> ["3 của con", "ba của con"]
     */
    generateQueryVariations(query) {
        if (!query) return [];

        const variations = new Set([query]);
        const lowerQuery = query.toLowerCase();

        // Map số sang chữ (và ngược lại nếu cần)
        const numMap = {
            '0': ['không'],
            '1': ['một'],
            '2': ['hai'],
            '3': ['ba', 'tam'],
            '4': ['bốn', 'tư'],
            '5': ['năm'],
            '6': ['sáu'],
            '7': ['bảy'],
            '8': ['tám'],
            '9': ['chín'],
            '10': ['mười']
        };

        // Tìm các số trong query và tạo biến thể
        // Regex bắt các số đứng riêng lẻ hoặc kèm ký tự biên
        const regex = /\b([0-9]|10)\b/g;
        let match;

        // Nếu query chứa số, thay thế bằng chữ
        while ((match = regex.exec(lowerQuery)) !== null) {
            const num = match[0];
            if (numMap[num]) {
                numMap[num].forEach(textVal => {
                    const newQuery = lowerQuery.replace(new RegExp(`\\b${num}\\b`, 'g'), textVal);
                    variations.add(newQuery);
                });
            }
        }

        // Trường hợp ngược lại: Nếu query chứa chữ số dạng text (ví dụ "tập ba") -> "tập 3"
        // (Optional: Có thể thêm nếu cần, nhưng thường STT trả về số nhiều hơn)

        return Array.from(variations);
    }

    /**
     * Tìm kiếm
     * @param {string} query Từ khóa tìm kiếm
     * @param {number} page Trang hiện tại (1-based)
     * @param {number} limit Số lượng kết quả tối đa
     * @param {object} filters Các bộ lọc (type, category, time, sort, author, source)
     */
    search(query, page = 1, limit = 10, filters = {}) {
        let docs = [];

        if (query && query.trim().length > 0) {
            const queryVariations = this.generateQueryVariations(query.trim());
            const uniqueDocs = new Map();

            // Chạy tìm kiếm cho từng biến thể
            queryVariations.forEach(q => {
                const results = this.index.search(q, {
                    limit: 1000,
                    enrich: true,
                    bool: "or"
                });

                results.forEach(fieldResult => {
                    fieldResult.result.forEach(item => {
                        if (!uniqueDocs.has(item.id)) {
                            uniqueDocs.set(item.id, item.doc);
                        }
                    });
                });
            });

            docs = Array.from(uniqueDocs.values());
        } else {
            // Nếu không có query, lấy tất cả docs
            docs = Array.from(this.documents.values());
        }

        // --- Apply Filters ---

        // 1. Type
        if (filters.type && filters.type !== 'all') {
            docs = docs.filter(doc => doc.type === filters.type);
        }

        // 2. Category / Topic
        if (filters.category && filters.category !== 'all') {
            const cat = filters.category.toLowerCase();
            docs = docs.filter(doc => {
                return (doc.category && doc.category.toLowerCase().includes(cat)) ||
                    (doc.slug && doc.slug.toLowerCase().includes(cat)) ||
                    (doc.title && doc.title.toLowerCase().includes(cat));
            });
        }

        // 3. Author
        if (filters.author) {
            const auth = filters.author.toLowerCase();
            docs = docs.filter(doc => doc.author && doc.author.toLowerCase().includes(auth));
        }

        // 4. Source (News specific - mapped to Author or generic logic)
        if (filters.source && filters.source !== 'all') {
            if (filters.source === 'gender-insights') {
                docs = docs.filter(doc => doc.author && doc.author.toLowerCase() === 'gender insights');
            } else if (filters.source === 'partners') {
                docs = docs.filter(doc => doc.author && doc.author.toLowerCase() !== 'gender insights');
            }
        }

        // 5. Time
        // Mặc định: Luôn lọc bỏ các bài viết có ngày đăng trong tương lai (Scheduled Publishing)
        // Trừ khi có flag 'includeFuture' (dùng cho admin/preview nếu cần)
        if (!filters.includeFuture) {
            const now = new Date();
            docs = docs.filter(doc => {
                if (!doc.date) return true; // Nếu không có date, mặc định hiện (hoặc ẩn tùy logic)
                return new Date(doc.date) <= now;
            });
        }

        if (filters.time && filters.time !== 'all') {
            if (filters.time === 'custom' && filters.custom_date) {
                // Exact date match
                const targetDate = new Date(filters.custom_date).toDateString();
                docs = docs.filter(doc => {
                    if (!doc.date) return false;
                    return new Date(doc.date).toDateString() === targetDate;
                });
            } else {
                const now = new Date();
                docs = docs.filter(doc => {
                    if (!doc.date) return false;
                    const docDate = new Date(doc.date);
                    const diffTime = now - docDate; // miliseconds
                    const diffDays = diffTime / (1000 * 60 * 60 * 24);

                    switch (filters.time) {
                        case 'today': return diffDays <= 1;
                        case 'week': return diffDays <= 7;
                        case 'month': return diffDays <= 30;
                        case 'year': return diffDays <= 365;
                        default: return true;
                    }
                });
            }
        }

        // 6. Sort
        if (filters.sort) {
            if (filters.sort === 'relevance') {
                // Nếu chọn 'Liên quan nhất':
                // - Có query: Giữ nguyên thứ tự FlexSearch (không sort lại)
                // - Không query: Sắp xếp theo ngày mới nhất
                if (!query) {
                    docs.sort((a, b) => new Date(b.date) - new Date(a.date));
                }
            } else if (filters.sort === 'newest') {
                docs.sort((a, b) => new Date(b.date) - new Date(a.date));
            } else if (filters.sort === 'oldest') {
                docs.sort((a, b) => new Date(a.date) - new Date(b.date));
            } else if (filters.sort === 'popular') {
                // Sắp xếp theo rating cao nhất, nếu bằng nhau thì xem ai nhiều lượt rate hơn
                docs.sort((a, b) => {
                    const scoreA = (a.rating || 0) + (a.ratingCount || 0) * 0.1;
                    const scoreB = (b.rating || 0) + (b.ratingCount || 0) * 0.1;
                    return scoreB - scoreA;
                });
            }
        } else {
            // Mặc định (nếu không truyền sort):
            // Có query -> Giữ Relevance
            // Không query -> Mới nhất
            if (!query) {
                docs.sort((a, b) => new Date(b.date) - new Date(a.date));
            }
        }

        // 7. Exclude Slugs
        if (filters.excludeSlugs && Array.isArray(filters.excludeSlugs) && filters.excludeSlugs.length > 0) {
            const excludeSet = new Set(filters.excludeSlugs);
            docs = docs.filter(doc => !excludeSet.has(doc.slug));
        }

        // --- Pagination ---
        const total = docs.length;
        const totalPages = Math.ceil(total / limit);
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        const paginatedDocs = docs.slice(startIndex, endIndex);

        return {
            data: paginatedDocs,
            pagination: {
                total,
                page,
                limit,
                totalPages
            }
        };
    }
    /**
     * Lấy chi tiết bài viết theo Slug
     * @param {string} slug 
     * @param {boolean} includeFuture Có lấy bài chưa xuất bản không?
     */
    getPostBySlug(slug, includeFuture = false) {
        // Tìm trong documents map
        // Lưu ý: documents map lưu key là relative path, nên phải duyệt value để tìm slug
        // Đây là O(n), nhưng với memory map thì rất nhanh.
        // Nếu cần nhanh hơn, có thể tạo thêm Map<Slug, ID>

        for (const doc of this.documents.values()) {
            if (doc.slug === slug) {
                // Check ngày xuất bản
                if (!includeFuture && doc.date && new Date(doc.date) > new Date()) {
                    return null; // Chưa đến giờ đăng
                }

                // Re-read content from file (because content is stripped from memory cache)
                try {
                    const fullPath = path.join(this.contentDir, doc.id); // doc.id is relative path
                    const fileContent = fs.readFileSync(fullPath, 'utf8');
                    const parsed = frontMatter(fileContent);

                    const htmlContent = this.md.render(parsed.body);

                    // Return merged object: cached metadata + fresh content body
                    // Returning both 'content' and 'body' to support inconsistent view templates (series uses body, others use content)
                    return {
                        ...doc,
                        content: htmlContent,
                        body: htmlContent
                    };
                } catch (err) {
                    console.error(`[SearchService] Error reading content for slug ${slug}:`, err);
                    return doc; // Fallback to doc without body if read fails
                }
            }
        }
        return null;
    }

    /**
     * Lấy bài viết liên quan (Nâng cấp: Metadata + Content Relevance)
     * Trọng số: Category (3.5), Topic (2.5), Content (2.5), Author (1.0)
     * @param {string} currentSlug Slug bài hiện tại để loại trừ
     * @param {object} criteria Tiêu chí (category, topic, author, title)
     * @param {number} limit
     */
    getRelatedPosts(currentSlug, criteria = {}, limit = 5) {
        let allDocs = Array.from(this.documents.values());

        // 1. Tìm kiếm dựa trên nội dung (Sử dụng tiêu đề bài hiện tại làm từ khóa)
        let contentMatches = new Set();
        if (criteria.title) {
            // Tìm kiếm lỏng (loose) để bắt được nhiều ngữ cảnh hơn
            const results = this.index.search(criteria.title, {
                limit: 20, // Lấy top 20 bài giống nhất về nội dung để xét điểm cộng
                suggest: true // Cho phép sai chính tả nhẹ
            });

            // FlexSearch trả về mảng ID
            results.forEach(id => contentMatches.add(id));
        }

        // 2. Lọc bài hiện tại và bài tương lai
        const now = new Date();
        allDocs = allDocs.filter(doc =>
            doc.slug !== currentSlug &&
            (!doc.date || new Date(doc.date) <= now)
        );

        // 3. Tính điểm liên quan (Scoring System)
        const scoredDocs = allDocs.map(doc => {
            let score = 0;

            // --- Metadata Scoring (Dựa trên nhãn dán) ---
            // Ưu tiên cao nhất: Cùng Category (3.5)
            if (criteria.category && doc.category === criteria.category) score += 3.5;

            // Ưu tiên nhì: Cùng Topic (2.5)
            if (criteria.topic && doc.topic === criteria.topic) score += 2.5;

            // Ưu tiên ba: Cùng Tác giả (1.0)
            if (criteria.author && doc.author === criteria.author) score += 1.0;

            // --- Content Scoring (Dựa trên nội dung thực tế) ---
            // Nếu bài viết này nằm trong kết quả tìm kiếm của FlexSearch (2.5)
            if (contentMatches.has(doc.id)) {
                score += 2.5;
            }

            return { doc, score };
        });

        // 4. Sort theo điểm cao nhất -> mới nhất
        scoredDocs.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return new Date(b.doc.date) - new Date(a.doc.date);
        });

        // 5. Chọn lọc & Fallback
        // Chỉ lấy các bài có điểm > 0
        const relevantDocs = scoredDocs.filter(item => item.score > 0);
        let finalResult = relevantDocs.slice(0, limit).map(item => item.doc);

        // Fallback: Nếu không đủ bài liên quan, lấy thêm các bài mới nhất để lấp đầy UI
        if (finalResult.length < limit) {
            const remainingCount = limit - finalResult.length;
            const existingSlugs = new Set(finalResult.map(d => d.slug));

            const fallbackDocs = allDocs
                .filter(d => !existingSlugs.has(d.slug)) // Chưa có trong list
                .sort((a, b) => new Date(b.date) - new Date(a.date)) // Mới nhất
                .slice(0, remainingCount);

            finalResult = [...finalResult, ...fallbackDocs];
        }

        return finalResult;
    }

    /**
     * Lấy danh sách tác giả duy nhất từ các bài viết Khám phá
     */
    getUniqueAuthors() {
        const authors = new Set();
        this.documents.forEach(doc => {
            if (doc.type === 'explore' && doc.author) {
                authors.add(doc.author.trim());
            }
        });
        return Array.from(authors).sort((a, b) => a.localeCompare(b));
    }
}

// Singleton instance
const searchService = new SearchService();
module.exports = searchService;
