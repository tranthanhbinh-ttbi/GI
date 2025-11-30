const { Follower } = require('../models')
const FPassport = require('@fastify/passport')
const { broadcast } = require('../controllers/realtime')
const AsyncAuthHandler = require('../utils/async-auth-handler')
const AuthHandshakeManager = require('../utils/auth-handshake-manager')
const crypto = require('node:crypto')

async function oauthRoutes(fastify) {
  // Initialize handlers
  const authHandler = new AsyncAuthHandler({ sessionTimeout: 5000 })
  const handshakeManager = new AuthHandshakeManager({ tokenTTL: 30000 })

  function ensureLoggedIn(request, reply, done) {
    if (request.isAuthenticated && request.isAuthenticated()) return done()
    reply.code(401).send({ ok: false })
  }

  // --- [PHẦN MỚI] LOGIN GITHUB CHO DECAP CMS (BẮT ĐẦU) ---
  
  // 1. Route: /auth - Chuyển hướng sang GitHub
  fastify.get('/auth', async (request, reply) => {
    const { provider } = request.query;
    
    // Nếu provider là github (từ CMS gọi lên)
    if (provider === 'github') {
        const client_id = process.env.OAUTH_CLIENT_ID;
        const redirect_uri = `https://${request.hostname}/callback`;
        const scope = 'repo,user';
        const state = crypto.randomUUID();

        const authorizationUri = `https://github.com/login/oauth/authorize?client_id=${client_id}&redirect_uri=${redirect_uri}&scope=${scope}&state=${state}`;
        
        return reply.redirect(authorizationUri);
    }
    
    // Nếu không phải github, trả về lỗi
    return reply.code(400).send('Unsupported provider');
  });

  // 2. Route: /callback - Nhận code từ GitHub và đổi lấy Token
  fastify.get('/callback', async (request, reply) => {
    const { code } = request.query;

    if (!code) {
        // Nếu là callback của Google/Facebook passport thì bỏ qua, để các route dưới xử lý
        // Nhưng route này thường dành riêng cho CMS OAuth flow thủ công
        return reply.code(400).send('Missing code');
    }

    try {
        // Gọi API GitHub đổi code lấy token
        const response = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                client_id: process.env.OAUTH_CLIENT_ID,
                client_secret: process.env.OAUTH_CLIENT_SECRET,
                code: code,
                redirect_uri: `https://${request.hostname}/callback`
            })
        });

        const data = await response.json();
        const token = data.access_token;

        // Trả về Script để Decap CMS đóng cửa sổ popup và đăng nhập
        const script = `
        <script>
            (function() {
            function receiveMessage(e) {
                window.opener.postMessage(
                'authorization:github:success:{"token":"${token}","provider":"github"}', 
                e.origin
                );
            }
            window.addEventListener("message", receiveMessage, false);
            window.opener.postMessage("authorizing:github", "*");
            })()
        </script>
        `;

        reply.type('text/html').send(script);

    } catch (error) {
        console.error('GitHub Auth Error:', error);
        return reply.code(500).send('Authentication failed');
    }
  });

  // --- [PHẦN MỚI] LOGIN GITHUB CHO DECAP CMS (KẾT THÚC) ---

  async function ensureFollowerRecord(user) {
    if (!user || !user.id) return
    try {
      await Follower.findOrCreate({ where: { userId: user.id }, defaults: { userId: user.id } })
    } catch (err) {
      if (err?.name !== 'SequelizeUniqueConstraintError') {
        console.error('Failed to ensure follower record after login:', err)
      }
    }
  }

  async function emitFollowersSnapshot() {
    try {
      const followersCount = await Follower.count()
      broadcast('followers:update', { followersCount })
    } catch (err) {
      console.error('Failed to broadcast followers count after login:', err)
    }
  }

  fastify.get('/auth/google', { 
    preValidation: FPassport.authenticate('google', { scope: ['profile', 'email'] }) 
  }, async (request, reply) => {})

  fastify.get('/auth/google/callback', { 
    preValidation: FPassport.authenticate('google', { failureRedirect: '/' }) 
  }, async (request, reply) => {
    try {
      // Use AsyncAuthHandler để xử lý post-auth flow
      const result = await authHandler.handlePostAuth(request, request.user, {
        ensureFollowerRecord,
        emitFollowersSnapshot,
        handshakeManager
      })
      
      // Trả về handshake token để client xác nhận
      return reply.redirect(`/?handshake=${result.handshakeToken}`)
    } catch (error) {
      console.error('[AUTH] Google callback error:', error)
      return reply.redirect('/?auth_error=callback_failed')
    }
  })

  fastify.get('/auth/facebook', { 
    preValidation: FPassport.authenticate('facebook', { scope: ['public_profile', 'email'] }) 
  }, async (request, reply) => {})

  fastify.get('/auth/facebook/callback', { 
    preValidation: FPassport.authenticate('facebook', { failureRedirect: '/' }) 
  }, async (request, reply) => {
    try {
      const result = await authHandler.handlePostAuth(request, request.user, {
        ensureFollowerRecord,
        emitFollowersSnapshot,
        handshakeManager
      })
      
      return reply.redirect(`/?handshake=${result.handshakeToken}`)
    } catch (error) {
      console.error('[AUTH] Facebook callback error:', error)
      return reply.redirect('/?auth_error=callback_failed')
    }
  })

  // NEW: Endpoint để confirm handshake
  fastify.post('/api/auth/confirm-handshake', { 
    preHandler: [FPassport.authenticate('session')] 
  }, async (request) => {
    const { handshakeToken } = request.body
    
    try {
      const result = await authHandler.confirmHandshake(
        request,
        handshakeToken,
        handshakeManager
      )
      return result
    } catch (error) {
      return reply.code(401).send({ ok: false, error: error.message })
    }
  })

  fastify.get('/api/me', { preHandler: [FPassport.authenticate('session'), ensureLoggedIn], credentials: 'include' },
    async (request) => {
      const { id, name, email, avatarUrl } = request.user
      const isFollowing = !!(await Follower.findOne({ where: { userId: id } }))
      const followersCount = await Follower.count()
      return { id, name, email, avatarUrl, isFollowing, followersCount }
    }
  )

  fastify.post('/api/logout', async (request, reply) => {
    await request.logout()
    reply.clearCookie('session', { path: '/' })
    return { ok: true }
  })
}

module.exports = oauthRoutes