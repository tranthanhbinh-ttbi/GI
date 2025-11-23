/**
 * Series API Routes - Load More Functionality
 * API để lấy dữ liệu bài viết series theo trang
 */

// Mock dữ liệu bài viết (sau có thể thay bằng database)
const mockPosts = [
  {
    id: 1,
    title: 'Giao Tiếp Hiệu Quả Về Giới Tính',
    description: 'Hướng dẫn cách mở cuộc trò chuyện khó khăn với gia đình về các vấn đề giới tính...',
    category: 'Video',
    categoryColor: 'bg-red-600',
    image: '/photos/placeholder-m6a0q.png',
    date: '12/9/2024',
    views: 890,
    rating: 4.5,
    ratingCount: 45,
  },
  {
    id: 2,
    title: 'Phá Vỡ Định Kiến Giới Tính',
    description: 'Cuộc trò chuyện thẳng thắn về những quan niệm sai lầm phổ biến...',
    category: 'Podcast',
    categoryColor: 'bg-purple-600',
    image: '/photos/placeholder-m6a0q.png',
    date: '10/9/2024',
    views: 654,
    rating: 3.5,
    ratingCount: 32,
  },
  {
    id: 3,
    title: 'Nhận Biết Và Phòng Chống Xâm Hại',
    description: 'Kiến thức quan trọng giúp bảo vệ bản thân và người xung quanh khỏi các nguy cơ xâm hại...',
    category: 'Bài Viết',
    categoryColor: 'bg-blue-600',
    image: '/photos/placeholder-m6a0q.png',
    date: '15/9/2024',
    views: 2100,
    rating: 5,
    ratingCount: 98,
  },
  {
    id: 4,
    title: 'Phá Vỡ Định Kiến Giới Tính',
    description: 'Cuộc trò chuyện thẳng thắn về những quan niệm sai lầm phổ biến...',
    category: 'Podcast',
    categoryColor: 'bg-purple-600',
    image: '/photos/placeholder-m6a0q.png',
    date: '10/9/2024',
    views: 654,
    rating: 3.5,
    ratingCount: 32,
  },
  {
    id: 5,
    title: 'Nhận Biết Và Phòng Chống Xâm Hại',
    description: 'Kiến thức quan trọng giúp bảo vệ bản thân và người xung quanh khỏi các nguy cơ xâm hại...',
    category: 'Bài Viết',
    categoryColor: 'bg-blue-600',
    image: '/photos/placeholder-m6a0q.png',
    date: '15/9/2024',
    views: 2100,
    rating: 5,
    ratingCount: 98,
  },
  {
    id: 6,
    title: 'Nhận Biết Và Phòng Chống Xâm Hại',
    description: 'Kiến thức quan trọng giúp bảo vệ bản thân và người xung quanh khỏi các nguy cơ xâm hại...',
    category: 'Bài Viết',
    categoryColor: 'bg-blue-600',
    image: '/photos/placeholder-m6a0q.png',
    date: '15/9/2024',
    views: 2100,
    rating: 5,
    ratingCount: 98,
  },
  {
    id: 7,
    title: 'Giao Tiếp Hiệu Quả Về Giới Tính',
    description: 'Hướng dẫn cách mở cuộc trò chuyện khó khăn với gia đình về các vấn đề giới tính...',
    category: 'Video',
    categoryColor: 'bg-red-600',
    image: '/photos/placeholder-m6a0q.png',
    date: '12/9/2024',
    views: 890,
    rating: 4.5,
    ratingCount: 45,
  },
  {
    id: 8,
    title: 'Phá Vỡ Định Kiến Giới Tính',
    description: 'Cuộc trò chuyện thẳng thắn về những quan niệm sai lầm phổ biến...',
    category: 'Podcast',
    categoryColor: 'bg-purple-600',
    image: '/photos/placeholder-m6a0q.png',
    date: '10/9/2024',
    views: 654,
    rating: 3.5,
    ratingCount: 32,
  },
  {
    id: 9,
    title: 'Nhận Biết Và Phòng Chống Xâm Hại',
    description: 'Kiến thức quan trọng giúp bảo vệ bản thân và người xung quanh khỏi các nguy cơ xâm hại...',
    category: 'Bài Viết',
    categoryColor: 'bg-blue-600',
    image: '/photos/placeholder-m6a0q.png',
    date: '15/9/2024',
    views: 2100,
    rating: 5,
    ratingCount: 98,
  },
  {
    id: 10,
    title: 'Giao Tiếp Hiệu Quả Về Giới Tính',
    description: 'Hướng dẫn cách mở cuộc trò chuyện khó khăn với gia đình về các vấn đề giới tính...',
    category: 'Video',
    categoryColor: 'bg-red-600',
    image: '/photos/placeholder-m6a0q.png',
    date: '12/9/2024',
    views: 890,
    rating: 4.5,
    ratingCount: 45,
  },
  {
    id: 11,
    title: 'Phá Vỡ Định Kiến Giới Tính',
    description: 'Cuộc trò chuyện thẳng thắn về những quan niệm sai lầm phổ biến...',
    category: 'Podcast',
    categoryColor: 'bg-purple-600',
    image: '/photos/placeholder-m6a0q.png',
    date: '10/9/2024',
    views: 654,
    rating: 3.5,
    ratingCount: 32,
  },
  {
    id: 12,
    title: 'Nhận Biết Và Phòng Chống Xâm Hại',
    description: 'Kiến thức quan trọng giúp bảo vệ bản thân và người xung quanh khỏi các nguy cơ xâm hại...',
    category: 'Bài Viết',
    categoryColor: 'bg-blue-600',
    image: '/photos/placeholder-m6a0q.png',
    date: '15/9/2024',
    views: 2100,
    rating: 5,
    ratingCount: 98,
  },
];

// Hàm render stars
function renderStars(rating) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;
  let starsHtml = '';
  
  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      starsHtml += '<svg class="icon-sm text-yellow-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.971h4.172c.969 0 1.371 1.24.588 1.81l-3.38 2.455 1.287 3.971c.3.921-.755 1.688-1.54 1.182L10 13.34l-3.379 2.455c-.784.506-1.84-.261-1.54-1.182l1.287-3.971-3.38-2.455c-.783-.57-.38-1.81.588-1.81h4.172l1.286-3.971z"></path></svg>';
    } else {
      starsHtml += '<svg class="icon-sm text-gray-300" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.971h4.172c.969 0 1.371 1.24.588 1.81l-3.38 2.455 1.287 3.971c.3.921-.755 1.688-1.54 1.182L10 13.34l-3.379 2.455c-.784.506-1.84-.261-1.54-1.182l1.287-3.971-3.38-2.455c-.783-.57-.38-1.81.588-1.81h4.172l1.286-3.971z"></path></svg>';
    }
  }
  
  return starsHtml;
}

// Hàm helper để lọc bài viết theo các tiêu chí
function filterPosts(posts, filters) {
  let filtered = [...posts];

  // Lọc theo danh mục
  if (filters.category && filters.category !== 'all') {
    filtered = filtered.filter(post => post.category === filters.category);
  }

  // Lọc theo ngày
  if (filters.dateRange && filters.dateRange !== 'all') {
    const today = new Date();
    const postDate = new Date();
    
    filtered = filtered.filter(post => {
      // Parse ngày từ định dạng "DD/M/YYYY"
      const [day, month, year] = post.date.split('/').map(Number);
      const postDateObj = new Date(year, month - 1, day);
      
      switch (filters.dateRange) {
        case 'today':
          return postDateObj.toDateString() === today.toDateString();
        case 'this_week':
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return postDateObj >= weekAgo;
        case 'this_month':
          return postDateObj.getMonth() === today.getMonth() && 
                 postDateObj.getFullYear() === today.getFullYear();
        case 'this_year':
          return postDateObj.getFullYear() === today.getFullYear();
        case 'custom':
          if (filters.startDate && filters.endDate) {
            const start = new Date(filters.startDate);
            const end = new Date(filters.endDate);
            return postDateObj >= start && postDateObj <= end;
          }
          return true;
        default:
          return true;
      }
    });
  }

  // Lọc theo đánh giá
  if (filters.rating) {
    const minRating = parseFloat(filters.rating);
    filtered = filtered.filter(post => post.rating >= minRating);
  }

  // Sắp xếp
  if (filters.sortBy) {
    switch (filters.sortBy) {
      case 'newest':
        // Sắp xếp theo ngày mới nhất (giả định ngày sau trong mảng là mới)
        filtered.sort((a, b) => {
          const dateA = new Date(a.date.split('/').reverse().join('-'));
          const dateB = new Date(b.date.split('/').reverse().join('-'));
          return dateB - dateA;
        });
        break;
      case 'oldest':
        filtered.sort((a, b) => {
          const dateA = new Date(a.date.split('/').reverse().join('-'));
          const dateB = new Date(b.date.split('/').reverse().join('-'));
          return dateA - dateB;
        });
        break;
      case 'popular':
        filtered.sort((a, b) => b.views - a.views);
        break;
    }
  }

  return filtered;
}

async function SeriesAPI(fastify, options) {
  // Lấy bài viết theo trang (6 bài mỗi trang)
  fastify.get('/api/series/posts', async (request, reply) => {
    const page = Math.max(1, parseInt(request.query.page) || 1);
    const limit = 6; // Số bài viết mỗi trang
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    // Lấy bài viết của trang hiện tại
    const paginatedPosts = mockPosts.slice(startIndex, endIndex);
    
    // Kiểm tra xem còn bài viết không
    const hasMore = endIndex < mockPosts.length;
    const totalCount = mockPosts.length;

    // Chuyển dữ liệu bài viết thành HTML
    const postsHtml = paginatedPosts.map(post => `
      <div class="series-card" data-post-id="${post.id}">
        <div class="card-image-container">
          <a href="#" class="block">
            <img class="card-image" src="${post.image}" alt="${post.title}">
          </a>
          <span class="card-category-badge ${post.categoryColor}">${post.category}</span>
          <span class="slide-date-badge">${post.date}</span>
        </div>
        <div class="card-content">
          <h3 class="card-title">
            <a href="#">${post.title}</a>
          </h3>
          <p class="card-description">
            ${post.description}
          </p>
        </div>
        <div class="card-footer">
          <div class="card-stats">
            <div class="stat-item" title="Lượt xem">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-eye-fill" viewBox="0 0 16 16"><path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0"/><path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8m8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7"/></svg>
              <span>${post.views}</span>
            </div>
            <div class="stat-item" title="Đánh giá (${post.ratingCount})">
              <div class="flex items-center">
                ${renderStars(post.rating)}
              </div>
              <span>(${post.ratingCount})</span>
            </div>
          </div>
          <button class="card-share-button" title="Chia sẻ">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 512 512"><path d="M384 192c53 0 96-43 96-96s-43-96-96-96-96 43-96 96c0 5.4 .5 10.8 1.3 16L159.6 184.1c-16.9-15-39.2-24.1-63.6-24.1-53 0-96 43-96 96s43 96 96 96c24.4 0 46.6-9.1 63.6-24.1L289.3 400c-.9 5.2-1.3 10.5-1.3 16 0 53 43 96 96 96s96-43 96-96-43-96-96-96c-24.4 0-46.6 9.1-63.6 24.1L190.7 272c.9-5.2 1.3-10.5 1.3-16s-.5-10.8-1.3-16l129.7-72.1c16.9 15 39.2 24.1 63.6 24.1z"/></svg>
          </button>
        </div>
      </div>
    `).join('');

    return {
      success: true,
      data: {
        html: postsHtml,
        page,
        limit,
        hasMore,
        totalCount,
        totalPages: Math.ceil(mockPosts.length / limit),
      }
    };
  });

  // Endpoint để lọc bài viết với các tiêu chí (category, date, rating, sort)
  fastify.get('/api/series/filter', async (request, reply) => {
    const page = Math.max(1, parseInt(request.query.page) || 1);
    const limit = 6; // Số bài viết mỗi trang

    // Lấy các tham số filter từ query
    const filters = {
      category: request.query.category || 'all',
      dateRange: request.query.dateRange || 'all',
      startDate: request.query.startDate || '',
      endDate: request.query.endDate || '',
      rating: request.query.rating || '',
      sortBy: request.query.sortBy || 'newest',
    };

    // Lọc bài viết theo các tiêu chí
    const filteredPosts = filterPosts(mockPosts, filters);

    // Phân trang
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedPosts = filteredPosts.slice(startIndex, endIndex);

    // Kiểm tra xem còn bài viết không
    const hasMore = endIndex < filteredPosts.length;
    const totalCount = filteredPosts.length;

    // Chuyển dữ liệu bài viết thành HTML
    const postsHtml = paginatedPosts.length > 0 
      ? paginatedPosts.map(post => `
      <div class="series-card" data-post-id="${post.id}">
        <div class="card-image-container">
          <a href="#" class="block">
            <img class="card-image" src="${post.image}" alt="${post.title}">
          </a>
          <span class="card-category-badge ${post.categoryColor}">${post.category}</span>
          <span class="slide-date-badge">${post.date}</span>
        </div>
        <div class="card-content">
          <h3 class="card-title">
            <a href="#">${post.title}</a>
          </h3>
          <p class="card-description">
            ${post.description}
          </p>
        </div>
        <div class="card-footer">
          <div class="card-stats">
            <div class="stat-item" title="Lượt xem">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-eye-fill" viewBox="0 0 16 16"><path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0"/><path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8m8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7"/></svg>
              <span>${post.views}</span>
            </div>
            <div class="stat-item" title="Đánh giá (${post.ratingCount})">
              <div class="flex items-center">
                ${renderStars(post.rating)}
              </div>
              <span>(${post.ratingCount})</span>
            </div>
          </div>
          <button class="card-share-button" title="Chia sẻ">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 512 512"><path d="M384 192c53 0 96-43 96-96s-43-96-96-96-96 43-96 96c0 5.4 .5 10.8 1.3 16L159.6 184.1c-16.9-15-39.2-24.1-63.6-24.1-53 0-96 43-96 96s43 96 96 96c24.4 0 46.6-9.1 63.6-24.1L289.3 400c-.9 5.2-1.3 10.5-1.3 16 0 53 43 96 96 96s96-43 96-96-43-96-96-96c-24.4 0-46.6 9.1-63.6 24.1L190.7 272c.9-5.2 1.3-10.5 1.3-16s-.5-10.8-1.3-16l129.7-72.1c16.9 15 39.2 24.1 63.6 24.1z"/></svg>
          </button>
        </div>
      </div>
    `).join('')
      : '<div style="text-align: center; padding: 40px; color: #999;">Không tìm thấy bài viết phù hợp với tiêu chí lọc.</div>';

    return {
      success: true,
      data: {
        html: postsHtml,
        page,
        limit,
        hasMore,
        totalCount,
        totalPages: Math.ceil(filteredPosts.length / limit),
        filters,
      }
    };
  });
}

module.exports = SeriesAPI;
