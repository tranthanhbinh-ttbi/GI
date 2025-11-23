/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📊 ARCHITECTURE DIAGRAM - SERIES LOAD MORE FEATURE
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────────────────
// 🏗️ SYSTEM ARCHITECTURE
// ─────────────────────────────────────────────────────────────────────────

/*

                        ┌─────────────────────────────────────┐
                        │     BROWSER / CLIENT SIDE           │
                        └─────────────────────────────────────┘
                                        │
                                        ▼
                        ┌─────────────────────────────────────┐
                        │   Load http://localhost:3000/series │
                        │  (GET /series via pages-routes.js)  │
                        └─────────────────────────────────────┘
                                        │
                                        ▼
                        ┌─────────────────────────────────────┐
        ┌───────────────│  Fastify Server (server.js)         │──────────┐
        │               │  - Render HTML                      │          │
        │               │  - Setup routes                     │          │
        │               └─────────────────────────────────────┘          │
        │                                                                │
        │               Routes Registered:                              │
        │               1️⃣ GET /series (pages-routes.js)              │
        │               2️⃣ GET /api/series/posts (series-api-routes)  │
        │                                                                │
        ▼                                                                ▼
┌───────────────────┐                                      ┌────────────────────┐
│ pages-routes.js   │                                      │ series-api-routes  │
├───────────────────┤                                      ├────────────────────┤
│ GET /series       │                                      │ GET /api/series    │
│ ↓                 │                                      │ /posts?page=X      │
│ Render view:      │                                      │                    │
│ - series/index.ej │                                      │ Response JSON:     │
│ Pass data:        │                                      │ - html (6 cards)   │
│ - posts (6 bài)  │                                      │ - page             │
│ - Current_Page    │                                      │ - hasMore          │
└───────────────────┘                                      │ - totalCount       │
        │                                                  │ - totalPages       │
        ▼                                                  └────────────────────┘
┌──────────────────────────────────────────────────────────┐
│         EJS Template Rendering                            │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  series/index.ejs                                         │
│  ├─ Header + Navigation                                 │
│  ├─ Carousel                                             │
│  ├─ Filter Bar                                           │
│  │                                                        │
│  ├─ Main Content                                         │
│  │  └─ Card Grid                                         │
│  │     ├─ Loop: for each post in posts                  │
│  │     │  └─ Include partials/series-card.ejs           │
│  │     ├─ Card 1 (post 1)                               │
│  │     ├─ Card 2 (post 2)                               │
│  │     ├─ Card 3 (post 3)                               │
│  │     ├─ Card 4 (post 4)                               │
│  │     ├─ Card 5 (post 5)                               │
│  │     └─ Card 6 (post 6)                               │
│  │                                                        │
│  ├─ Load More Button                                     │
│  │  └─ <button class="load-more-button">                │
│  │     Xem Thêm                                          │
│  │     </button>                                         │
│  │                                                        │
│  ├─ Scripts                                              │
│  │  └─ <script src="/js/series.js" defer></script>      │
│  │                                                        │
│  └─ Footer                                               │
│                                                           │
└──────────────────────────────────────────────────────────┘
        │
        │ Partial: series-card.ejs
        │ (Template for 1 card)
        │
        ▼
┌──────────────────────────────────────────────────────────┐
│ HTML Render (Status: Initial - 6 cards shown)           │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ <div class="card-grid">                                │
│   <div class="series-card" data-post-id="1">...</div>  │
│   <div class="series-card" data-post-id="2">...</div>  │
│   <div class="series-card" data-post-id="3">...</div>  │
│   <div class="series-card" data-post-id="4">...</div>  │
│   <div class="series-card" data-post-id="5">...</div>  │
│   <div class="series-card" data-post-id="6">...</div>  │
│ </div>                                                 │
│                                                         │
│ <div class="load-more-container">                      │
│   <button class="load-more-button">                    │
│     Xem Thêm                                           │
│   </button>                                            │
│ </div>                                                 │
│                                                         │
└──────────────────────────────────────────────────────────┘
        │
        │ JavaScript Loaded
        │ (series.js)
        │
        ▼
┌──────────────────────────────────────────────────────────┐
│     JavaScript: SeriesLoadMore Class Initialized        │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ class SeriesLoadMore {                                 │
│   - cardGrid (selector)                                │
│   - loadMoreButton (selector)                          │
│   - currentPage = 1                                    │
│   - isLoading = false                                  │
│   - hasMore = true                                     │
│   - apiEndpoint = '/api/series/posts'                 │
│                                                         │
│   init()                                               │
│   ├─ addEventListener('click', loadMore)             │
│                                                         │
│   loadMore()                                           │
│   ├─ if (isLoading || !hasMore) return               │
│   ├─ Set button.disabled = true                      │
│   ├─ Set button.textContent = 'Đang tải...'          │
│   ├─ Fetch /api/series/posts?page=2                  │
│   ├─ Receive JSON response                           │
│   ├─ insertAdjacentHTML(..., html)                   │
│   ├─ Update currentPage, hasMore                     │
│   ├─ If !hasMore: hide button                        │
│   └─ Set button.disabled = false                     │
│                                                         │
│ }                                                      │
│                                                         │
│ DOM Ready:                                            │
│ new SeriesLoadMore({options})                        │
│                                                         │
└──────────────────────────────────────────────────────────┘


                        👆 USER CLICKS "XEM THÊM"
                              │
                              ▼

                ┌────────────────────────────────────────┐
                │ Event: click on .load-more-button      │
                └────────────────────────────────────────┘
                              │
                              ▼
                ┌────────────────────────────────────────┐
                │ JavaScript: loadMore() called          │
                │ - Disable button (prevent double-click)│
                │ - Show "Đang tải..."                   │
                │ - Fetch /api/series/posts?page=2       │
                └────────────────────────────────────────┘
                              │
                              ▼
            ┌─────────────────────────────────────────────┐
            │       Network Request (AJAX)                │
            │   GET /api/series/posts?page=2              │
            │                                             │
            │   Client → Server                           │
            │   (via Fetch API)                           │
            └─────────────────────────────────────────────┘
                              │
                              ▼
            ┌─────────────────────────────────────────────┐
            │    Server: series-api-routes.js             │
            │    (Fastify Route Handler)                  │
            │                                             │
            │    1. Parse page parameter: 2               │
            │    2. Calculate offset: (2-1)*6 = 6         │
            │    3. Get posts 6-11 from mockPosts array   │
            │    4. Check if hasMore: 12 < totalCount     │
            │    5. Render each post as HTML card         │
            │    6. Return JSON with:                     │
            │       - html: 6 card HTML strings           │
            │       - page: 2                             │
            │       - hasMore: false (no more data)       │
            │       - totalPages: 2                       │
            └─────────────────────────────────────────────┘
                              │
                              ▼
            ┌─────────────────────────────────────────────┐
            │   Network Response (JSON)                   │
            │   HTTP 200 OK                               │
            │                                             │
            │   {                                         │
            │     success: true,                          │
            │     data: {                                 │
            │       html: "6 card divs...",               │
            │       page: 2,                              │
            │       limit: 6,                             │
            │       hasMore: false,                       │
            │       totalCount: 12,                       │
            │       totalPages: 2                         │
            │     }                                       │
            │   }                                         │
            │                                             │
            │   Server → Client                           │
            └─────────────────────────────────────────────┘
                              │
                              ▼
            ┌─────────────────────────────────────────────┐
            │   JavaScript: Handle Response               │
            │                                             │
            │   1. Parse JSON                             │
            │   2. Extract data.html (6 new cards)        │
            │   3. insertAdjacentHTML(                    │
            │        'beforeend',                         │
            │        data.html                            │
            │      ) → Add to DOM                         │
            │   4. Update state:                          │
            │      - currentPage = 2                      │
            │      - hasMore = false                      │
            │   5. Since hasMore=false:                   │
            │      Hide button (display: none)            │
            │   6. Enable button again                    │
            │      (for next load, if any)                │
            │   7. Show "Xem Thêm" text again             │
            └─────────────────────────────────────────────┘
                              │
                              ▼
        ┌──────────────────────────────────────────────────┐
        │    HTML Render Update (AJAX - No Page Reload)   │
        ├──────────────────────────────────────────────────┤
        │                                                  │
        │ <div class="card-grid">                         │
        │   <!-- Original 6 cards from EJS -->            │
        │   <div class="series-card" id="1">...</div>    │
        │   <div class="series-card" id="2">...</div>    │
        │   <div class="series-card" id="3">...</div>    │
        │   <div class="series-card" id="4">...</div>    │
        │   <div class="series-card" id="5">...</div>    │
        │   <div class="series-card" id="6">...</div>    │
        │                                                  │
        │   <!-- NEW 6 cards from API (page 2) -->       │
        │   <div class="series-card" id="7">...</div>    │
        │   <div class="series-card" id="8">...</div>    │
        │   <div class="series-card" id="9">...</div>    │
        │   <div class="series-card" id="10">...</div>   │
        │   <div class="series-card" id="11">...</div>   │
        │   <div class="series-card" id="12">...</div>   │
        │ </div>                                          │
        │                                                  │
        │ <div class="load-more-container"                │
        │      style="display: none;">                    │
        │   <!-- Hidden because hasMore=false -->         │
        │ </div>                                          │
        │                                                  │
        │ Status: ✅ Total 12 cards loaded                │
        │         ✅ Button hidden (no more data)         │
        │                                                  │
        └──────────────────────────────────────────────────┘


═══════════════════════════════════════════════════════════════════════════
*/

// ─────────────────────────────────────────────────────────────────────────
// 📂 FILE STRUCTURE
// ─────────────────────────────────────────────────────────────────────────

/*
www.webg.com/
│
├── 📄 server.js
│   └─ Register routes (including series-api-routes)
│
├── 📁 src/
│   │
│   ├── 📁 routes/
│   │   ├── pages-routes.js          [UPDATED]
│   │   │   └─ GET /series
│   │   │      Pass 6 posts from mockPosts array
│   │   │      Render via series/index.ejs
│   │   │
│   │   └── series-api-routes.js     [NEW]
│   │       └─ GET /api/series/posts?page=X
│   │          Return 6 posts as HTML + metadata
│   │
│   ├── 📁 views/
│   │   ├── series/
│   │   │   └── index.ejs            [UPDATED]
│   │   │       ├─ Loop through posts
│   │   │       ├─ Include partial for each post
│   │   │       ├─ Xem Thêm button
│   │   │       └─ Import series.js script
│   │   │
│   │   └── partials/
│   │       └── series-card.ejs      [NEW]
│   │           └─ Template for 1 card (EJS)
│   │
│   └── 📁 public/
│       └── js/
│           └── series.js            [NEW]
│               └─ SeriesLoadMore class
│                  - Event listener
│                  - Fetch API
│                  - DOM manipulation
│
└── 📄 Documentation/
    ├── LOAD_MORE_GUIDE.md           [NEW] - Full guide
    ├── IMPLEMENTATION_SUMMARY.md    [NEW] - Summary
    ├── README_LOADMORE.md           [NEW] - Quick start
    ├── SERIES_LOADMORE_EXAMPLES.js  [NEW] - Code examples
    ├── test-loadmore.sh             [NEW] - Test (Linux)
    └── test-loadmore.ps1            [NEW] - Test (Windows)

*/

// ─────────────────────────────────────────────────────────────────────────
// 🔄 DATA FLOW SUMMARY
// ─────────────────────────────────────────────────────────────────────────

/*

STEP 1: Initial Page Load
─────────────────────────
User → Browser
  ↓
GET http://localhost:3000/series
  ↓
Fastify: pages-routes.js → /series handler
  ↓
Reply: Render series/index.ejs
  ↓
Template: Use posts data (6 items from trang 1)
  ↓
For each post: Include partials/series-card.ejs
  ↓
HTML sent to Browser with:
  - 6 cards (series-card divs)
  - 1 button (load-more-button)
  - 1 script (series.js)


STEP 2: JavaScript Initialization
──────────────────────────────────
Browser loads series.js
  ↓
DOMContentLoaded event fires
  ↓
new SeriesLoadMore() instantiated
  ↓
Constructor runs:
  - Find .card-grid element
  - Find .load-more-button element
  - Set currentPage = 1
  - Set hasMore = true
  - init() adds click listener


STEP 3: User Clicks "Xem Thêm"
───────────────────────────────
User clicks button
  ↓
loadMore() method called
  ↓
Check: if isLoading || !hasMore → return (prevent double-click)
  ↓
Disable button + show "Đang tải..."
  ↓
Fetch /api/series/posts?page=2
  ↓
Server route handler (series-api-routes.js)
  ↓
Query data: slice(6, 12) from mockPosts
  ↓
Render 6 posts as HTML cards
  ↓
Return JSON:
  {
    html: "6 divs...",
    page: 2,
    hasMore: false,
    ...
  }
  ↓
Browser receives response
  ↓
JavaScript: insertAdjacentHTML('beforeend', html)
  ↓
6 new cards appear in DOM (no page reload!)
  ↓
Update state:
  - currentPage = 2
  - hasMore = false
  ↓
Since hasMore = false:
  Hide load-more-container
  ↓
Re-enable button (disabled = false)
  ↓
Show "Xem Thêm" text again


RESULT:
───────
✅ Grid now has 12 cards (6 original + 6 new)
✅ Button is hidden (no more data)
✅ No page reload - smooth user experience!
✅ No duplicate cards - pagination logic prevents this

*/

// ─────────────────────────────────────────────────────════════════════════
// 📝 CODE SNIPPETS LOCATION
// ─────────────────────────════════════════════════════════════════════════

/*

API Response Generation:
  📄 src/routes/series-api-routes.js (lines 76-98)
  └─ See: return { success: true, data: { ... } }

Template Rendering (EJS):
  📄 src/routes/pages-routes.js (lines 50-68)
  └─ See: reply.viewAsync(route.template, viewData)

Partial Loop (EJS):
  📄 src/views/series/index.ejs (lines 292-297)
  └─ See: <% posts.forEach(post => { %> ...include...

Partial Template:
  📄 src/views/partials/series-card.ejs (lines 1-50)
  └─ See: <%= post.title %>, <%= post.views %>, etc.

JavaScript Main Logic:
  📄 src/public/js/series.js (lines 22-65)
  └─ See: class SeriesLoadMore { ... loadMore() ... }

Event Handling:
  📄 src/public/js/series.js (lines 8-10)
  └─ See: this.loadMoreButton.addEventListener('click', ...)

DOM Manipulation:
  📄 src/public/js/series.js (line 53)
  └─ See: this.cardGrid.insertAdjacentHTML('beforeend', ...)

*/

console.log(`
═══════════════════════════════════════════════════════════════════════════
 ✅ Series Load More Feature - Architecture Complete
═══════════════════════════════════════════════════════════════════════════

📊 See the architecture diagrams in this file for:
   - System Architecture Flowchart
   - User Interaction Flow
   - File Structure
   - Data Flow by Step
   - Code Location Reference

📚 For implementation details, see:
   - LOAD_MORE_GUIDE.md
   - IMPLEMENTATION_SUMMARY.md
   - SERIES_LOADMORE_EXAMPLES.js

🚀 Ready to use: npm run dev → http://localhost:3000/series

═══════════════════════════════════════════════════════════════════════════
`);
