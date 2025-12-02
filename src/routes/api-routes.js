const { getPosts } = require('../utils/contentLoader');

// Hàm hỗ trợ parse ngày tháng tiếng Việt (Ví dụ: "12 tháng 3, 2025")
function parseVietnameseDate(dateStr) {
    if (!dateStr) return new Date();
    // Nếu là chuỗi ISO chuẩn
    if (dateStr.includes('-')) return new Date(dateStr);
    
    // Map tháng tiếng Việt
    const months = {
        'tháng 1': '01', 'tháng 2': '02', 'tháng 3': '03', 'tháng 4': '04',
        'tháng 5': '05', 'tháng 6': '06', 'tháng 7': '07', 'tháng 8': '08',
        'tháng 9': '09', 'tháng 10': '10', 'tháng 11': '11', 'tháng 12': '12'
    };
    
    let processedStr = dateStr.toLowerCase().replace(',', '');
    for (const [key, val] of Object.entries(months)) {
        if (processedStr.includes(key)) {
            processedStr = processedStr.replace(key, val);
            break;
        }
    }
    // Giả định format sau khi replace: "12 03 2025"
    const parts = processedStr.split(' ');
    if (parts.length === 3) {
        // Trả về YYYY-MM-DD
        return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    }
    return new Date(dateStr); // Fallback
}

// Hàm kiểm tra khoảng thời gian
function isDateInRange(postDateStr, rangeType, customStart, customEnd) {
    const postDate = parseVietnameseDate(postDateStr);
    const now = new Date();
    // Reset giờ về 00:00:00 để so sánh ngày chuẩn xác
    now.setHours(0,0,0,0);
    postDate.setHours(0,0,0,0);

    switch (rangeType) {
        case 'today':
            return postDate.getTime() === now.getTime();
        case 'week': // Tuần này
        case 'this_week':
            const day = now.getDay(); // 0 (Sunday) - 6 (Saturday)
            const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is sunday
            const monday = new Date(now.setDate(diff));
            return postDate >= monday;
        case 'month': // Tháng này
        case 'this_month':
            const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            return postDate >= firstDayOfMonth;
        case 'year': // Năm nay
        case 'this_year':
            const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
            return postDate >= firstDayOfYear;
        case 'custom':
            if (customStart && customEnd) {
                const start = new Date(customStart);
                const end = new Date(customEnd);
                return postDate >= start && postDate <= end;
            }
            return true;
        default: 
            return true;
    }
}

async function ApiRoutes(fastify, options) {
    fastify.get('/api/posts', async (request, reply) => {
        try {
            const { 
                type,           // 'series' hoặc 'news'
                page = 1, 
                limit = 6,
                category,       // 'Bài Viết', 'Video', ...
                dateRange,      // 'today', 'week', ...
                startDate,      // Custom date start
                endDate,        // Custom date end
                rating,         // Filter theo sao (Series)
                sort,           // 'newest', 'oldest', 'most-viewed'
                source          // Filter theo nguồn (Tin tức)
            } = request.query;

            // 1. Lấy dữ liệu nguồn
            const contentType = type === 'news' ? 'news' : 'series';
            let posts = getPosts(contentType);

            // 2. XỬ LÝ BỘ LỌC (FILTER)

            // Lọc theo Category (Chỉ áp dụng nếu không phải 'Tất Cả')
            if (category && category !== 'Tất Cả' && category !== 'all') {
                // So sánh không phân biệt hoa thường
                posts = posts.filter(p => p.category && p.category.toLowerCase() === category.toLowerCase());
            }

            // Lọc theo Nguồn (Source - cho trang Tin tức)
            if (source && source !== 'all') {
                // Giả định logic lọc nguồn. Nếu dữ liệu chưa có field source, bạn cần thêm vào data.
                // Tạm thời lọc theo category hoặc custom logic
                // posts = posts.filter(p => p.source === source);
            }

            // Lọc theo Ngày
            if (dateRange && dateRange !== 'all') {
                posts = posts.filter(p => isDateInRange(p.date || p.displayDate, dateRange, startDate, endDate));
            }

            // Lọc theo Rating (Series)
            if (rating) {
                // Giả lập logic rating (vì data mẫu chưa có field rating cụ thể)
                // Nếu data có field rating: posts = posts.filter(p => p.rating >= parseInt(rating));
            }

            // 3. XỬ LÝ SẮP XẾP (SORT)
            if (sort) {
                posts.sort((a, b) => {
                    const dateA = parseVietnameseDate(a.date || a.displayDate);
                    const dateB = parseVietnameseDate(b.date || b.displayDate);
                    // Parse views: "2100 views" -> 2100
                    const viewA = parseInt(String(a.views).replace(/\D/g, '')) || 0;
                    const viewB = parseInt(String(b.views).replace(/\D/g, '')) || 0;

                    if (sort === 'oldest') return dateA - dateB;
                    if (sort === 'most-viewed') return viewB - viewA;
                    return dateB - dateA; // Default: Mới nhất
                });
            } else {
                // Mặc định sắp xếp mới nhất
                posts.sort((a, b) => parseVietnameseDate(b.date) - parseVietnameseDate(a.date));
            }

            // 4. PHÂN TRANG (PAGINATION)
            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);
            const startIndex = (pageNum - 1) * limitNum;
            const endIndex = startIndex + limitNum;
            
            const paginatedPosts = posts.slice(startIndex, endIndex);
            const hasMore = endIndex < posts.length;

            // 5. CHỌN TEMPLATE PARTIAL
            const template = contentType === 'news' ? 'partials/card-news' : 'partials/card-series';
            
            // Render HTML
            const html = await fastify.view(template, { posts: paginatedPosts });

            return { 
                success: true, 
                html: html, 
                hasMore: hasMore,
                total: posts.length 
            };

        } catch (error) {
            fastify.log.error(error);
            return { success: false, error: 'Internal Server Error' };
        }
    });
}

module.exports = ApiRoutes;