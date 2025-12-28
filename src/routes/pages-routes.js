const { getPosts } = require('../utils/contentLoader');

async function Pages(fastify, options) {
    const INITIAL_LIMIT = 6;
    fastify.get('/', { config: { cache: true } }, async (request, reply) => {
        return reply.viewAsync('trang-chu/index', { Current_Page: 'trang-chu' });
    });

    fastify.get('/series', async (request, reply) => {
        reply.header('Cache-Control', 'public, max-age=0, s-maxage=60');
        const allPosts = await getPosts('series');
        const posts = allPosts.slice(0, INITIAL_LIMIT);
        return reply.viewAsync('series/index', { Current_Page: 'series', posts: posts });
    });

    fastify.get('/series/:slug', async (request, reply) => {
        const posts = await getPosts('series');
        const post = posts.find(p => p.slug === request.params.slug);

        if (!post) {
            return reply.code(404).send('Bài viết không tìm thấy.');
        }
        return reply.viewAsync('series/post', { Current_Page: 'series-post', post: post, posts: posts });
    });

    fastify.get('/tin-tuc', async (request, reply) => {
        reply.header('Cache-Control', 'public, max-age=0, s-maxage=60');
        const allPosts = await getPosts('news');
        const posts = allPosts.slice(0, INITIAL_LIMIT);
        return reply.viewAsync('tin-tuc/index', { Current_Page: 'tin-tuc', posts: posts });
    });

    fastify.get('/tin-tuc/post/:slug', async (request, reply) => {
        const posts = await getPosts('news');
        const post = posts.find(p => p.slug === request.params.slug);
        if (!post) return reply.code(404).send('Not found');
        return reply.viewAsync('tin-tuc/post', { Current_Page: 'tin-tuc-post', post: post });
    });

    const staticRoutes = [
        { path: '/kham-pha', template: 'kham-pha/index', pageName: 'kham-pha' },
        { path: '/su-kien', template: 'su-kien/index', pageName: 'su-kien' },
        { path: '/dien-dan', template: 'dien-dan/index', pageName: 'dien-dan' },
    ];
    staticRoutes.forEach(route => {
        fastify.get(route.path, async (request, reply) => {
            return reply.viewAsync(route.template, { Current_Page: route.pageName });
        });
    });
}

module.exports = Pages;