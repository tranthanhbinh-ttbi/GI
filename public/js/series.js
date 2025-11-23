/**
 * Series Load More Module
 * Xử lý chức năng "Xem thêm" trên trang Series
 */

class SeriesLoadMore {
  constructor(options = {}) {
    this.cardGrid = document.querySelector(options.gridSelector || '.card-grid');
    this.loadMoreButton = document.querySelector(options.buttonSelector || '.load-more-button');
    this.loadMoreContainer = document.querySelector(options.containerSelector || '.load-more-container');
    
    this.currentPage = 1;
    this.isLoading = false;
    this.hasMore = true;
    this.apiEndpoint = options.apiEndpoint || '/api/series/posts';
    
    if (this.loadMoreButton && this.cardGrid) {
      this.init();
    }
  }

  init() {
    this.loadMoreButton.addEventListener('click', () => this.loadMore());
  }

  async loadMore() {
    if (this.isLoading || !this.hasMore) return;

    this.isLoading = true;
    this.loadMoreButton.disabled = true;
    this.loadMoreButton.textContent = 'Đang tải...';

    try {
      const nextPage = this.currentPage + 1;
      const response = await fetch(`${this.apiEndpoint}?page=${nextPage}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.data.html) {
        // Append bài viết mới vào grid
        this.cardGrid.insertAdjacentHTML('beforeend', result.data.html);
        
        // Cập nhật trạng thái
        this.currentPage = nextPage;
        this.hasMore = result.data.hasMore;

        // Ẩn nút nếu không còn bài viết
        if (!this.hasMore) {
          this.hidLoadMoreButton();
        } else {
          this.loadMoreButton.textContent = 'Xem Thêm';
        }
      }
    } catch (error) {
      console.error('Lỗi khi tải bài viết:', error);
      this.loadMoreButton.textContent = 'Xem Thêm';
      alert('Lỗi khi tải bài viết. Vui lòng thử lại!');
    } finally {
      this.isLoading = false;
      this.loadMoreButton.disabled = false;
    }
  }

  hidLoadMoreButton() {
    if (this.loadMoreContainer) {
      this.loadMoreContainer.style.display = 'none';
    } else {
      this.loadMoreButton.style.display = 'none';
    }
  }
}

// Khởi tạo khi DOM ready
document.addEventListener('DOMContentLoaded', () => {
  new SeriesLoadMore({
    gridSelector: '.card-grid',
    buttonSelector: '.load-more-button',
    containerSelector: '.load-more-container',
    apiEndpoint: '/api/series/posts'
  });
});
