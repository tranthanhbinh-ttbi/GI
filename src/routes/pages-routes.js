const searchService = require('../services/search-service');
const { Notification, UserNotification, PostMeta } = require('../models');


async function Pages(fastify, options) {

    // --- 1. Trang Chủ ---
    fastify.get('/', { config: { cache: true } }, async (request, reply) => {
        // Lấy 10 bài mới nhất bất kể danh mục để hiển thị (nếu cần)
        const result = searchService.search('', 1, 10);
        return reply.viewAsync('trang-chu/index', {
            Current_Page: 'trang-chu',
            posts: result.data,
            user: request.user
        });
    });

    // --- 2. Các Trang Danh Sách (Listing Pages) ---
    // Cấu hình mapping giữa URL và Loại bài viết (Type) trong SearchService
    const listRoutes = [
        { path: '/series', template: 'series/index', pageName: 'series', type: 'series' },
        { path: '/kham-pha', template: 'kham-pha/index', pageName: 'kham-pha', type: 'explore' },
        { path: '/tin-tuc', template: 'tin-tuc/index', pageName: 'tin-tuc', type: 'news' },
        // 'su-kien' và 'dien-dan' có thể chưa có content type tương ứng, tạm thời để trống type
        { path: '/su-kien', template: 'su-kien/index', pageName: 'su-kien', type: 'event' },
        { path: '/dien-dan', template: 'dien-dan/index', pageName: 'dien-dan', type: null },
        { path: '/thong-bao', template: 'thong-bao/index', pageName: 'thong-bao', type: null },
    ];

    for (const route of listRoutes) {
        fastify.get(route.path, async (request, reply) => {
            let popularPosts = [];
            let posts = [];

            // Special Logic for 'tin-tuc': Priority Popular Posts (Top Cards) > Recent Posts (Main List)
            if (route.pageName === 'tin-tuc') {
                // 1. Fetch Popular Posts First (Ensure Top Cards are filled)
                const popularData = searchService.search('', 1, 8, { type: 'news', sort: 'popular' });
                popularPosts = popularData.data;

                // 2. Fetch Recent Posts (Fetch more to account for filtering)
                const mainPostsData = searchService.search('', 1, 20, { type: 'news' }); // Default sort is date
                let mainPosts = mainPostsData.data;

                // 3. (Optional) Filter duplicates:
                // Removing strict deduplication here because with small dataset (e.g. < 10 posts),
                // hiding Top Cards items from Main List results in an empty list.
                // Re-enable this if you want strict magazine layout and have 20+ articles.
                // mainPosts = mainPosts.filter(p => !popularSlugs.has(p.slug));

                // 4. Assign to 'posts' (Limited to 12 for pagination/view)
                posts = mainPosts.slice(0, 12);
            } else {
                // Standard Logic for other pages
                if (route.type) {
                    const result = searchService.search('', 1, 12, { type: route.type });
                    posts = result.data;
                } else if (route.pageName === 'dien-dan') {
                    const result = searchService.search('', 1, 12);
                    posts = result.data;
                }

                // Fetch popular posts for sidebar (standard logic)
                const popularFilter = { sort: 'popular' };
                if (route.type) popularFilter.type = route.type;

                const popularData = searchService.search('', 1, 5, popularFilter);
                popularPosts = popularData.data;
            }

            return reply.viewAsync(route.template, {
                Current_Page: route.pageName,
                posts: posts,
                popularPosts: popularPosts,
                user: request.user
            });
        });
    }

    // --- 3. Các Trang Chi Tiết (Detail Pages - Dynamic Routes) ---

    // Helper function để xử lý render chi tiết
    const renderPostDetail = async (slug, template, pageName, req, rep) => {
        const post = searchService.getPostBySlug(slug);

        if (!post) {
            // Nếu không tìm thấy hoặc chưa đến giờ đăng -> 404
            return rep.callNotFound();
        }

        // Lấy bài viết liên quan cho Sidebar
        const related = searchService.getRelatedPosts(slug, {
            category: post.category,
            topic: post.topic,
            author: post.author
        }, 5);

        // Lấy bài viết phổ biến cho Sidebar (Context-aware)
        // Logic giống với trang listing: sort by popular, same type
        const popularFilter = { sort: 'popular', type: post.type };
        const popularData = searchService.search('', 1, 5, popularFilter);
        const popularPosts = popularData.data;

        return rep.viewAsync(template, {
            Current_Page: pageName,
            post: post,
            posts: related, // Sidebar trong post.ejs dùng biến 'posts' để loop bài liên quan (giữ lại để tương thích cũ)
            popularPosts: popularPosts, // Truyền thêm biến này cho Widget Phổ Biến chuẩn
            user: req.user
        });
    };

    // Route cho Series
    fastify.get('/series/:slug', async (request, reply) => {
        return renderPostDetail(request.params.slug, 'series/post', 'series', request, reply);
    });

    // Route cho Tin Tức
    fastify.get('/tin-tuc/:slug', async (request, reply) => {
        // Lưu ý: View tin tức có thể là 'tin-tuc/post' hoặc dùng chung layout
        return renderPostDetail(request.params.slug, 'tin-tuc/post', 'tin-tuc', request, reply);
    });

    // Route cho Khám Phá
    fastify.get('/kham-pha/:slug', async (request, reply) => {
        return renderPostDetail(request.params.slug, 'kham-pha/post', 'kham-pha', request, reply);
    });

    // Route cho Sự Kiện (nếu có bài chi tiết)
    fastify.get('/su-kien/:slug', async (request, reply) => {
        return renderPostDetail(request.params.slug, 'su-kien/post', 'su-kien', request, reply);
    });
}

module.exports = Pages;