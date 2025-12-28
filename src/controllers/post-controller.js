const { getPosts } = require('../utils/contentLoader');
const { parseVietnameseDate, isDateInRange } = require('../utils/date-util');

async function getPostsHandler(request, reply) {
    try {
        const {
            type,
            page = 1,
            limit = 6,
            category,
            dateRange,
            startDate,
            endDate,
            rating,
            sort,
            source
        } = request.query;

        // 1. Load Data
        const contentType = type === 'news' ? 'news' : 'series';
        // Note: getPosts is now Async
        let posts = await getPosts(contentType);

        // 2. Filter
        if (category && category !== 'Tất Cả' && category !== 'all') {
            posts = posts.filter(p => p.category && p.category.toLowerCase() === category.toLowerCase());
        }

        if (source && source !== 'all') {
            // Future: Implement source filte
            // posts = posts.filter(p => p.source === source);
        }

        if (dateRange && dateRange !== 'all') {
            posts = posts.filter(p =>
                isDateInRange(p.date || p.displayDate, dateRange, startDate, endDate)
            );
        }

        if (rating) {
            // Future logic
        }

        // 3. Sort
        if (sort) {
            posts.sort((a, b) => {
                const dateA = parseVietnameseDate(a.date || a.displayDate);
                const dateB = parseVietnameseDate(b.date || b.displayDate);
                const viewA = parseInt(String(a.views || 0).replace(/\D/g, '')) || 0;
                const viewB = parseInt(String(b.views || 0).replace(/\D/g, '')) || 0;

                if (sort === 'oldest') return dateA - dateB;
                if (sort === 'most-viewed') return viewB - viewA;
                return dateB - dateA;
            });
        } else {
            // Default newest
            posts.sort((a, b) =>
                parseVietnameseDate(b.date || b.displayDate) - parseVietnameseDate(a.date || a.displayDate)
            );
        }

        // 4. Pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const startIndex = (pageNum - 1) * limitNum;
        const endIndex = startIndex + limitNum;

        const paginatedPosts = posts.slice(startIndex, endIndex);
        const hasMore = endIndex < posts.length;

        // 5. Render
        const template = contentType === 'news' ? 'partials/card-news' : 'partials/card-series';

        // Use fastify instance from request.server
        const html = await request.server.view(template, { posts: paginatedPosts });

        return {
            success: true,
            html: html,
            hasMore: hasMore,
            total: posts.length
        };

    } catch (error) {
        request.log.error(error);
        return { success: false, error: 'Internal Server Error' };
    }
}

module.exports = { getPostsHandler };
