async function Pages (fastify, options) {
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
            return reply.viewAsync(route.template, { Current_Page: route.pageName });
        });
    });
}

module.exports = Pages;