# ✅ DETAILED REMEDIATION CHECKLIST

## 🚀 HOW TO USE THIS DOCUMENT

- Copy/paste code snippets from Implementation Guide
- Work through Priority 1 → 2 → 3
- Test after each fix
- Check off items as you complete them
- Commit to git after each major fix

---

# 🔴 PRIORITY 1: CRITICAL (Do First - 1.5 Hours)

## ✅ Task P1.1: Fix Database Connection Pool
**Effort:** 5 minutes  
**Impact:** 1 CCU → 50 CCU (50x improvement)  
**File:** `src/config/database-config.js`

### Checklist:
- [ ] Open `src/config/database-config.js`
- [ ] Find the `pool` configuration object (around line 8)
- [ ] Replace:
  ```javascript
  pool: {
      max: 1,
      min: 0,
      idle: 10000,
      acquire: 30000
  }
  ```
- [ ] With:
  ```javascript
  pool: {
      max: 50,
      min: 10,
      idle: 30000,
      acquire: 10000,
      evict: 30000
  }
  ```
- [ ] Save file
- [ ] Restart server with `nodemon server.js`
- [ ] Verify: `curl http://localhost:3000/` should respond normally
- [ ] Test: `ab -n 100 -c 50 http://localhost:3000/` should not timeout

**Verification:**
```bash
# Check PostgreSQL connections
psql -d $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity WHERE datname='yourdb';"
# Should show numbers up to 50 now

# Check logs for "pool" errors
# Should see no "pool exhausted" errors
```

**Notes:**
- If you use Vercel/Serverless, might need smaller pool (max: 20) depending on plan
- Each connection uses ~10MB memory, so 50 × 10MB = 500MB is reasonable
- `evict: 30000` ensures stale connections are recycled

---

## ✅ Task P1.2: Fix N+1 Query in getComments()
**Effort:** 15 minutes  
**Impact:** 1.101 queries → 1 query (1000x improvement)  
**File:** `src/controllers/post-interaction-controller.js`

### Checklist:
- [ ] Open `src/controllers/post-interaction-controller.js`
- [ ] Find `function getComments(request, reply)` (around line 218)
- [ ] Locate the `Comment.findAll()` call
- [ ] Replace the entire `include` array with:
  ```javascript
  include: [
      {
          model: User,
          attributes: ['id', 'name', 'avatarUrl'],
          required: false
      },
      {
          model: Comment,
          as: 'replies',
          where: replyWhere,
          required: false,
          attributes: ['id', 'userId', 'content', 'createdAt', 'toxicityScore'],
          include: [
              {
                  model: User,
                  attributes: ['id', 'name', 'avatarUrl'],
                  required: false
              }
          ],
          order: [['createdAt', 'DESC']]
      }
  ],
  order: [['createdAt', 'DESC'], ['replies', 'createdAt', 'DESC']],
  subQuery: false,  // 🟢 CRITICAL: Prevents N+1
  limit: 100
  ```
- [ ] Save file
- [ ] Restart server
- [ ] Load a post with comments: `curl http://localhost:3000/tin-tuc/sample-post`
- [ ] Check browser DevTools → Network tab for `/api/posts/sample-post/comments`
- [ ] Should see 1 query in server logs (enable logging temporarily to verify)

**Verification:**
```bash
# Enable query logging temporarily
# Edit database-config.js, change logging: false to logging: console.log

# Load comments and count queries
# Should see only 1-2 queries instead of 100+
```

**Notes:**
- The `subQuery: false` is the critical piece
- `attributes` limits what fields are fetched (smaller data transfer)
- `limit: 100` prevents loading thousands of comments

---

## ✅ Task P1.3: Fix EJS Rendering & Minification
**Effort:** 30 minutes  
**Impact:** 500ms → 80ms response time (6x improvement)  
**File:** `src/server.js`

### Checklist:
- [ ] Open `src/server.js`
- [ ] Find the `app.register(require('@fastify/view'), {` block (around line 79)
- [ ] Remove the `htmlMinifierOptions` completely:
  ```javascript
  // DELETE THIS ENTIRE OBJECT:
  htmlMinifierOptions: {
      collapseWhitespace: true,
      removeComments: true,
      minifyCSS: true,
      minifyJS: true,
  }
  ```
- [ ] Your register call should now look like:
  ```javascript
  app.register(require('@fastify/view'), {
      engine: {
          ejs: require('ejs')
      },
      templates: path.join(__dirname, 'src', 'views'),
      production: process.env.NODE_ENV === 'production',
      options: {
          cache: true
          // useHtmlMinifier removed! ✅
      }
  })
  ```
- [ ] Save file
- [ ] Restart server
- [ ] Load homepage: `curl http://localhost:3000/`
- [ ] Response should be faster now
- [ ] CSS/JS still work normally

**Optional: Pre-minify CSS/JS (Recommended)**
```bash
# Install minifiers
npm install --save-dev cleancss terser

# Add to package.json scripts:
"minify": "npm run minify:css && npm run minify:js",
"minify:css": "cleancss src/public/css/*.css -o dist/css/",
"minify:js": "terser src/public/js/*.js -o dist/js/",
"build": "npm run minify",
"start": "npm run build && node server.js"

# Then update views to use /dist/css-min/ and /dist/js-min/
```

**Verification:**
```bash
# Measure response time before/after
time curl http://localhost:3000/ > /dev/null
# Should be noticeably faster (< 100ms vs > 300ms)
```

**Notes:**
- Removing minifier doesn't "break" anything, HTML is still valid
- By moving to build-time minification, you get:
  - Faster runtime
  - Smaller file size still achieved
  - Minification happens once, not per-request

---

## ✅ Task P1.4: Add Missing Database Indexes
**Effort:** 30 minutes  
**Impact:** 1000ms query → 10ms query (100x improvement)  
**Files:** `src/models/index.js` and create migration

### Checklist:

#### Step 1: Update Model Definitions
- [ ] Open `src/models/index.js`
- [ ] Find `const Comment = sequelize.define('Comment', {`
- [ ] Add to its options (the object after field definitions):
  ```javascript
  }, {
      tableName: 'post_comments',
      underscored: true,
      timestamps: true,
      indexes: [
          {
              fields: ['post_slug', 'parent_id'],
              name: 'comments_post_parent_idx'
          },
          {
              fields: ['status'],
              name: 'comments_status_idx'
          },
          {
              fields: ['user_id'],
              name: 'comments_user_idx'
          }
      ]
  })
  ```

- [ ] Find `const Notification = sequelize.define('Notification', {`
- [ ] Add indexes:
  ```javascript
  }, {
      tableName: 'notifications',
      underscored: true,
      timestamps: true,
      indexes: [
          {
              fields: ['created_at'],
              name: 'notifications_created_idx'
          }
      ]
  })
  ```

- [ ] Find `const UserNotification = sequelize.define('UserNotification', {`
- [ ] Add indexes:
  ```javascript
  }, {
      tableName: 'user_notifications',
      underscored: true,
      timestamps: true,
      indexes: [
          {
              fields: ['user_id', 'is_deleted'],
              name: 'user_notif_user_deleted_idx'
          },
          {
              fields: ['user_id', 'is_read'],
              name: 'user_notif_user_read_idx'
          }
      ]
  })
  ```

- [ ] Find `const ViolationLog = sequelize.define('ViolationLog', {`
- [ ] Add indexes:
  ```javascript
  }, {
      tableName: 'violation_logs',
      underscored: true,
      timestamps: true,
      indexes: [
          {
              fields: ['user_id'],
              name: 'violation_user_idx'
          },
          {
              fields: ['post_slug'],
              name: 'violation_post_idx'
          }
      ]
  })
  ```

- [ ] Find `const CommentReport = sequelize.define('CommentReport', {`
- [ ] Add indexes:
  ```javascript
  }, {
      tableName: 'comment_reports',
      underscored: true,
      timestamps: true,
      indexes: [
          {
              fields: ['status'],
              name: 'comment_report_status_idx'
          },
          {
              fields: ['comment_id'],
              name: 'comment_report_comment_idx'
          }
      ]
  })
  ```

- [ ] Save file

#### Step 2: Run Migration
- [ ] Run: `npx sequelize-cli db:migrate`
- [ ] If this fails, manually create indexes:
  ```sql
  CREATE INDEX comments_post_parent_idx ON post_comments(post_slug, parent_id);
  CREATE INDEX comments_status_idx ON post_comments(status);
  CREATE INDEX comments_user_idx ON post_comments(user_id);
  CREATE INDEX notifications_created_idx ON notifications(created_at);
  CREATE INDEX user_notif_user_deleted_idx ON user_notifications(user_id, is_deleted);
  CREATE INDEX user_notif_user_read_idx ON user_notifications(user_id, is_read);
  CREATE INDEX violation_user_idx ON violation_logs(user_id);
  CREATE INDEX violation_post_idx ON violation_logs(post_slug);
  CREATE INDEX comment_report_status_idx ON comment_reports(status);
  CREATE INDEX comment_report_comment_idx ON comment_reports(comment_id);
  ```

#### Step 3: Verify Indexes
- [ ] Run: 
  ```sql
  SELECT * FROM pg_indexes WHERE tablename = 'post_comments';
  ```
- [ ] Should see the new indexes listed

**Verification:**
```bash
# Check index usage
psql -d $DATABASE_URL -c "SELECT * FROM pg_stat_user_indexes WHERE indexname LIKE '%idx';"

# Query time should improve significantly
# Try loading a post with many comments
time curl http://localhost:3000/tin-tuc/sample
```

**Notes:**
- Indexes add ~200MB storage per 1M rows (acceptable)
- Indexes slightly slow down INSERT/UPDATE (negligible for read-heavy app)
- Index creation might lock table briefly (do during maintenance window)

---

## ✅ SUMMARY OF PRIORITY 1

**Estimated total time:** 1.5 hours  
**Expected improvement:**
- Concurrency: 100 → 800 CCU
- Response time: 500ms → 100ms
- Database queries: 1000+ per request → 10-50

**Testing after all P1 fixes:**
```bash
# Do a basic load test
ab -n 1000 -c 100 http://localhost:3000/

# Results should show:
# - Requests per second: ~100+ (vs ~10 before)
# - Failed requests: 0 (vs 100+ before)
# - Avg response time: < 200ms (vs > 1000ms before)
```

**Commit to git:**
```bash
git add .
git commit -m "🔥 Critical Performance Fixes: Pool size, N+1 queries, EJS minify, DB indexes"
git push origin main
```

---

# 🟠 PRIORITY 2: HIGH (1-2 Days)

## ✅ Task P2.1: Cache SearchService HTML Rendering
**Effort:** 20 minutes  
**Impact:** 1000 render/sec → 100 render/sec (90% cached)  
**File:** `src/controllers/search-controller.js`

### Implementation:
```javascript
// Add at top of file
const crypto = require('crypto');

class SimpleCache {
    constructor(maxSize = 500) {
        this.cache = new Map();
        this.maxSize = maxSize;
    }

    get(key) {
        if (this.cache.has(key)) {
            const value = this.cache.get(key);
            this.cache.delete(key);
            this.cache.set(key, value);
            return value;
        }
        return null;
    }

    set(key, value) {
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, value);
    }

    clear() {
        this.cache.clear();
    }

    size() {
        return this.cache.size;
    }
}

const htmlCache = new SimpleCache(500);

// In getPosts function, change this:
async function getPosts(request, reply) {
    try {
        const { q, limit, page, type, category, exclude, ...otherFilters } = request.query;

        // ... existing filter logic ...

        const cacheKey = JSON.stringify({
            q: q || '',
            page: Math.max(parseInt(page) || 1, 1),
            limit: Math.min(parseInt(limit) || 6, 20),
            type: type || 'all',
            category: category || 'all'
        });

        // 🟢 Check cache first
        const cachedResponse = htmlCache.get(cacheKey);
        if (cachedResponse) {
            return reply.send(cachedResponse);
        }

        // ... rest of existing logic ...
        
        // 🟢 After rendering, cache the response
        const response = {
            success: true,
            data: results.data,
            html: html,
            page: safePage,
            total: results.total,
            pageSize: safeLimit
        };

        htmlCache.set(cacheKey, response);
        return reply.send(response);
    }
}
```

### Checklist:
- [ ] Copy cache class to top of search-controller.js
- [ ] Add `cacheKey` generation before search logic
- [ ] Add cache lookup before search
- [ ] Add cache store after rendering
- [ ] Test: Load same search twice, should be instant second time
- [ ] Verify cache size doesn't exceed 500 entries

---

## ✅ Task P2.2: Fix Worker Thread Reliability
**Effort:** 45 minutes  
**Impact:** Better error handling, no silent failures  
**File:** `src/services/moderation-service.js`

### Key changes:
- Add pending message queue
- Implement exponential backoff
- Add timeout for worker initialization
- Better error logging

[See IMPLEMENTATION_GUIDE.md for full code]

### Checklist:
- [ ] Refactor initWorker() with proper error handling
- [ ] Add workerReady flag
- [ ] Add pendingMessages queue
- [ ] Test: Kill worker process, should restart
- [ ] Verify messages aren't lost during restart

---

## ✅ Task P2.3: Add Pagination to Admin Moderation Queue
**Effort:** 10 minutes  
**File:** `src/controllers/admin-moderation-controller.js`

### Change:
```javascript
// Replace getModerationQueue with pagination
async function getModerationQueue(request, reply) {
    const page = parseInt(request.query.page) || 1;
    const limit = 50;
    const offset = (page - 1) * limit;

    try {
        const { count, rows } = await Comment.findAndCountAll({
            where: { status: 'flagged' },
            include: [{ model: User, attributes: ['id', 'name', 'email', 'violationCount'] }],
            order: [['createdAt', 'DESC']],
            limit: limit,
            offset: offset
        });

        return reply.view('admin/moderation.ejs', {
            comments: rows,
            page: page,
            total: count,
            pages: Math.ceil(count / limit),
            user: request.user
        });
    }
}
```

### Checklist:
- [ ] Add page parameter handling
- [ ] Use findAndCountAll() instead of findAll()
- [ ] Add limit and offset
- [ ] Test: Load admin page with 100+ flagged comments
- [ ] Verify pagination works

---

## ✅ Task P2.4: Optimize Query Variations Complexity
**Effort:** 20 minutes  
**File:** `src/services/search-service.js`

[See IMPLEMENTATION_GUIDE.md for optimized function]

### Checklist:
- [ ] Refactor generateQueryVariations()
- [ ] Add MAX_VARIATIONS limit (5)
- [ ] Cache regex patterns
- [ ] Test: Search with numbers should still work
- [ ] Verify no performance degradation

---

## ✅ Task P2.5: Add Fastify Schema Validation
**Effort:** 60 minutes  
**File:** `src/routes/api-routes.js`

### Key schemas to add:
```javascript
// Response schemas for common endpoints
const commentResponseSchema = {
    type: 'object',
    properties: {
        id: { type: 'integer' },
        userId: { type: 'integer' },
        content: { type: 'string', maxLength: 10000 },
        createdAt: { type: 'string' },
        User: { $ref: '#/definitions/user' }
    },
    additionalProperties: false
};

const userSchema = {
    type: 'object',
    properties: {
        id: { type: 'integer' },
        name: { type: 'string' },
        avatarUrl: { type: 'string' }
    },
    additionalProperties: false
};

// Apply to routes
fastify.get('/api/posts/:slug/comments', {
    schema: {
        response: {
            200: {
                type: 'array',
                items: commentResponseSchema
            }
        }
    }
}, postInteractionController.getComments);
```

### Checklist:
- [ ] Define schemas for main endpoints
- [ ] Add schema to routes
- [ ] Add `additionalProperties: false` to prevent pollution
- [ ] Test: Verify responses match schema
- [ ] Monitor: Check schema validation errors in logs

---

## ✅ SUMMARY OF PRIORITY 2

**Estimated total time:** 2-3 days  
**Expected improvement:**
- Rendering: 1000 render/sec → 100 cached
- Admin page: 100.000 comments → paginated 50 at a time
- Worker reliability: Better error handling
- API security: Schema validation

**Capacity after P2:** 800 → 1.200 CCU

---

# 💜 PRIORITY 3: OPTIONAL OPTIMIZATION (1 Week)

This phase is optional but recommended for reaching 2.000 CCU on single instance.

## P3.1: Add Redis Caching
- Cache post list (1 hour)
- Cache comments (1 hour)
- Cache notifications (30 min)
- **Total:** 2.5 hours, +200 CCU capacity

## P3.2: Database Read Replicas
- Setup read replica (2 hours)
- Route reads to replica (1 hour)
- **Total:** 3 hours, +300 CCU capacity

## P3.3: Pre-compile EJS Templates
- Build script for templates (1 hour)
- Serve compiled (30 min)
- **Total:** 1.5 hours, +150 CCU capacity

## P3.4: Worker Thread Pool
- Implement thread pool (2 hours)
- Add task queue (1 hour)
- **Total:** 3 hours, +100 CCU capacity

---

# ✅ FINAL CHECKLIST

## Before Deploy to Production

- [ ] All Priority 1 fixes applied
- [ ] All Priority 2 fixes applied (recommended)
- [ ] Load testing done (ab, wrk, etc.)
- [ ] Memory leak testing (0x, clinic.js)
- [ ] Database backup configured
- [ ] Monitoring setup (Prometheus, DataDog, etc.)
- [ ] Error tracking setup (Sentry)
- [ ] Alerting configured
- [ ] Rollback plan documented
- [ ] Team trained on deployment process

## Performance Targets

- [ ] Response time: < 100ms (P50), < 300ms (P99)
- [ ] Concurrent users: >= 1.200 CCU
- [ ] Error rate: < 0.1%
- [ ] CPU: < 70% sustained
- [ ] Memory: < 80% sustained
- [ ] Database CPU: < 50%
- [ ] Database connections: < 40/50

---

**Total time to production-ready:** 2-3 days  
**Total time to 1.200 CCU:** 2-3 days  
**Total time to 2.000 CCU (with scaling):** 1 week  

Good luck! 🚀
