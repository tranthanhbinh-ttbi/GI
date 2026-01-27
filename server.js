require('dotenv').config();
const fastify = require('fastify')
const minifier = require('html-minifier-terser')
const path = require('node:path')
const crypto = require('node:crypto')
const FPassport = require('@fastify/passport')

const { migrate } = require('./src/models')
const configurePassport = require('./src/config/oauth-config')
const searchService = require('./src/services/search-service')

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

const app = fastify({ trustProxy: true, logger: false, connectionTimeout: 5000, bodyLimit: 1048576 * 2, pluginTimeout: 60000 })

app.register(require('@fastify/compress'), {
  global: true,
  threshold: 2048,
  encodings: ['br', 'gzip']
})
app.register(require('@fastify/static'), {
  root: path.join(__dirname, 'src', 'public'),
  setHeaders: (res, path, stat) => {
    res.setHeader('Cache-Control', 'public, max-age=31536000');
  }
})

app.register(require('@fastify/rate-limit'), {
  max: 500,
  timeWindow: '1 minute',
  cache: 10000,
})



app.register(require('@fastify/cookie'), {
  parseOptions: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  },
})
app.register(require('@fastify/secure-session'), {
  key: sessionKey,
  sodium: require('sodium-javascript'),
  cookieName: 'session',
  cookie: {
    path: '/',
    sameSite: 'lax',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 86400 * 30
  },
})
app.register(require('@fastify/csrf-protection'), {
  sessionPlugin: '@fastify/secure-session'
})

configurePassport(app)
app.register(FPassport.initialize())
app.register(FPassport.secureSession())

app.register(require('@fastify/caching'), {
  privacy: 'public',
  ttl: 900000
});
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
      removeComments: true,
      minifyCSS: true,
      minifyJS: true,
    }
  }
})

app.register(require('./src/routes/pages-routes'))
app.register(require('./src/routes/api-routes'))
app.register(require('./src/routes/admin-auth-routes'))
app.register(require('./src/routes/admin-routes'))
app.register(require('./src/routes/auth-routes'))
app.register(require('./src/routes/mail-routes'))
app.register(require('./src/controllers/subcribe-controller'))

// --- Service Initialization Logic ---
const initServices = async () => {
  try {
    // VERCEL OPTIMIZATION: Skip expensive DB migration on cold start
    // Only run migration if NOT on Vercel OR if explicitly requested via env var
    const shouldRunMigration = !process.env.VERCEL || process.env.RUN_MIGRATION === 'true';

    if (shouldRunMigration) {
      console.log('Starting DB migration...');
      await migrate();
      console.log('DB migration finished.');
    } else {
      console.log('Skipping DB migration on Vercel runtime to improve cold start speed.');
      // Still need to authenticate to ensure DB connection is ready
      const { sequelize } = require('./src/models');
      await sequelize.authenticate();
      console.log('DB connection established.');
    }

    console.log('Starting SearchService...');
    await searchService.init();
    console.log('SearchService initialized.');
  } catch (e) {
    console.warn('DB connect/migrate or Search Service init failed:', e.message);
  }
};

// Attach to app for reuse in Vercel/api-routes
app.initServices = initServices;
app.isServicesInitialized = false;

const start = async () => {
  try {
    // Run initialization BEFORE listening, bypassing Fastify plugin timeout
    await initServices();
    app.isServicesInitialized = true;

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
    console.log(error);
  }
};

if (require.main === module && !process.env.VERCEL) {
  start();
}

module.exports = app;
// Server updated at 2026-01-11
