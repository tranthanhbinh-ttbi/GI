const buildApp = require('./src/app');

const app = buildApp();

const start = async () => {
  try {
    await app.listen({ port: 3000 });
    console.log('Server đang chạy tại http://localhost:3000');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();