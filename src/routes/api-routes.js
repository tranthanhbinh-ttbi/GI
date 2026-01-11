const { search, getPosts } = require('../controllers/search-controller');
const notificationController = require('../controllers/notification-controller');

async function ApiRoutes(fastify, options) {
    fastify.get('/api/search', search);
    fastify.get('/api/posts', getPosts);
    
    // Notification Routes
    fastify.get('/api/notifications/stream', notificationController.stream);
    fastify.get('/api/notifications', notificationController.getRecent);
    fastify.put('/api/notifications/:id/read', notificationController.markRead);
    fastify.put('/api/notifications/read-all', notificationController.markAllRead);
    fastify.delete('/api/notifications', notificationController.delete);
}

module.exports = ApiRoutes;