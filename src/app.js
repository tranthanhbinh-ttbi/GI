const Fastify = require('fastify');
const path = require('path');
const fastifyView = require('@fastify/view');
const ejs = require('ejs');

// Hàm khởi tạo app
const buildApp = () => {
  const app = Fastify({ logger: true });

  // Đăng ký plugin render template (SSR)
  app.register(fastifyView, {
    engine: {
      ejs: ejs,
    },
    // Chỉ định thư mục chứa template
    root: path.join(__dirname, '../templates'),
  });

  // Route SSR: Render file index.ejs và truyền dữ liệu động
  app.get('/', async (request, reply) => {
    const data = {
      title: 'Trang chủ Fastify SSR',
      message: 'Chào mừng đến với Vercel Fluid Compute!',
      time: new Date().toLocaleString('vi-VN')
    };
    // Trả về file HTML đã được render
    return reply.view('index.ejs', data);
  });

  return app;
};

module.exports = buildApp;