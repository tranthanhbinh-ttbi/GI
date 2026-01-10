const { Document } = require('flexsearch');
//const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');
const frontMatter = require('front-matter');
const notificationService = require('./notification-service');


class SearchService {
    constructor() {
        // Cấu hình FlexSearch Document
        this.index = new Document({
            charset: "latin:extra",
            tokenize: "forward",
            cache: true,
            document: {
                id: "id",
                index: ["title", "description", "content"], // Index content để tìm kiếm
                store: ["title", "description", "slug", "url", "thumbnail", "date", "category", "type", "author", "rating", "ratingCount"] // KHÔNG lưu content vào store để tiết kiệm RAM
            }
        });

        this.documents = new Map(); // Cache metadata for filter-only search
        this.isReady = false;
        this.contentDir = path.join(__dirname, '../content');
    }

    /**
     * Khởi tạo và bắt đầu theo dõi file
     */
    async init() {
        console.log('[SearchService] Initializing search index...');
        const { default: chokidar } = await import('chokidar');
        // Khởi tạo watcher
        const watcher = chokidar.watch(this.contentDir, {
            ignored: /(^|[\/\\])\../,
            persistent: true,
            ignoreInitial: false, // Index file có sẵn ngay lập tức
            depth: 2 // Chỉ quét sâu đến folder con (news/series)
        });

        watcher
            .on('add', path => this.addFile(path))
            .on('change', path => this.updateFile(path))
            .on('unlink', path => this.removeFile(path))
            .on('ready', () => {
                this.isReady = true;
                console.log('[SearchService] Search index ready.');
            });
    }

    /**
     * Xử lý thêm file mới vào index
     */
    addFile(filePath) {
        if (path.extname(filePath) !== '.md') return;

        try {
            const data = this.parseFile(filePath);
            if (data) {
                this.index.add(data);
                
                // Tối ưu RAM: Chỉ lưu metadata vào Map, loại bỏ content text dài
                const { content, ...metadata } = data;
                this.documents.set(data.id, metadata);
                // console.log(`[SearchService] Indexed: ${data.title}`);

                // Trigger Notification if system is already running (new post added live)
                if (this.isReady) {
                    notificationService.createAndBroadcast({
                        title: 'Bài viết mới!',
                        message: `Đã có bài viết mới: "${data.title}". Mời bạn vào xem ngay!`,
                        type: 'new_post',
                        link: data.url
                    });
                }
            }
        } catch (error) {
            console.error(`[SearchService] Error indexing file ${filePath}:`, error.message);
        }
    }

    /**
     * Xử lý cập nhật file
     */
    updateFile(filePath) {
        if (path.extname(filePath) !== '.md') return;
        
        try {
            const data = this.parseFile(filePath);
            if (data) {
                this.index.update(data);
                
                // Tối ưu RAM: Chỉ lưu metadata vào Map
                const { content, ...metadata } = data;
                this.documents.set(data.id, metadata);
                // console.log(`[SearchService] Updated: ${data.title}`);
            }
        } catch (error) {
            console.error(`[SearchService] Error updating file ${filePath}:`, error.message);
        }
    }

    /**
     * Xử lý xóa file
     */
    removeFile(filePath) {
        if (path.extname(filePath) !== '.md') return;
        
        // ID là đường dẫn tương đối để đảm bảo duy nhất
        const id = path.relative(this.contentDir, filePath);
        this.index.remove(id);
        this.documents.delete(id);
        // console.log(`[SearchService] Removed: ${id}`);
    }

    /**
     * Đọc và parse nội dung file
     */
    parseFile(filePath) {
        const content = fs.readFileSync(filePath, 'utf8');
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
        }

        // Tạo slug nếu không có trong frontmatter (dùng tên file)
        const slug = parsed.attributes.slug || path.basename(filePath, '.md');

        return {
            id: relativePath, // Sử dụng relative path làm ID duy nhất
            title: parsed.attributes.title || 'Untitled',
            description: parsed.attributes.description || '',
            content: parsed.body, // Index cả nội dung bài viết
            slug: slug,
            url: urlPrefix + slug,
            thumbnail: parsed.attributes.thumbnail || '/photos/placeholder-m6a0q.png',
            date: parsed.attributes.date,
            category: parsed.attributes.category,
            type: type,
            author: parsed.attributes.author || '',
            rating: parsed.attributes.rating || 5.0,
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
                return doc;
            }
        }
        return null;
    }

    /**
     * Lấy bài viết liên quan
     * @param {string} currentSlug Slug bài hiện tại để loại trừ
     * @param {object} criteria Tiêu chí (category, topic, author)
     * @param {number} limit
     */
    getRelatedPosts(currentSlug, criteria = {}, limit = 5) {
        let allDocs = Array.from(this.documents.values());
        
        // 1. Lọc bài hiện tại và bài tương lai
        const now = new Date();
        allDocs = allDocs.filter(doc => 
            doc.slug !== currentSlug && 
            (!doc.date || new Date(doc.date) <= now)
        );

        // 2. Tính điểm liên quan (Scoring)
        const scoredDocs = allDocs.map(doc => {
            let score = 0;
            if (criteria.category && doc.category === criteria.category) score += 3;
            if (criteria.topic && doc.topic === criteria.topic) score += 2; // Giả sử có field topic
            if (criteria.author && doc.author === criteria.author) score += 1;
            return { doc, score };
        });

        // 3. Sort theo điểm cao nhất -> mới nhất
        scoredDocs.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return new Date(b.doc.date) - new Date(a.doc.date);
        });

        return scoredDocs.slice(0, limit).map(item => item.doc);
    }
}

// Singleton instance
const searchService = new SearchService();
module.exports = searchService;
