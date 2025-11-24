require('dotenv').config();
const fastify = require('fastify')
const minifier = require('html-minifier-terser')
const path = require('node:path')
const crypto = require('node:crypto')

const app = fastify({ trustProxy: true, logger: false })

// --- 1. Cấu hình Cookie (Bắt buộc phải đăng ký trước Session) ---
app.register(require('@fastify/cookie'), {
  parseOptions: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  },
})

// Các plugin bảo mật khác
app.register(require('@fastify/csrf-protection'))
app.register(require('@fastify/rate-limit'), {
  max: 200,
  timeWindow: '1 minute',
  cache: 10000,
})

// --- 2. Thay thế Secure Session bằng Fastify Session ---
const fastifySession = require('@fastify/session')
const fastifyPassport = require('@fastify/passport')

// Tạo secret dạng chuỗi (String) thay vì Buffer
const sessionSecret = process.env.SESSION_SECRET || 'a-very-long-secret-key-change-me-in-production-please'

app.register(fastifySession, {
  secret: sessionSecret,
  cookieName: 'session',
  cookie: {
    path: '/',
    sameSite: 'lax',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 // 1 ngày (tùy chỉnh thời gian sống)
  },
  saveUninitialized: false,
  // LƯU Ý QUAN TRỌNG: Mặc định đang dùng MemoryStore.
  // Nếu deploy lên Vercel hoặc chạy nhiều process, bạn CẦN dùng Redis (connect-redis).
  // store: new RedisStore({ ... }) 
})

// --- 3. Khởi tạo Passport với Session mới ---
app.register(fastifyPassport.initialize())
app.register(fastifyPassport.secureSession()) // Đổi từ .secureSession() thành .session()

const configurePassport = require('./src/config/oauth-config')
configurePassport(app)

// --- Thêm Decorator authenticate (Sửa lỗi cho follow-routes.js) ---
// File follow-routes.js của bạn gọi fastify.authenticate nhưng trong server.js cũ đang bị comment.
// Ta sử dụng passport để authenticate session.
app.decorate('authenticate', async function (request, reply) {
    try {
        // Kiểm tra xem session passport có tồn tại user không
        if (!request.isAuthenticated()) {
             return reply.code(401).send({ ok: false, message: 'Unauthorized' })
        }
    } catch (err) {
        return reply.code(401).send({ ok: false })
    }
})


app.register(require('@fastify/static'), {
    root: path.join(__dirname, 'src', 'public'),
    setHeaders: (res, path, stat) => {
        res.setHeader('Cache-Control', 'public, max-age=31536000');
    }
})
app.register(require('@fastify/caching'), {
    privacy: 'public',
    ttl: 900000
});
app.register(require('@fastify/compress'), {
    threshold: 2048,
    encodings: ['br', 'gzip']
})
app.register(require('@fastify/view'), {
    engine: {
        ejs: require('ejs')
    },
    templates: path.join(__dirname, 'src', 'views'),
    production: process.env.NODE_ENV === 'production',
    options: {
        cache: true,
        useHtmlMinifier: minifier,
        htmlMinifierOptions: {
            collapseWhitespace: true,
            removeEmptyAttributes: true,
            removeComments: true,
            removeOptionalTags: true,
            removeRedundantAttributes: true,
            removeScriptTypeAttributes: true,
            removeStyleLinkTypeAttributes: true,
            minifyCSS: true,
            minifyJS: true,
            useShortDoctype: true,
            removeAttributeQuotes: true,
        }
    }
})

// WebSocket
app.register(require('@fastify/websocket'))
app.get('/ws', { websocket: true }, (connection /* SocketStream */, req) => {
  require('./src/controllers/realtime').registerSocket(connection)
})

// DB migration
const { migrate } = require('./src/models')

app.register(require('./src/routes/pages-routes'))
app.register(require('./src/routes/auth-routes'))
app.register(require('./src/routes/mail-routes'))
app.register(require('./src/routes/follow-routes'))
app.register(require('./src/routes/search-routes'))

const start = async () => {
  try {
    try {
      await migrate()
    } catch (e) {
      console.warn('DB connect/migrate failed, continuing to start server:', e.message)
    }
    const port = Number(process.env.PORT) || 3000
    const host = process.env.HOST || '0.0.0.0'
    await app.listen({ port, host })

    if (app.server) {
      app.server.keepAliveTimeout = 65_000
      app.server.headersTimeout = 66_000
      app.server.requestTimeout = 60_000
    }

    console.log(`Server listening on http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`)
  } catch (error) {
    console.error("LỖI KHỞI TẠO:", error); 
    throw error;
  }
};

if (require.main === module) {
  start();
}

module.exports = app;