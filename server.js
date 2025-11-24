require('dotenv').config();
const fastify = require('fastify')
const minifier = require('html-minifier-terser')
const path = require('node:path')
const crypto = require('node:crypto')

const app = fastify({ trustProxy: true, logger: false })

// Security: cookies, JWT, CSRF, rate limit, and strict headers
app.register(require('@fastify/cookie'), {
  parseOptions: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  },
})
// app.register(require('@fastify/jwt'), {
//   secret: process.env.JWT_SECRET || 'change-me',
//   cookie: {
//     cookieName: 'jwt',
//     signed: false,
//   },
// })
// app.decorate('authenticate', async function (request, reply) {
//   try {
//     await request.jwtVerify({ onlyCookie: true })
//   } catch (err) {
//     return reply.code(401).send({ ok: false })
//   }
// })
app.register(require('@fastify/csrf-protection'))
app.register(require('@fastify/rate-limit'), {
  max: 200,
  timeWindow: '1 minute',
  cache: 10000,
})

const fastifySecureSession = require('@fastify/secure-session')
const fastifyPassport = require('@fastify/passport')

const sessionSecretBase64 = process.env.SESSION_SECRET || ''
let sessionKey = null
try {
  const keyCandidate = Buffer.from(sessionSecretBase64, 'base64')
  if (keyCandidate.length === 32) {
    sessionKey = keyCandidate
  } else {
    sessionKey = crypto.randomBytes(32)
    console.warn('SESSION_SECRET is missing or invalid. Using a random ephemeral 32-byte key.')
  }
} catch (_) {
  sessionKey = crypto.randomBytes(32)
  console.warn('SESSION_SECRET is invalid base64. Using a random ephemeral 32-byte key.')
}

app.register(fastifySecureSession, {
  key: sessionKey,
  cookieName: 'session',
  cookie: {
    path: '/',
    sameSite: 'lax',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  },
})
app.register(fastifyPassport.initialize())
app.register(fastifyPassport.secureSession())

const configurePassport = require('./src/config/oauth-config')
configurePassport(app)

// Basic security headers and CSP
// app.addHook('onRequest', async (request, reply) => {
//   reply.header('X-Frame-Options', 'DENY')
//   reply.header('X-Content-Type-Options', 'nosniff')
//   reply.header('Referrer-Policy', 'strict-origin-when-cross-origin')
//   reply.header('Permissions-Policy', 'geolocation=(), camera=(), microphone=(self)')
//   const csp = [
//     "default-src 'self'",
//     "img-src 'self' data: lh3.googleusercontent.com platform-lookaside.fbsbx.com",
//     "style-src 'self' 'unsafe-inline'",
//     'connect-src \u0027self\u0027',
//     'font-src \u0027self\u0027 data:',
//     'object-src \u0027none\u0027',
//     'base-uri \u0027self\u0027',
//     'form-action \u0027self\u0027',
//   ].join('; ')
//   reply.header('Content-Security-Policy', csp)
// })

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

// WebSocket for real-time follower count
app.register(require('@fastify/websocket'))
app.get('/ws', { websocket: true }, (connection /* SocketStream */, req) => {
  require('./src/controllers/realtime').registerSocket(connection)
})

// DB migration once on start
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

    // Extend timeouts to reduce spurious connection drops
    if (app.server) {
      app.server.keepAliveTimeout = 65_000
      app.server.headersTimeout = 66_000
      app.server.requestTimeout = 60_000
    }

    console.log(`Server listening on http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`)
  } catch (error) {
    console.error("LỖI KHỞI TẠO:", error); // Dòng này sẽ hiện trong log Vercel
    throw error;
  }
};

if (require.main === module) {
  start();
}

// Xuất app ra để Vercel (thông qua file api/index.js) có thể import và xử lý request
module.exports = app;