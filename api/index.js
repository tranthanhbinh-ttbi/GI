// api/index.js
const app = require('../server'); // Import app từ server.js

// Vercel Serverless Handler
module.exports = async (req, res) => {
    // Chờ Fastify khởi động xong plugin
    await app.ready();
    
    // Chuyển tiếp request từ Vercel sang Fastify
    app.server.emit('request', req, res);
};