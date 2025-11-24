// api/index.js
const app = require('../server.js'); // Import từ thư mục cha

module.exports = async (req, res) => {
    // Đợi Fastify nạp xong plugin
    await app.ready();
    
    // Emit request cho Fastify xử lý
    app.server.emit('request', req, res);
};