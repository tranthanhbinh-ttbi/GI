document.addEventListener('DOMContentLoaded', function () {
    const postSlug = window.postSlug;
    const currentUser = window.currentUser;

    // --- Khởi tạo ---
    loadRatingStats();
    loadComments();
    initViewTracking();

    // --- 0. View Tracking (Debounce 5s) ---
    function initViewTracking() {
        setTimeout(async () => {
            try {
                const response = await fetch(`/api/posts/${postSlug}/view`, {
                    method: 'POST'
                });
                const data = await response.json();
                if (data.success && data.views) {
                    updateViewsUI(data.views);
                }
            } catch (e) {
                console.error('Track view failed', e);
            }
        }, 5000); // Đếm view sau 5s
    }

    function updateViewsUI(views) {
        const viewsEl = document.getElementById('post-views-count');
        if (viewsEl) {
            // Format number: 1000 -> 1k, etc (optional, simple for now)
            viewsEl.textContent = `${views} lượt xem`;
            viewsEl.style.display = 'inline';
        }
    }

    // --- 1. Xử lý Rating ---
    const ratingStars = document.querySelectorAll('#user-rating-stars svg');
    const ratingPrompt = document.getElementById('rating-prompt');
    const cancelRatingBtn = document.getElementById('cancel-rating-btn');

    ratingStars.forEach((star, index) => {
        star.style.cursor = 'pointer';
        
        // Hover hiệu ứng
        star.addEventListener('mouseenter', () => highlightStars(index + 1));
        
        // Click để đánh giá (Optimistic UI)
        star.addEventListener('click', async () => {
            const isLoggedIn = await requireLogin();
            if (!isLoggedIn) return;

            const score = index + 1;
            const previousScore = window.userCurrentScore || 0;

            // 1. Optimistic Update
            window.userCurrentScore = score;
            highlightStars(score);
            ratingPrompt.textContent = 'Cảm ơn bạn đã đánh giá bài viết!';
            if (cancelRatingBtn) cancelRatingBtn.style.display = 'inline-block';

            // 2. Background Sync
            try {
                const response = await fetch(`/api/posts/${postSlug}/rating`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ score })
                });
                const result = await response.json();
                
                if (result.success) {
                    showToast(result.message, 'success');
                    loadRatingStats(); // Sync final stats
                } else {
                    throw new Error(result.message);
                }
            } catch (error) {
                // 3. Revert on Error
                window.userCurrentScore = previousScore;
                highlightStars(previousScore);
                if (previousScore === 0) {
                     ratingPrompt.textContent = 'Nhấp vào sao để đánh giá!';
                     if (cancelRatingBtn) cancelRatingBtn.style.display = 'none';
                }
                showToast(error.message || 'Không thể gửi đánh giá', 'error');
            }
        });
    });

    // Xử lý nút Hủy đánh giá (Optimistic UI)
    if (cancelRatingBtn) {
        cancelRatingBtn.addEventListener('click', async () => {
            const isLoggedIn = await requireLogin();
            if (!isLoggedIn) return;

            const previousScore = window.userCurrentScore || 0;

            // 1. Optimistic Update
            window.userCurrentScore = 0;
            cancelRatingBtn.style.display = 'none';
            ratingPrompt.textContent = 'Nhấp vào sao để đánh giá!';
            highlightStars(0);

            // 2. Background Sync
            try {
                const response = await fetch(`/api/posts/${postSlug}/rating`, {
                    method: 'DELETE'
                });
                const result = await response.json();

                if (result.success) {
                    showToast(result.message, 'success');
                    loadRatingStats(); // Reload stats (avg score)
                } else {
                    throw new Error(result.message);
                }
            } catch (error) {
                // 3. Revert on Error
                window.userCurrentScore = previousScore;
                highlightStars(previousScore);
                ratingPrompt.textContent = 'Cảm ơn bạn đã đánh giá bài viết!';
                cancelRatingBtn.style.display = 'inline-block';
                showToast(error.message || 'Lỗi khi hủy đánh giá', 'error');
            }
        });
    }

    document.getElementById('user-rating-stars').addEventListener('mouseleave', () => {
        // Trả về trạng thái rating của user (nếu có) hoặc 0
        highlightStars(window.userCurrentScore || 0);
    });

    function highlightStars(score) {
        ratingStars.forEach((star, index) => {
            if (index < score) {
                star.classList.add('filled');
            } else {
                star.classList.remove('filled');
            }
        });
    }

    async function loadRatingStats() {
        try {
            const response = await fetch(`/api/posts/${postSlug}/rating`);
            const data = await response.json();
            if (data.success) {
                updateRatingUI(data.avgScore, data.totalRatings);
                if (data.views) updateViewsUI(data.views);

                if (data.userScore > 0) {
                    window.userCurrentScore = data.userScore;
                    highlightStars(data.userScore);
                    ratingPrompt.textContent = 'Cảm ơn bạn đã đánh giá bài viết!';
                    if (cancelRatingBtn) cancelRatingBtn.style.display = 'inline-block';
                } else {
                    window.userCurrentScore = 0;
                    if (cancelRatingBtn) cancelRatingBtn.style.display = 'none';
                }
            }
        } catch (error) {
            console.error('Failed to load ratings', error);
        }
    }

    function updateRatingUI(avg, total) {
        const display = document.getElementById('post-rating-display');
        const starsContainer = display.querySelector('.stars-rating');
        const scoreText = display.querySelector('.rating-score');
        const reviewsText = display.querySelector('.rating-reviews');

        scoreText.textContent = avg;
        reviewsText.textContent = `(${total} đánh giá)`;

        // Update stars
        let starsHTML = '';
        const fullStars = Math.floor(avg);
        const hasHalf = (avg - fullStars) >= 0.5;

        for (let i = 1; i <= 5; i++) {
            if (i <= fullStars) starsHTML += '<span class="star filled">★</span>';
            else if (i === fullStars + 1 && hasHalf) starsHTML += '<span class="star half">★</span>';
            else starsHTML += '<span class="star">☆</span>';
        }
        starsContainer.innerHTML = starsHTML;
    }

    // --- 2. Xử lý Chia sẻ (Social Share) ---
    const shareBtns = document.querySelectorAll('.share-btn');
    shareBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const platform = btn.dataset.platform;
            const url = window.location.href;
            const title = document.querySelector('.post-title').textContent;

            switch (platform) {
                case 'facebook':
                    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400');
                    break;
                case 'twitter':
                    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, '_blank', 'width=600,height=400');
                    break;
                case 'messenger':
                    // Dedicated "Send in Messenger" dialog. 
                    // IMPORTANT: Requires a valid FB App ID and a PUBLIC URL (won't work on localhost).
                    const fbAppId = '1501202124127451'; // Thay bằng App ID thật của bạn
                    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                    
                    if (isMobile) {
                        window.location.href = `fb-messenger://share/?link=${encodeURIComponent(url)}`;
                    } else {
                        window.open(`https://www.facebook.com/dialog/send?link=${encodeURIComponent(url)}&app_id=${fbAppId}&redirect_uri=${encodeURIComponent(url)}`, '_blank', 'width=1100,height=600');
                    }
                    break;
                case 'copy':
                    navigator.clipboard.writeText(url).then(() => {
                        showToast('Đã sao chép liên kết!', 'success');
                    }).catch(() => {
                        showToast('Không thể sao chép liên kết', 'error');
                    });
                    break;
            }
        });
    });

    // --- 3. Xử lý Bình luận ---
    const commentForm = document.getElementById('main-comment-form');
    const commentList = document.getElementById('main-comment-list');
    const commentCountText = document.getElementById('comments-count');

    if (commentForm) {
        commentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const isLoggedIn = await requireLogin();
            if (!isLoggedIn) return;

            const textarea = document.getElementById('comment-textarea');
            const content = textarea.value.trim();
            if (!content) return;

            try {
                const response = await fetch(`/api/posts/${postSlug}/comments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content })
                });
                const result = await response.json();

                if (result.success) {
                    textarea.value = '';
                    showToast('Gửi bình luận thành công!', 'success');
                    prependComment(result.comment);
                    updateCommentCount(1);
                } else {
                    showToast(result.message, 'error');
                }
            } catch (error) {
                showToast('Không thể gửi bình luận', 'error');
            }
        });
    }

    async function loadComments() {
        try {
            const response = await fetch(`/api/posts/${postSlug}/comments`);
            const data = await response.json();
            if (data.success) {
                renderComments(data.comments);
                commentCountText.textContent = `Bình luận (${data.comments.length})`;
            }
        } catch (error) {
            commentList.innerHTML = '<p class="error-text">Không thể tải bình luận.</p>';
        }
    }

    function renderComments(comments) {
        if (comments.length === 0) {
            commentList.innerHTML = '<p class="no-comments">Chưa có bình luận nào. Hãy là người đầu tiên!</p>';
            return;
        }

        commentList.innerHTML = '';
        comments.forEach(comment => {
            const commentEl = createCommentElement(comment);
            commentList.appendChild(commentEl);
        });
    }

    function createCommentElement(comment) {
        const div = document.createElement('div');
        div.className = 'comment-item';
        div.id = `comment-${comment.id}`;
        
        const dateStr = new Date(comment.createdAt).toLocaleString('vi-VN');
        const avatar = comment.User?.avatarUrl || '/photos/placeholder-m6a0q.png';
        const name = comment.User?.name || 'Người dùng';
        
        let deleteBtnHtml = '';
        if (window.currentUser && String(window.currentUser.id) === String(comment.userId)) {
            deleteBtnHtml = `<button class="delete-comment-btn" data-id="${comment.id}" style="background: none; border: none; color: #dc3545; cursor: pointer; padding: 0; font-size: 0.9rem; margin-left: 10px;">Xóa</button>`;
        }

        div.innerHTML = `
            <div style="display: flex; gap: 1rem;">
                <img src="${avatar}" alt="${name}" class="comment-author-avatar">
                <div class="comment-content" style="flex: 1;">
                    <p>
                        <strong class="comment-author">${name}</strong>
                        <span class="comment-date" style="font-size: 0.8rem; color: #888; margin-left: 0.5rem;">${dateStr}</span>
                    </p>
                    <p class="comment-text" style="margin: 0.5rem 0;">${escapeHtml(comment.content)}</p>
                    
                    <div class="comment-actions">
                        <button class="comment-reply-btn" style="background: none; border: none; color: #1a73e8; cursor: pointer; padding: 0; font-size: 0.9rem;">Trả lời</button>
                        ${deleteBtnHtml}
                    </div>
                    
                    <div class="reply-form" id="reply-form-${comment.id}">
                        <textarea placeholder="Viết phản hồi..." style="width: 100%; margin-top: 0.5rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;"></textarea>
                        <button class="send-reply-btn" data-parent="${comment.id}" style="margin-top: 0.5rem; padding: 0.3rem 1rem; background: #1a73e8; color: white; border: none; border-radius: 4px; cursor: pointer;">Gửi</button>
                    </div>

                    <div class="comment-replies" id="replies-${comment.id}">
                        ${comment.replies ? comment.replies.map(reply => createReplyHtml(reply)).join('') : ''}
                    </div>
                </div>
            </div>
        `;

        const replyBtn = div.querySelector('.comment-reply-btn');
        const replyForm = div.querySelector('.reply-form');
        replyBtn.addEventListener('click', async () => {
            const isLoggedIn = await requireLogin();
            if (!isLoggedIn) return;
            replyForm.style.display = replyForm.style.display === 'block' ? 'none' : 'block';
        });

        const delBtn = div.querySelector('.delete-comment-btn');
        if (delBtn) {
            delBtn.addEventListener('click', async () => {
                if (confirm('Bạn có chắc muốn xóa bình luận này?')) {
                    await deleteCommentApi(comment.id, div);
                }
            });
        }

        const sendReplyBtn = div.querySelector('.send-reply-btn');
        sendReplyBtn.addEventListener('click', async () => {
            const replyTextarea = replyForm.querySelector('textarea');
            const content = replyTextarea.value.trim();
            if (!content) return;

            try {
                const response = await fetch(`/api/posts/${postSlug}/comments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content, parentId: comment.id })
                });
                const result = await response.json();
                if (result.success) {
                    replyTextarea.value = '';
                    replyForm.style.display = 'none';
                    showToast('Đã gửi phản hồi!', 'success');
                    appendReply(comment.id, result.comment);
                    updateCommentCount(1);
                } else {
                    showToast(result.message, 'error');
                }
            } catch (err) {
                showToast('Lỗi khi gửi phản hồi', 'error');
            }
        });

        const existingReplyDelBtns = div.querySelectorAll('.delete-reply-btn');
        existingReplyDelBtns.forEach(btn => {
            btn.addEventListener('click', async function() {
                const replyId = this.dataset.id;
                const replyDiv = document.getElementById(`comment-${replyId}`);
                if (confirm('Bạn có chắc muốn xóa phản hồi này?')) {
                    await deleteCommentApi(replyId, replyDiv, true);
                }
            });
        });

        return div;
    }

    function createReplyHtml(reply) {
        let deleteBtnHtml = '';
        if (window.currentUser && String(window.currentUser.id) === String(reply.userId)) {
            deleteBtnHtml = `<button class="delete-reply-btn" data-id="${reply.id}" style="background: none; border: none; color: #dc3545; cursor: pointer; padding: 0; font-size: 0.85rem; margin-left: 10px;">Xóa</button>`;
        }
        
        return `
            <div class="comment-item" id="comment-${reply.id}" style="border: none; padding: 0.5rem 0;">
                <div style="display: flex; gap: 0.8rem;">
                    <img src="${reply.User?.avatarUrl || '/photos/placeholder-m6a0q.png'}" class="comment-author-avatar" style="width: 32px; height: 32px;">
                    <div style="flex: 1;">
                        <p><strong>${reply.User?.name || 'Người dùng'}</strong> <span style="font-size: 0.75rem; color: #888;">${new Date(reply.createdAt).toLocaleString('vi-VN')}</span></p>
                        <p style="margin-top: 0.2rem;">${escapeHtml(reply.content)}</p>
                        ${deleteBtnHtml}
                    </div>
                </div>
            </div>
        `;
    }

    async function deleteCommentApi(id, element, isReply = false) {
        try {
            const response = await fetch(`/api/posts/${postSlug}/comments/${id}`, {
                method: 'DELETE'
            });
            const result = await response.json();
            if (result.success) {
                showToast('Đã xóa bình luận', 'success');
                element.remove();
                updateCommentCount(-1);
            } else {
                showToast(result.message, 'error');
            }
        } catch (error) {
            showToast('Lỗi khi xóa bình luận', 'error');
        }
    }

    function prependComment(comment) {
        const noComments = commentList.querySelector('.no-comments');
        if (noComments) noComments.remove();
        
        const el = createCommentElement(comment);
        commentList.insertBefore(el, commentList.firstChild);
    }

    function appendReply(parentId, reply) {
        const repliesContainer = document.getElementById(`replies-${parentId}`);
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = createReplyHtml(reply);
        const replyHtml = tempDiv.firstElementChild;

        const delBtn = replyHtml.querySelector('.delete-reply-btn');
        if (delBtn) {
            delBtn.addEventListener('click', async () => {
                if (confirm('Bạn có chắc muốn xóa phản hồi này?')) {
                    await deleteCommentApi(reply.id, replyHtml, true);
                }
            });
        }

        repliesContainer.appendChild(replyHtml);
    }

    function updateCommentCount(delta) {
        const current = parseInt(commentCountText.textContent.match(/\d+/)[0]);
        commentCountText.textContent = `Bình luận (${current + delta})`;
    }

    async function requireLogin() {
        if (window.currentUser) return true;
        try {
            const response = await fetch('/login');
            if (response.ok) {
                const data = await response.json();
                if (data && data.id) {
                    window.currentUser = data;
                    return true;
                }
            }
        } catch (e) {
            console.log('Session check failed', e);
        }

        const dialog = document.getElementById('dialog');
        if (dialog) {
            dialog.showModal();
        } else {
            alert('Vui lòng đăng nhập để thực hiện chức năng này!');
            window.location.href = '/?login=true';
        }
        return false;
    }

    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            color: white;
            z-index: 9999;
            background: ${type === 'success' ? '#28a745' : '#dc3545'};
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideIn 0.3s forwards;
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    function escapeHtml(text) {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn { from { transform: translateX(120%); } to { transform: translateX(0); } }
        @keyframes slideOut { from { transform: translateX(0); } to { transform: translateX(120%); } }
        .star.filled { color: #f6ad55; }
        .star.half { position: relative; display: inline-block; }
        .star.half:after { content: '★'; position: absolute; left: 0; top: 0; width: 50%; overflow: hidden; color: #f6ad55; }
    `;
    document.head.appendChild(style);
});