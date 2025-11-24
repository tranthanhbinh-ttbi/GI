// api/index.js

// [Vercel build hint]
// Vercel's build process might not detect dynamic requires from libraries like Sequelize.
// We explicitly require the 'pg' and 'pg-hstore' drivers here to ensure they are included in the serverless function bundle.
require('pg');
require('pg-hstore');

const app = require('../server.js'); // Import từ thư mục cha

module.exports = async (req, res) => {
    // Đợi Fastify nạp xong plugin
    await app.ready();
    
    // Emit request cho Fastify xử lý
    app.server.emit('request', req, res);
};