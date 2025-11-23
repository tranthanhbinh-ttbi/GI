async function Pages (fastify, options) {
    // Mock dữ liệu bài viết
    const mockPosts = [
      {
        id: 1,
        title: 'Giao Tiếp Hiệu Quả Về Giới Tính',
        description: 'Hướng dẫn cách mở cuộc trò chuyện khó khăn với gia đình về các vấn đề giới tính...',
        category: 'Video',
        categoryColor: 'bg-red-600',
        image: '/photos/placeholder-m6a0q.png',
        date: '12/9/2024',
        views: 890,
        rating: 4.5,
        ratingCount: 45,
      },
      {
        id: 2,
        title: 'Phá Vỡ Định Kiến Giới Tính',
        description: 'Cuộc trò chuyện thẳng thắn về những quan niệm sai lầm phổ biến...',
        category: 'Podcast',
        categoryColor: 'bg-purple-600',
        image: '/photos/placeholder-m6a0q.png',
        date: '10/9/2024',
        views: 654,
        rating: 3.5,
        ratingCount: 32,
      },
      {
        id: 3,
        title: 'Nhận Biết Và Phòng Chống Xâm Hại',
        description: 'Kiến thức quan trọng giúp bảo vệ bản thân và người xung quanh khỏi các nguy cơ xâm hại...',
        category: 'Bài Viết',
        categoryColor: 'bg-blue-600',
        image: '/photos/placeholder-m6a0q.png',
        date: '15/9/2024',
        views: 2100,
        rating: 5,
        ratingCount: 98,
      },
      {
        id: 4,
        title: 'Phá Vỡ Định Kiến Giới Tính',
        description: 'Cuộc trò chuyện thẳng thắn về những quan niệm sai lầm phổ biến...',
        category: 'Podcast',
        categoryColor: 'bg-purple-600',
        image: '/photos/placeholder-m6a0q.png',
        date: '10/9/2024',
        views: 654,
        rating: 3.5,
        ratingCount: 32,
      },
      {
        id: 5,
        title: 'Nhận Biết Và Phòng Chống Xâm Hại',
        description: 'Kiến thức quan trọng giúp bảo vệ bản thân và người xung quanh khỏi các nguy cơ xâm hại...',
        category: 'Bài Viết',
        categoryColor: 'bg-blue-600',
        image: '/photos/placeholder-m6a0q.png',
        date: '15/9/2024',
        views: 2100,
        rating: 5,
        ratingCount: 98,
      },
      {
        id: 6,
        title: 'Nhận Biết Và Phòng Chống Xâm Hại',
        description: 'Kiến thức quan trọng giúp bảo vệ bản thân và người xung quanh khỏi các nguy cơ xâm hại...',
        category: 'Bài Viết',
        categoryColor: 'bg-blue-600',
        image: '/photos/placeholder-m6a0q.png',
        date: '15/9/2024',
        views: 2100,
        rating: 5,
        ratingCount: 98,
      },
    ];

    const routes = [
        { path: '/', template: 'trang-chu/index', pageName: 'trang-chu' },
        { path: '/series', template: 'series/index', pageName: 'series' },
        { path: '/kham-pha', template: 'kham-pha/index', pageName: 'kham-pha' },
        { path: '/tin-tuc', template: 'tin-tuc/index', pageName: 'tin-tuc'  },
        { path: '/su-kien', template: 'su-kien/index', pageName: 'su-kien'  },
        { path: '/dien-dan', template: 'dien-dan/index', pageName: 'dien-dan' },
    ];
    routes.forEach(route => {
        fastify.get(route.path, {
            config: { 
                cache: true 
            }
        }, async (request, reply) => {
            reply.header('Cache-Control', 'public, max-age=900');
            
            // Truyền dữ liệu bài viết trang 1 cho trang series
            const viewData = { 
                Current_Page: route.pageName,
                posts: route.pageName === 'series' ? mockPosts : undefined
            };
            
            return reply.viewAsync(route.template, viewData);
        });
    });
}

module.exports = Pages;