const adminModerationController = require('../controllers/admin-moderation-controller');

async function adminRoutes(fastify) {
    // Middleware to check if user is authenticated and is admin
    // This is a placeholder. You should implement actual auth logic.
    // For now, we assume if you can access these routes, you are fine or the auth logic is handled upstream or in the handler.
    
    // We can use the existing 'admin-auth-routes' logic or just simple session check
    // For this implementation, I will just serve the views. 
    
    fastify.get('/admin/login', async (request, reply) => {
        return reply.view('admin/login.ejs');
    });

    fastify.get('/admin/dashboard', async (request, reply) => {
        // Here you would fetch data for posts, stats, etc.
        // const posts = await Post.findAll(...);
        return reply.view('admin/dashboard.ejs');
    });

    fastify.get('/admin/comments', async (request, reply) => {
        return reply.view('admin/comments.ejs');
    });
    
    // API Routes for Admin
    fastify.post('/admin/comments/:id/approve', adminModerationController.approveComment);
    fastify.post('/admin/comments/:id/reject', adminModerationController.rejectComment);

    fastify.get('/admin/users', async (request, reply) => {
        return reply.view('admin/users.ejs');
    });

    fastify.get('/admin/history', async (request, reply) => {
        return reply.view('admin/history.ejs');
    });

    fastify.get('/admin/reports', async (request, reply) => {
        return reply.view('admin/reports.ejs');
    });
    
    // Redirect root admin to dashboard or login
    fastify.get('/admin', async (request, reply) => {
       // Temporary bypass login
       return reply.redirect('/admin/dashboard');
    });
}

module.exports = adminRoutes;