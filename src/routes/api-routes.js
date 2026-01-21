const { search, getPosts, getAuthors } = require('../controllers/search-controller');
const notificationController = require('../controllers/notification-controller');
const postInteractionController = require('../controllers/post-interaction-controller');
const adminModerationController = require('../controllers/admin-moderation-controller');

async function ApiRoutes(fastify, options) {
    fastify.get('/api/search', search);
    fastify.get('/api/search/authors', getAuthors);
    fastify.get('/api/posts', getPosts);
    
    // Post Interaction Routes
    fastify.post('/api/posts/:slug/view', postInteractionController.increaseView);
    fastify.get('/api/posts/:slug/rating', postInteractionController.getPostRating);
    fastify.post('/api/posts/:slug/rating', postInteractionController.ratePost);
    fastify.delete('/api/posts/:slug/rating', postInteractionController.deleteRating);
    fastify.get('/api/posts/:slug/comments', postInteractionController.getComments);
    fastify.post('/api/posts/:slug/comments', postInteractionController.postComment);
    fastify.delete('/api/posts/:slug/comments/:id', postInteractionController.deleteComment);
    fastify.post('/api/comments/report', postInteractionController.reportComment);

    // Notification Routes
    fastify.get('/api/notifications', notificationController.getRecent);
    fastify.put('/api/notifications/:id/read', notificationController.markRead);
    fastify.put('/api/notifications/read-all', notificationController.markAllRead);
    fastify.delete('/api/notifications', notificationController.delete);

    // Admin Moderation Routes
    fastify.get('/admin/comments', adminModerationController.getModerationQueue);
    fastify.post('/admin/comments/:id/approve', adminModerationController.approveComment);
    fastify.post('/admin/comments/:id/reject', adminModerationController.rejectComment);
}

module.exports = ApiRoutes;