const searchService = require('../services/search-service');
const { Notification, UserNotification } = require('../models');


async function Pages(fastify, options) {
    
    // --- 1. Trang Chủ ---
    fastify.get('/', { config: { cache: true } }, async (request, reply) => {
        // Lấy 10 bài mới nhất bất kể danh mục để hiển thị (nếu cần)
        const result = searchService.search('', 1, 10);
        return reply.viewAsync('trang-chu/index', { 
            Current_Page: 'trang-chu',
            posts: result.data 
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
            let posts = [];
            // Nếu có type, lấy dữ liệu từ SearchService
            if (route.type) {
                const result = searchService.search('', 1, 12, { type: route.type });
                posts = result.data;
            } else if (route.pageName === 'dien-dan') {
                // Trang diễn đàn có thể cần logic riêng hoặc query 'all'
                // Tạm thời lấy bài mới nhất
                const result = searchService.search('', 1, 12);
                posts = result.data;
            } else if (route.pageName === 'thong-bao') {
                // Fetch notifications from DB
                try {
                    const userId = request.user ? request.user.id : null;
                    const limit = 50;

                    const allNotifications = await Notification.findAll({
                        order: [['createdAt', 'DESC']],
                        limit: limit,
                        include: userId ? [{
                            model: UserNotification,
                            required: false,
                            where: { userId: userId }
                        }] : []
                    });

                    let notifications = [];
                    if (userId) {
                        notifications = allNotifications.filter(n => {
                            const userState = n.UserNotifications && n.UserNotifications[0];
                            return !userState || !userState.isDeleted;
                        }).map(n => {
                            const userState = n.UserNotifications && n.UserNotifications[0];
                            const plain = n.get({ plain: true });
                            plain.isRead = userState ? userState.isRead : false;
                            delete plain.UserNotifications;
                            return plain;
                        });
                    } else {
                        notifications = allNotifications.map(n => n.get({ plain: true }));
                    }
                    
                    return reply.viewAsync(route.template, { 
                        Current_Page: route.pageName,
                        notifications: notifications,
                        popularPosts: [] // Sidebar might not be needed or fetch if desired
                    });
                } catch (err) {
                    console.error('Error fetching notifications:', err);
                    posts = []; // Fallback
                }
            }

            // Lấy 5 bài viết phổ biến cho Sidebar
            // Context-aware: Chỉ lấy bài phổ biến thuộc cùng Type với trang hiện tại
            // Nếu type null (ví dụ trang chủ/diễn đàn), có thể để trống để lấy tất cả hoặc logic khác
            const popularFilter = { sort: 'popular' };
            if (route.type) {
                popularFilter.type = route.type;
            }

            const popularData = searchService.search('', 1, 5, popularFilter);
            const popularPosts = popularData.data;

            return reply.viewAsync(route.template, { 
                Current_Page: route.pageName,
                posts: posts,
                popularPosts: popularPosts
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

        return rep.viewAsync(template, {
            Current_Page: pageName,
            post: post,
            posts: related // Sidebar trong post.ejs dùng biến 'posts' để loop bài liên quan
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