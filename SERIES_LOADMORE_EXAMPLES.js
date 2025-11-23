/**
 * SERIES LOAD MORE - HƯỚNG DẪN VÀ VÍ DỤ SỬ DỤNG
 * 
 * File này chứa các ví dụ và hướng dẫn chi tiết cho lập trình viên
 * về cách sử dụng, tùy chỉnh, và mở rộng chức năng Load More.
 */

// ============================================================================
// 📌 PHẦN 1: CẤU TRÚC CƠ BẢN
// ============================================================================

/**
 * REQUEST (Client → Server)
 * ──────────────────────────────────────────────────────
 * GET /api/series/posts?page=2
 * 
 * Query Parameters:
 *   - page (int): Số trang (mặc định: 1)
 *   - limit (int): Số bài/trang (mặc định: 6) - [CÓ THỂ THÊM]
 *   - category (string): Filter by category (optional) - [CÓ THỂ THÊM]
 */

/**
 * RESPONSE (Server → Client)
 * ──────────────────────────────────────────────────────
 * HTTP 200 OK
 * Content-Type: application/json
 */

const RESPONSE_EXAMPLE = {
  success: true,
  data: {
    // HTML string - Render từ template hoặc loop
    html: `
      <div class="series-card" data-post-id="7">
        <div class="card-image-container">
          <a href="#" class="block">
            <img class="card-image" src="/photos/placeholder.png" alt="Title">
          </a>
          <span class="card-category-badge bg-red-600">Video</span>
          <span class="slide-date-badge">12/9/2024</span>
        </div>
        <!-- ... -->
      </div>
      <div class="series-card" data-post-id="8">
        <!-- ... -->
      </div>
      <!-- Tiếp tục 6 cards -->
    `,
    
    // Metadata pagination
    page: 2,              // Trang hiện tại
    limit: 6,             // Số bài mỗi trang
    hasMore: true,        // Còn trang tiếp không?
    totalCount: 12,       // Tổng bài viết
    totalPages: 2         // Tổng trang
  }
};

// ============================================================================
// 📌 PHẦN 2: VÍ DỤ SỬ DỤNG JAVASCRIPT
// ============================================================================

/**
 * ✅ CÁCH 1: SỬ DỤNG CLASS MẶC ĐỊNH (ĐƠN GIẢN NHẤT)
 * ──────────────────────────────────────────────────────
 */

// Tệp: src/public/js/series.js đã khởi tạo tự động
// 
// HTML cần có:
// <div class="card-grid"><!-- cards --></div>
// <button class="load-more-button">Xem Thêm</button>

// Class sẽ tự động khởi tạo khi DOM ready ✅


/**
 * ✅ CÁCH 2: KHỞI TẠO CLASS VỚI CÁC OPTIONS
 * ──────────────────────────────────────────────────────
 */

// Ví dụ: Tùy chỉnh selector khác
document.addEventListener('DOMContentLoaded', () => {
  new SeriesLoadMore({
    gridSelector: '.my-custom-grid',           // Selector lưới bài
    buttonSelector: '.my-custom-button',       // Selector nút
    containerSelector: '.my-custom-container', // Selector container
    apiEndpoint: '/api/series/posts'           // URL API (mặc định)
  });
});


/**
 * ✅ CÁCH 3: TỰ VIẾT LOGIC (CÓ KIỂM SOÁT TOÀN LỘ)
 * ──────────────────────────────────────────────────────
 */

class CustomSeriesLoader {
  constructor() {
    this.page = 1;
    this.isLoading = false;
    this.hasMore = true;
    
    document.querySelector('.load-more-button')
      .addEventListener('click', () => this.loadMore());
  }

  async loadMore() {
    if (this.isLoading || !this.hasMore) return;
    
    this.isLoading = true;
    const button = document.querySelector('.load-more-button');
    button.textContent = '⏳ Đang tải...';
    button.disabled = true;

    try {
      const url = `/api/series/posts?page=${this.page + 1}`;
      const response = await fetch(url);
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const result = await response.json();
      
      if (result.success) {
        // Append cards vào grid
        const grid = document.querySelector('.card-grid');
        grid.insertAdjacentHTML('beforeend', result.data.html);
        
        // Cập nhật trạng thái
        this.page = result.data.page;
        this.hasMore = result.data.hasMore;
        
        // Log
        console.log(`✅ Loaded page ${this.page}/${result.data.totalPages}`);
        
        // Ẩn nút nếu hết
        if (!this.hasMore) {
          button.parentElement.style.display = 'none';
        }
      }
    } catch (error) {
      console.error('❌ Load error:', error);
      button.textContent = '❌ Lỗi, thử lại';
      
      setTimeout(() => {
        button.textContent = 'Xem Thêm';
      }, 2000);
    } finally {
      this.isLoading = false;
      button.disabled = false;
      button.textContent = 'Xem Thêm';
    }
  }
}

// Khởi tạo
// new CustomSeriesLoader();


// ============================================================================
// 📌 PHẦN 3: VÍ DỤ MỞ RỘNG - THÊM FILTER
// ============================================================================

/**
 * THÊM FILTER CATEGORY
 * ──────────────────────────────────────────────────────
 */

class FilteredSeriesLoader {
  constructor() {
    this.page = 1;
    this.category = 'all'; // Danh mục hiện tại
    this.isLoading = false;
    this.hasMore = true;
    
    // Lắng nghe thay đổi filter
    document.querySelectorAll('.filter-button')
      .forEach(btn => {
        btn.addEventListener('click', (e) => {
          this.category = e.target.dataset.category || 'all';
          this.page = 1; // Reset page
          this.resetGrid();
          this.loadMore();
        });
      });
    
    document.querySelector('.load-more-button')
      .addEventListener('click', () => this.loadMore());
  }

  resetGrid() {
    document.querySelector('.card-grid').innerHTML = '';
  }

  async loadMore() {
    if (this.isLoading || !this.hasMore) return;
    
    this.isLoading = true;
    const button = document.querySelector('.load-more-button');
    button.disabled = true;
    button.textContent = 'Đang tải...';

    try {
      // URL với filter category
      const url = `/api/series/posts?page=${this.page + 1}&category=${this.category}`;
      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        document.querySelector('.card-grid')
          .insertAdjacentHTML('beforeend', result.data.html);
        
        this.page = result.data.page;
        this.hasMore = result.data.hasMore;
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      this.isLoading = false;
      button.disabled = false;
      button.textContent = 'Xem Thêm';
    }
  }
}


// ============================================================================
// 📌 PHẦN 4: VÍ DỤ MỞ RỘNG - INFINITE SCROLL
// ============================================================================

/**
 * THAY BUTTON BẰNG INFINITE SCROLL (AUTO-LOAD)
 * ──────────────────────────────────────────────────────
 */

class InfiniteScrollLoader {
  constructor() {
    this.page = 1;
    this.isLoading = false;
    this.hasMore = true;
    
    // Intersection Observer để detect scroll gần cuối
    const gridElement = document.querySelector('.card-grid');
    
    const observer = new IntersectionObserver((entries) => {
      const lastCard = entries[0];
      
      if (lastCard.isIntersecting && !this.isLoading && this.hasMore) {
        this.loadMore();
      }
    }, {
      rootMargin: '200px' // Load khi cách cuối 200px
    });
    
    // Observe phần tử cuối grid
    observer.observe(gridElement.lastElementChild || gridElement);
    this.observer = observer;
  }

  async loadMore() {
    if (this.isLoading || !this.hasMore) return;
    
    this.isLoading = true;
    console.log('🔄 Loading page', this.page + 1);

    try {
      const response = await fetch(`/api/series/posts?page=${this.page + 1}`);
      const result = await response.json();

      if (result.success) {
        const grid = document.querySelector('.card-grid');
        grid.insertAdjacentHTML('beforeend', result.data.html);
        
        this.page = result.data.page;
        this.hasMore = result.data.hasMore;
        
        if (!this.hasMore) {
          console.log('✅ Loaded all posts');
          // Ẩn loading indicator nếu có
          const loader = document.querySelector('.infinite-scroll-loader');
          if (loader) loader.style.display = 'none';
        }
      }
    } catch (error) {
      console.error('❌ Infinite scroll error:', error);
    } finally {
      this.isLoading = false;
    }
  }
}

// Khởi tạo infinite scroll
// new InfiniteScrollLoader();


// ============================================================================
// 📌 PHẦN 5: VÍ DỤ SERVER-SIDE - CÁCH LÀM API
// ============================================================================

/**
 * FASTIFY API ENDPOINT
 * ──────────────────────────────────────────────────────
 * File: src/routes/series-api-routes.js
 */

const FASTIFY_EXAMPLE = `
async function SeriesAPI(fastify, options) {
  fastify.get('/api/series/posts', async (request, reply) => {
    // 1. Lấy parameters từ query
    const page = Math.max(1, parseInt(request.query.page) || 1);
    const limit = parseInt(request.query.limit) || 6;
    const category = request.query.category || 'all';

    // 2. Query database (ví dụ Sequelize)
    let query = {};
    if (category !== 'all') {
      query.category = category;
    }

    const { rows: posts, count: totalCount } = await Post.findAndCountAll({
      where: query,
      limit,
      offset: (page - 1) * limit,
      order: [['createdAt', 'DESC']]
    });

    // 3. Xử lý hasMore
    const hasMore = (page * limit) < totalCount;

    // 4. Render HTML từ partial
    const postsHtml = posts.map(post => {
      // Dùng EJS hoặc template khác để render
      // hoặc xây dựng HTML string
      return \`<div class="series-card">...</div>\`;
    }).join('');

    // 5. Trả về JSON
    return {
      success: true,
      data: {
        html: postsHtml,
        page,
        limit,
        hasMore,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      }
    };
  });
}
`;


// ============================================================================
// 📌 PHẦN 6: BEST PRACTICES
// ============================================================================

/**
 * ✅ BEST PRACTICES
 * ──────────────────────────────────────────────────────
 */

const BEST_PRACTICES = {
  // 1. Luôn kiểm tra isLoading để tránh double-click
  checkLoading: 'if (this.isLoading) return;',

  // 2. Luôn kiểm tra hasMore trước khi load
  checkHasMore: 'if (!this.hasMore) return;',

  // 3. Luôn handle lỗi network
  handleError: `
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Network error');
    } catch (error) {
      console.error(error);
      showErrorUI();
    }
  `,

  // 4. Luôn disable/enable button đúng lúc
  disableButton: `
    button.disabled = true;  // Trước khi fetch
    button.disabled = false; // Sau khi xong
  `,

  // 5. Luôn validate HTML trước append
  validateHTML: `
    if (result.success && result.data.html) {
      grid.insertAdjacentHTML('beforeend', result.data.html);
    }
  `,

  // 6. Luôn track page current
  trackPage: 'this.page = result.data.page;',

  // 7. Luôn ẩn nút khi hết
  hideButtonWhenEmpty: `
    if (!result.data.hasMore) {
      button.parentElement.style.display = 'none';
    }
  `,

  // 8. Luôn log để debug
  addLogging: 'console.log("Page", page, "Loading...");',
};


// ============================================================================
// 📌 PHẦN 7: TESTING
// ============================================================================

/**
 * CÁCH KIỂM THỬ
 * ──────────────────────────────────────────────────────
 */

const TESTING_STEPS = `
1. KIỂM THỬ THỦ CÔNG
   ✓ Mở browser DevTools (F12)
   ✓ Tab Network
   ✓ Nhấn "Xem Thêm"
   ✓ Xem request: GET /api/series/posts?page=2
   ✓ Xem response: JSON format
   ✓ Xem 6 cards được thêm vào

2. KIỂM THỬ CONSOLE
   > Mở console (F12)
   > Kiểm tra không có error
   > Thấy logs: "✅ Loaded page 2/2"

3. KIỂM THỬ EDGE CASES
   ✓ Double-click nút (should not double-load)
   ✓ Click khi đang load (should not trigger)
   ✓ Click sau hết bài (nút phải ẩn)

4. KIỂM THỬ RESPONSIVE
   ✓ Desktop (>1024px): Full grid
   ✓ Tablet (768-1024px): 2-3 columns
   ✓ Mobile (<768px): 1 column
   ✓ Button full width trên mobile

5. KIỂM THỬ PERFORMANCE
   ✓ Thời gian response < 500ms
   ✓ Không lag khi scroll
   ✓ Memory không tăng vô hạn
`;


// ============================================================================
// 📌 PHẦN 8: TROUBLESHOOTING
// ============================================================================

/**
 * GIẢI QUYẾT VẤN ĐỀ
 * ──────────────────────────────────────────────────────
 */

const TROUBLESHOOTING = {
  problemLoadButtonNotShow: {
    problem: 'Nút "Xem Thêm" không hiển thị',
    solutions: [
      '1. Kiểm tra class ".load-more-button" có trong HTML',
      '2. Kiểm tra CSS display không phải none',
      '3. Kiểm tra JavaScript load sau DOM'
    ]
  },

  problemAPINotWorking: {
    problem: 'API không trả về dữ liệu',
    solutions: [
      '1. Kiểm tra server có chạy: npm run dev',
      '2. Kiểm tra route được đăng ký: app.register(...series-api-routes)',
      '3. Kiểm tra URL: http://localhost:3000/api/series/posts?page=1',
      '4. Kiểm tra browser console có error không'
    ]
  },

  problemDuplicateCards: {
    problem: 'Bài viết bị trùng lặp',
    solutions: [
      '1. Kiểm tra tính toán page đúng không',
      '2. Kiểm tra startIndex = (page-1) * limit',
      '3. Kiểm tra API trả về page nào'
    ]
  },

  problemButtonNotHide: {
    problem: 'Nút không ẩn khi hết bài',
    solutions: [
      '1. Kiểm tra hasMore trong response',
      '2. Kiểm tra totalCount == totalItems',
      '3. Kiểm tra logic if (!hasMore) { hide }',
      '4. Kiểm tra selector .load-more-container đúng'
    ]
  },

  problemJSNotLoad: {
    problem: 'JavaScript series.js không chạy',
    solutions: [
      '1. Kiểm tra <script> tag có type="module" hay defer',
      '2. Kiểm tra file path đúng: /js/series.js',
      '3. Mở DevTools xem error message',
      '4. Kiểm tra DOMContentLoaded event'
    ]
  }
};


// ============================================================================
// 📌 PHẦN 9: CHEAT SHEET
// ============================================================================

/**
 * CHEAT SHEET NHANH
 * ──────────────────────────────────────────────────────
 */

const CHEAT_SHEET = `
📝 THÊM FILTER:
  URL: /api/series/posts?page=2&category=video
  Code: \`fetch(\\\`/api/series/posts?page=\${page}&category=\${cat}\\\`)\`

🔄 THÊM SORTING:
  URL: /api/series/posts?page=2&sort=date
  Backend: .order([['createdAt', 'DESC']])

⏱️ THÊM LOADING SPINNER:
  <div class="spinner" id="loader" style="display:none;"></div>
  JS: loader.style.display = 'block' → 'none'

🎨 CUSTOMIZE BUTTON:
  Find: <button class="load-more-button">
  Change: Text, icon, color

📊 TRACK ANALYTICS:
  gtag('event', 'load_more', {page: page, category: category})

🔐 ADD AUTH CHECK:
  if (!request.user) return reply.code(401).send({error: 'Not auth'})

💾 ADD CACHING:
  @fastify/caching for API responses

✨ ADD ANIMATIONS:
  CSS: @keyframes fadeIn { from {opacity:0} to {opacity:1} }
  Apply: .series-card { animation: fadeIn 0.3s }
`;


// ============================================================================
// 🎓 KẾT LUẬN
// ============================================================================

/**
 * TÓME TẮT
 * ──────────────────────────────────────────────────────
 * 
 * ✅ Chức năng "Xem Thêm" đã triển khai:
 *   - Backend API: /api/series/posts
 *   - Frontend Class: SeriesLoadMore
 *   - Partial Template: series-card.ejs
 *   - Logic AJAX: fetch + insertAdjacentHTML
 * 
 * ✅ Có thể mở rộng:
 *   - Thêm filter category
 *   - Infinite scroll auto-load
 *   - Search feature
 *   - Sorting options
 *   - Database integration
 * 
 * ✅ Best practices đã apply:
 *   - Error handling
 *   - Loading state
 *   - Tránh double-load
 *   - Auto-hide button
 *   - Responsive design
 * 
 * ⏭️ Bước tiếp theo:
 *   1. Thay mock data bằng database
 *   2. Thêm filter + search
 *   3. Thêm analytics tracking
 *   4. Performance optimization
 */

console.log('📚 Đọc file này để hiểu chi tiết về Load More feature!');
