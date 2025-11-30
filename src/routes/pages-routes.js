// const seriesPosts = [
//     {
//         id: 1,
//         slug: 'giao-tiep-hieu-qua-ve-gioi-tinh',
//         title: 'Giao Tiếp Hiệu Quả Về Giới Tính',
//         description: 'Hướng dẫn cách mở cuộc trò chuyện khó khăn với gia đình về các vấn đề giới tính...',
//         author: 'Katen Doe',
//         date: '12 tháng 3, 2025',
//         category: 'Sống khỏe',
//         content: `
//             <h3>Phương pháp mới giúp thanh niên tự tin hơn khi tiếp xúc với người khác, tạo nền tảng...</h3>
//             <p>Ngôn ngữ châu Âu là thành viên của cùng một gia đình. Sự tồn tại riêng biệt của chúng là một huyền thoại. Đối với khoa học, âm nhạc, thể thao, v.v., châu Âu sử dụng cùng một <a href="#">từ vựng</a>. Các ngôn ngữ chỉ khác nhau về ngữ pháp, cách phát âm và các từ thông dụng nhất.</p>
//             <p>Mọi người đều nhận ra tại sao một ngôn ngữ chung mới lại đáng mong đợi: người ta có thể từ chối trả tiền cho những người dịch đắt tiền. Để đạt được điều này, <a href="#">cần phải có</a> ngữ pháp thống nhất, cách phát âm và các từ phổ biến hơn. Nếu một số ngôn ngữ kết hợp lại, ngữ pháp của ngôn ngữ kết quả sẽ đơn giản và đều đặn hơn so với ngôn ngữ hiện tại.</p>
//             <p>Tại sao chọn chúng tôi? Cảm giác tuyệt vời này về sự tồn tại yên bình đã chiếm lấy tâm hồn tôi hoàn toàn, giống như những buổi sáng ngọt ngào của mùa xuân mà tôi tận hưởng bằng cả trái tim mình. Tôi chỉ có một mình, và cảm nhận được sự quyến rũ của sự tồn tại ở nơi này, được tạo ra cho niềm hạnh phúc của những tâm hồn như tôi.</p>
//         `
//     },
//     {
//         id: 2,
//         slug: 'pha-vo-dinh-kien-gioi-tinh',
//         title: 'Phá Vỡ Định Kiến Giới Tính',
//         description: 'Cuộc trò chuyện thẳng thắn về những quan niệm sai lầm phổ biến...',
//         author: 'John Doe',
//         date: '10 tháng 9, 2024',
//         category: 'Podcast',
//         content: `<h3>Nội dung bài viết về phá vỡ định kiến giới tính</h3><p>Đây là nội dung chi tiết...</p>`
//     },
//     {
//         id: 3,
//         slug: 'nhan-biet-va-phong-chong-xam-hai',
//         title: 'Nhận Biết Và Phòng Chống Xâm Hại',
//         description: 'Kiến thức quan trọng giúp bảo vệ bản thân và người xung quanh khỏi các nguy cơ xâm hại.',
//         author: 'Jane Smith',
//         date: '15 tháng 9, 2024',
//         category: 'Bài Viết',
//         content: `<h3>Nội dung bài viết về phòng chống xâm hại</h3><p>Đây là nội dung chi tiết...</p>`
//     }
// ];

// async function Pages (fastify, options) {
//     const routes = [
//         { path: '/', template: 'trang-chu/index', pageName: 'trang-chu' },
//         // { path: '/series', template: 'series/index', pageName: 'series' },
//         { path: '/kham-pha', template: 'kham-pha/index', pageName: 'kham-pha' },
//         { path: '/tin-tuc', template: 'tin-tuc/index', pageName: 'tin-tuc'  },
//         { path: '/su-kien', template: 'su-kien/index', pageName: 'su-kien'  },
//         { path: '/dien-dan', template: 'dien-dan/index', pageName: 'dien-dan' },
//         // { path: '/series/post', template: 'series/post', pageName: 'series-post' },
//     ];

//     fastify.get('/series', {
//         config: { cache: true }
//     }, async (request, reply) => {
//         reply.header('Cache-Control', 'public, max-age=900');
//         return reply.viewAsync('series/index', { Current_Page: 'series', posts: seriesPosts });
//     });

//     fastify.get('/series/post/:slug', async (request, reply) => {
//         const post = seriesPosts.find(p => p.slug === request.params.slug);
//         if (!post) {
//             return reply.code(404).send('Not Found');
//         }
//         return reply.viewAsync('series/post', { Current_Page: 'series-post', post: post, posts: seriesPosts });
//     });

//     routes.forEach(route => {
//         fastify.get(route.path, {
//             config: { 
//                 cache: true 
//             }
//         }, async (request, reply) => {
//             reply.header('Cache-Control', 'public, max-age=900');
//             return reply.viewAsync(route.template, { Current_Page: route.pageName });
//         });
//     });
// }

// module.exports = Pages;

const { getPosts } = require('../utils/contentLoader'); // Import hàm vừa viết

async function Pages (fastify, options) {
    // 1. Route Trang chủ (có thể cần lấy bài mới nhất để hiện)
    fastify.get('/', { config: { cache: true } }, async (request, reply) => {
        return reply.viewAsync('trang-chu/index', { Current_Page: 'trang-chu' });
    });

    // 2. Route Series (Danh sách)
    fastify.get('/series', async (request, reply) => {
        const posts = getPosts('series'); // Đọc từ file
        return reply.viewAsync('series/index', { Current_Page: 'series', posts: posts });
    });

    // 3. Route Series (Chi tiết)
    fastify.get('/series/post/:slug', async (request, reply) => {
        const posts = getPosts('series');
        const post = posts.find(p => p.slug === request.params.slug);
        
        if (!post) {
            return reply.code(404).send('Bài viết không tìm thấy hoặc chưa đến giờ đăng.');
        }
        return reply.viewAsync('series/post', { Current_Page: 'series-post', post: post, posts: posts });
    });

    // 4. Route Tin tức
    fastify.get('/tin-tuc', async (request, reply) => {
        const posts = getPosts('news');
        return reply.viewAsync('tin-tuc/index', { Current_Page: 'tin-tuc', posts: posts });
    });

    // ... Các route tĩnh khác (Sự kiện, Diễn đàn)...
    const staticRoutes = [
        { path: '/kham-pha', template: 'kham-pha/index', pageName: 'kham-pha' },
        { path: '/su-kien', template: 'su-kien/index', pageName: 'su-kien'  },
        { path: '/dien-dan', template: 'dien-dan/index', pageName: 'dien-dan' },
    ];
    staticRoutes.forEach(route => {
        fastify.get(route.path, async (request, reply) => {
            return reply.viewAsync(route.template, { Current_Page: route.pageName });
        });
    });
}

module.exports = Pages;