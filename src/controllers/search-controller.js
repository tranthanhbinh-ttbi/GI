const searchService = require('../services/search-service');
const ejs = require('ejs');
const path = require('path');

/**
 * API Lấy danh sách bài viết (Load More)
 * Trả về JSON chứa HTML đã render
 */
async function getPosts(request, reply) {
    try {
        const { q, limit, page, type, category, ...otherFilters } = request.query;

        // 1. Chuẩn hóa tham số
        const safeLimit = Math.min(parseInt(limit) || 6, 20); // Mặc định 6, tối đa 20
        const safePage = Math.max(parseInt(page) || 1, 1);
        const filters = {
            type: type || 'all',
            category: category === 'Tất Cả' ? 'all' : category,
            ...otherFilters
        };

        // 2. Lấy dữ liệu từ Service
        // Nếu type=all mà category=Tất cả -> Lấy hết
        // SearchService đã xử lý logic 'all'

        const results = searchService.search(q || '', safePage, safeLimit, filters);

        // 3. Render HTML partial (Card)
        // Đường dẫn tới template card
        // Lưu ý: search-controller nằm trong src/controllers, views ở src/views
        const templatePath = path.join(__dirname, '../views/partials/' +
            (filters.type === 'explore' ? 'card-kham-pha.ejs' :
                filters.type === 'news' ? 'card-news.ejs' : 'card-series.ejs'));

        // Render file EJS
        // Chúng ta cần truyền biến 'posts' vào template
        const html = await ejs.renderFile(templatePath, { posts: results.data });

        // 4. Trả về kết quả JSON chuẩn cho Frontend
        return reply.send({
            success: true,
            html: html,
            total: results.pagination.total,
            hasMore: safePage < results.pagination.totalPages,
            page: safePage
        });

    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({
            success: false,
            error: 'Internal Server Error'
        });
    }
}

/**
 * API Tìm kiếm (giữ nguyên logic cũ hoặc deprecate)
 */
async function search(request, reply) {
    try {
        const { q, limit, page, ...filters } = request.query;

        // Security: Validation & Sanitization
        // 1. Giới hạn độ dài query string để tránh DoS regex/search
        const safeQuery = (q && typeof q === 'string') ? q.slice(0, 100).trim() : '';

        // 2. Validate Limit: Max 100 items, Default 10
        let safeLimit = parseInt(limit);
        if (isNaN(safeLimit) || safeLimit < 1) safeLimit = 10;
        if (safeLimit > 100) safeLimit = 100;

        // 3. Validate Page: Default 1
        let safePage = parseInt(page);
        if (isNaN(safePage) || safePage < 1) safePage = 1;

        // Cho phép tìm kiếm rỗng nếu có filters, hoặc trả về rỗng nếu không có gì cả
        const hasFilters = Object.keys(filters).length > 0;
        const hasQuery = safeQuery.length > 0;

        if (!hasQuery && !hasFilters) {
            return reply.send([]);
        }

        const results = searchService.search(safeQuery, safePage, safeLimit, filters);

        // Trả về trực tiếp object { data, pagination } để frontend xử lý
        return reply.send(results.data);
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ error: 'Internal Server Error' });
    }
}

module.exports = {
    search,
    getPosts
};
