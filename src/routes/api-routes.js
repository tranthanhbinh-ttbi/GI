const { getPostsHandler } = require('../controllers/post-controller');

async function ApiRoutes(fastify, options) {
    fastify.get('/api/posts', getPostsHandler);
}

module.exports = ApiRoutes;