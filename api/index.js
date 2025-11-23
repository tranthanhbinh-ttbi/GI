const buildApp = require('../src/app');

// Khởi tạo app bên ngoài handler để tận dụng cache của Serverless (Warm start)
const app = buildApp();

module.exports = async (req, res) => {
  // Chờ Fastify nạp xong các plugin
  await app.ready();

  // Chuyển tiếp request/response của Vercel vào hệ thống của Fastify
  app.server.emit('request', req, res);
};