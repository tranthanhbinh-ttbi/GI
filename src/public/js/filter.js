/**
 * Series Filter Module
 * Xử lý chức năng bộ lọc tìm kiếm không reload trang
 * Hỗ trợ: danh mục, khoảng ngày, đánh giá, sắp xếp, phân trang
 */

class SeriesFilter {
  constructor(options = {}) {
    // Grid để hiển thị bài viết
    this.cardGrid = document.querySelector(options.gridSelector || '.card-grid');
    this.loadMoreContainer = document.querySelector(options.containerSelector || '.load-more-container');
    this.loadMoreButton = document.querySelector(options.buttonSelector || '.load-more-button');
    
    // API endpoint
    this.apiEndpoint = options.apiEndpoint || '/api/series/filter';
    
    // Các phần tử filter
    this.filterButtons = document.querySelectorAll('.filter-bar .filter-button');
    this.filterForms = document.querySelectorAll('form.series-filter-form');
    
    // Trạng thái filter hiện tại
    this.currentFilters = {
      category: 'all',
      dateRange: 'all',
      startDate: '',
      endDate: '',
      rating: '',
      sortBy: 'newest',
      page: 1,
    };
    
    this.isLoading = false;
    this.hasMore = true;
    
    if (this.cardGrid) {
      this.init();
    }
  }

  init() {
    // Gán sự kiện cho nút filter danh mục
    this.filterButtons.forEach(button => {
      button.addEventListener('click', (e) => this.handleCategoryFilter(e, button));
    });

    // Gán sự kiện cho các form filter (trên desktop và mobile)
    this.filterForms.forEach(form => {
      form.addEventListener('submit', (e) => this.handleFormSubmit(e, form));
      
      // Gán sự kiện thay đổi ngay lập tức cho các input
      const dateSelect = form.querySelector('select[name="post-date-range"]');
      const ratingSelect = form.querySelector('select[name="rating"]');
      const sortSelect = form.querySelector('select[name="sort-by"]');
      
      if (dateSelect) {
        dateSelect.addEventListener('change', () => {
          this.handleDateRangeChange(dateSelect, form);
          // Đồng bộ cả 2 form
          this.syncAllForms('post-date-range', dateSelect.value);
          this.applyFilters();
        });
      }
      
      if (ratingSelect) {
        ratingSelect.addEventListener('change', () => {
          this.syncAllForms('rating', ratingSelect.value);
          this.applyFilters();
        });
      }
      
      if (sortSelect) {
        sortSelect.addEventListener('change', () => {
          this.syncAllForms('sort-by', sortSelect.value);
          this.applyFilters();
        });
      }

      // Gán sự kiện cho custom date inputs
      const startDateInput = form.querySelector('input[name="start-date"]');
      const endDateInput = form.querySelector('input[name="end-date"]');
      
      if (startDateInput) {
        startDateInput.addEventListener('change', () => {
          this.syncAllForms('start-date', startDateInput.value);
          this.applyFilters();
        });
      }
      
      if (endDateInput) {
        endDateInput.addEventListener('change', () => {
          this.syncAllForms('end-date', endDateInput.value);
          this.applyFilters();
        });
      }
    });

    // Gán sự kiện cho nút "Xem Thêm"
    if (this.loadMoreButton) {
      this.loadMoreButton.addEventListener('click', () => this.loadMore());
    }
  }

  syncAllForms(fieldName, value) {
    this.filterForms.forEach(form => {
      const field = form.querySelector(`[name="${fieldName}"]`);
      if (field) {
        field.value = value;
      }
    });
  }

  handleCategoryFilter(e, button) {
    e.preventDefault();
    
    // Cập nhật style nút active
    this.filterButtons.forEach(btn => {
      btn.classList.remove('filter-button-active');
      btn.classList.add('filter-button-inactive');
    });
    button.classList.add('filter-button-active');
    button.classList.remove('filter-button-inactive');
    
    // Xác định danh mục
    const buttonText = button.textContent.trim();
    if (buttonText === 'Tất Cả') {
      this.currentFilters.category = 'all';
    } else if (buttonText.includes('Bài Viết')) {
      this.currentFilters.category = 'Bài Viết';
    } else if (buttonText.includes('Video')) {
      this.currentFilters.category = 'Video';
    } else if (buttonText.includes('Podcast')) {
      this.currentFilters.category = 'Podcast';
    }
    
    // Reset về trang 1 và áp dụng bộ lọc
    this.currentFilters.page = 1;
    this.applyFilters();
  }

  handleFormSubmit(e, form) {
    e.preventDefault();
    this.applyFilters();
  }

  handleDateRangeChange(selectElement, form) {
    const customRangeContainer = form.querySelector('.custom-date-range-container');
    if (!customRangeContainer) return;

    if (selectElement.value === 'custom') {
      customRangeContainer.style.display = 'grid';
    } else {
      customRangeContainer.style.display = 'none';
    }
  }

  applyFilters() {
    // Cập nhật filters từ form hiện tại
    this.updateFiltersFromForm();
    
    // Reset trang và tải bài viết
    this.currentFilters.page = 1;
    this.loadPosts();
  }

  updateFiltersFromForm() {
    // Lấy form đầu tiên có sẵn
    const form = this.filterForms[0];
    if (!form) return;

    const dateSelect = form.querySelector('select[name="post-date-range"]');
    const startDateInput = form.querySelector('input[name="start-date"]');
    const endDateInput = form.querySelector('input[name="end-date"]');
    const ratingSelect = form.querySelector('select[name="rating"]');
    const sortSelect = form.querySelector('select[name="sort-by"]');

    if (dateSelect) {
      this.currentFilters.dateRange = dateSelect.value;
    }
    
    if (startDateInput && endDateInput) {
      this.currentFilters.startDate = startDateInput.value;
      this.currentFilters.endDate = endDateInput.value;
    }
    
    if (ratingSelect) {
      this.currentFilters.rating = ratingSelect.value;
    }
    
    if (sortSelect) {
      this.currentFilters.sortBy = sortSelect.value;
    }
  }

  async loadPosts() {
    if (this.isLoading) return;

    this.isLoading = true;
    if (this.loadMoreButton) {
      this.loadMoreButton.disabled = true;
      this.loadMoreButton.textContent = 'Đang tải...';
    }

    try {
      const params = new URLSearchParams({
        category: this.currentFilters.category,
        dateRange: this.currentFilters.dateRange,
        startDate: this.currentFilters.startDate,
        endDate: this.currentFilters.endDate,
        rating: this.currentFilters.rating,
        sortBy: this.currentFilters.sortBy,
        page: this.currentFilters.page,
      });

      const response = await fetch(`${this.apiEndpoint}?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        // Nếu đây là trang 1, thay thế toàn bộ grid
        if (this.currentFilters.page === 1) {
          this.cardGrid.innerHTML = result.data.html;
        } else {
          // Nếu không, append thêm bài viết
          this.cardGrid.insertAdjacentHTML('beforeend', result.data.html);
        }

        // Cập nhật trạng thái
        this.hasMore = result.data.hasMore;
        
        // Quản lý nút "Xem Thêm"
        if (this.loadMoreContainer) {
          if (this.hasMore) {
            this.loadMoreContainer.style.display = 'block';
          } else {
            this.loadMoreContainer.style.display = 'none';
          }
        }

        if (this.loadMoreButton && this.hasMore) {
          this.loadMoreButton.textContent = 'Xem Thêm';
        }

        // Cuộn tới phần bài viết (nếu không phải trang 1)
        if (this.currentFilters.page === 1) {
          window.scrollTo({ top: this.cardGrid.offsetTop - 100, behavior: 'smooth' });
        }
      }
    } catch (error) {
      console.error('Lỗi khi tải bài viết:', error);
      alert('Lỗi khi tải bài viết. Vui lòng thử lại!');
      if (this.loadMoreButton) {
        this.loadMoreButton.textContent = 'Xem Thêm';
      }
    } finally {
      this.isLoading = false;
      if (this.loadMoreButton) {
        this.loadMoreButton.disabled = false;
      }
    }
  }

  loadMore() {
    if (this.isLoading || !this.hasMore) return;
    
    this.currentFilters.page += 1;
    this.loadPosts();
  }
}

// Khởi tạo khi DOM ready
document.addEventListener('DOMContentLoaded', () => {
  new SeriesFilter({
    gridSelector: '.card-grid',
    buttonSelector: '.load-more-button',
    containerSelector: '.load-more-container',
    apiEndpoint: '/api/series/filter',
  });
});

