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
                    // updateViewsUI(data.views); // Mock-test: Disable real view update
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
                // updateRatingUI(data.avgScore, data.totalRatings); // Mock-test: Disable real rating UI update
                // if (data.views) updateViewsUI(data.views);        // Mock-test: Disable real view update

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

        const emptyStarSVG = '<span class="star"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="transparent" stroke="#f6ad55" stroke-width="1" style="overflow: visible;" class="bi bi-star-fill" viewBox="0 0 16 16"><path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/></svg></span>';
        const fullStarSVG = '<span class="star filled"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#f6ad55" stroke="none" style="overflow: visible;" class="bi bi-star-fill" viewBox="0 0 16 16"><path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/></svg></span>';

        for (let i = 1; i <= 5; i++) {
            if (i <= fullStars) starsHTML += fullStarSVG;
            else if (i === fullStars + 1 && hasHalf) starsHTML += '<span class="star half">★</span>';
            else starsHTML += emptyStarSVG;
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
                    startStatusPolling();
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
            } else {
                commentList.innerHTML = `<p class="error-text">Lỗi: ${escapeHtml(data.message || 'Không thể tải bình luận')}</p>`;
            }
        } catch (error) {
            console.error('Load comments error:', error);
            commentList.innerHTML = `<p class="error-text">Không thể tải bình luận. (${escapeHtml(error.message)})</p>`;
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
        div.dataset.status = comment.status;
        
        const dateStr = new Date(comment.createdAt).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' });
        const avatar = comment.User?.avatarUrl || '/photos/placeholder-m6a0q.png';
        const name = comment.User?.name || 'Người dùng';
        
        let deleteBtnHtml = '';
        if (window.currentUser && String(window.currentUser.id) === String(comment.userId)) {
            deleteBtnHtml = `<button class="delete-comment-btn" data-id="${comment.id}" style="background: none; border: none; color: #dc3545; cursor: pointer; padding: 0; font-size: 0.9rem; margin-left: 10px;">Xóa</button>`;
        }

        // OPTIMISTIC UI: Pending comments look approved initially.
        let pendingLabel = '';
        if (comment.status === 'flagged') {
            pendingLabel = '<span style="font-size: 0.75rem; color: #dc3545; background: #f8d7da; padding: 2px 6px; border-radius: 4px; margin-left: 8px;">Đang chờ phê duyệt</span>';
        }
        
        div.innerHTML = `
            <div style="display: flex; gap: 1rem;">
                <img src="${avatar}" alt="${name}" class="comment-author-avatar">
                <div class="comment-content" style="flex: 1;">
                    <p>
                        <strong class="comment-author">${name}</strong>
                        ${pendingLabel}
                        <span class="comment-date" style="font-size: 0.8rem; color: #888; margin-left: 0.5rem;">${dateStr}</span>
                    </p>
                    <p class="comment-text" style="margin: 0.5rem 0;">${escapeHtml(comment.content)}</p>
                    
                    <div class="comment-actions">
                        <button class="comment-reply-btn" style="background: none; border: none; color: #1a73e8; cursor: pointer; padding: 0; font-size: 0.9rem;">Trả lời</button>
                        <button class="report-comment-btn" data-id="${comment.id}" style="background: none; border: none; color: #6c757d; cursor: pointer; padding: 0; font-size: 0.9rem; margin-left: 10px;">Báo cáo</button>
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

        const replyToReplyBtns = div.querySelectorAll('.reply-to-reply-btn');
        replyToReplyBtns.forEach(btn => {
            btn.addEventListener('click', async () => {
                const isLoggedIn = await requireLogin();
                if (!isLoggedIn) return;
                const parentId = btn.dataset.parentId;
                const form = document.getElementById(`reply-form-${parentId}`);
                if (form) {
                    form.style.display = form.style.display === 'block' ? 'none' : 'block';
                    if (form.style.display === 'block') {
                        form.querySelector('textarea')?.focus();
                    }
                }
            });
        });

        const replyBtn = div.querySelector('.comment-reply-btn');
        const replyForm = div.querySelector('.reply-form');
        replyBtn.addEventListener('click', async () => {
            const isLoggedIn = await requireLogin();
            if (!isLoggedIn) return;
            replyForm.style.display = replyForm.style.display === 'block' ? 'none' : 'block';
        });

        const reportBtn = div.querySelector('.report-comment-btn');
        if (reportBtn) {
            reportBtn.addEventListener('click', async () => {
                await handleReport(comment.id);
            });
        }

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
                    startStatusPolling();
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

        // OPTIMISTIC UI: Pending replies look approved initially.
        let pendingLabel = '';
        if (reply.status === 'flagged') {
            pendingLabel = '<span style="font-size: 0.75rem; color: #dc3545; background: #f8d7da; padding: 2px 6px; border-radius: 4px; margin-left: 8px;">Đang chờ phê duyệt</span>';
        }

        // Note: report-reply-btn needs listener binding in appendReply or re-render
        // Here we just return HTML string, so listeners must be delegated or bound after insertion.
        // For simplicity in this structure, we'll bind via event delegation on container or finding elements after inject.
        // But since this returns a string, we can't easily bind.
        // FIX: Change logic to bind after HTML injection in createCommentElement or appendReply.
        
        return `
            <div class="comment-item" id="comment-${reply.id}" data-status="${reply.status}" style="border: none; padding: 0.5rem 0;">
                <div style="display: flex; gap: 0.8rem;">
                    <img src="${reply.User?.avatarUrl || '/photos/placeholder-m6a0q.png'}" class="comment-author-avatar" style="width: 32px; height: 32px;">
                    <div style="flex: 1;">
                        <p>
                            <strong>${reply.User?.name || 'Người dùng'}</strong> 
                            ${pendingLabel}
                            <span style="font-size: 0.75rem; color: #888;">${new Date(reply.createdAt).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                        </p>
                        <p style="margin-top: 0.2rem;">${escapeHtml(reply.content)}</p>
                        <div class="comment-actions">
                            <button class="reply-to-reply-btn" data-parent-id="${reply.parentId}" style="background: none; border: none; color: #1a73e8; cursor: pointer; padding: 0; font-size: 0.85rem;">Trả lời</button>
                            <button class="report-reply-btn" onclick="handleReport(${reply.id})" style="background: none; border: none; color: #6c757d; cursor: pointer; padding: 0; font-size: 0.85rem; margin-left: 10px;">Báo cáo</button>
                            ${deleteBtnHtml}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Expose handleReport globally so onclick works (simplest fix for HTML string injection)
    window.handleReport = async function(commentId) {
        const isLoggedIn = await requireLogin();
        if (!isLoggedIn) return;

        const reason = prompt('Vui lòng nhập lý do báo cáo (ví dụ: thù địch, spam...):');
        if (!reason) return;

        try {
            const response = await fetch('/api/comments/report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ commentId, reason })
            });
            const result = await response.json();
            if (result.success) {
                showToast(result.message, 'success');
            } else {
                showToast(result.message, 'error');
            }
        } catch (e) {
            showToast('Lỗi kết nối', 'error');
        }
    };

    async function deleteCommentApi(id, element, isReply = false) {
        try {
            const response = await fetch(`/api/posts/${postSlug}/comments/${id}`, {
                method: 'DELETE'
            });
            const result = await response.json();
            if (result.success) {
                showToast('Đã xóa bình luận', 'success');
                element.remove();
                if (!isReply) updateCommentCount(-1);
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
        commentCountText.textContent = `Bình luận (${Math.max(0, current + delta)})`;
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
        console.log('Showing toast:', message, type); 

        // 1. Icons SVG
        const icons = {
            success: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #28a745;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
            error: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #dc3545;"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
            warning: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #ffc107;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`
        };

        const titles = {
            success: 'Thành công',
            error: 'Lỗi',
            warning: 'Cảnh báo'
        };

        // 2. Create Toast Container
        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;
        
        // 3. Inner HTML Structure
        toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-icon">
                    ${icons[type] || icons.success}
                </div>
                <div class="toast-text">
                    <h4 class="toast-title">${titles[type] || 'Thông báo'}</h4>
                    <p class="toast-message">${escapeHtml(message)}</p>
                </div>
                <div class="toast-close" onclick="this.parentElement.parentElement.remove()">
                    &times;
                </div>
            </div>
            <div class="toast-progress"></div>
        `;

        // 4. Styles
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            min-width: 300px;
            max-width: 400px;
            background: #fff;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            padding: 0;
            overflow: hidden;
            z-index: 2147483647;
            animation: slideIn 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
            font-family: 'Montserrat', sans-serif;
            border-left: 4px solid ${type === 'success' ? '#28a745' : (type === 'error' ? '#dc3545' : '#ffc107')};
        `;

        // Add inner styles for children (scoped by unique class name to avoid conflicts)
        const contentStyle = `
            .toast-notification .toast-content {
                display: flex;
                align-items: flex-start;
                padding: 16px;
            }
            .toast-notification .toast-icon {
                margin-right: 12px;
                display: flex;
                align-items: center;
                height: 20px; /* Align with title */
            }
            .toast-notification .toast-text {
                flex: 1;
            }
            .toast-notification .toast-title {
                margin: 0 0 4px 0;
                font-size: 16px;
                font-weight: 600;
                color: #333;
            }
            .toast-notification .toast-message {
                margin: 0;
                font-size: 14px;
                color: #666;
                line-height: 1.4;
            }
            .toast-notification .toast-close {
                margin-left: 12px;
                cursor: pointer;
                font-size: 20px;
                color: #999;
                line-height: 1;
            }
            .toast-notification .toast-close:hover {
                color: #333;
            }
            .toast-notification .toast-progress {
                height: 3px;
                width: 100%;
                background-color: ${type === 'success' ? '#28a745' : (type === 'error' ? '#dc3545' : '#ffc107')};
                animation: progress 4s linear forwards;
            }
            @keyframes progress {
                from { width: 100%; }
                to { width: 0%; }
            }
        `;
        
        // Inject styles dynamically
        const styleId = 'toast-style-dynamic';
        if (!document.getElementById(styleId)) {
            const s = document.createElement('style');
            s.id = styleId;
            s.textContent = contentStyle;
            document.head.appendChild(s);
        }

        document.body.appendChild(toast);

        // Auto remove
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s forwards';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
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

    // --- 4. Polling Status ---
    let pollingInterval = null;
    let pollCount = 0;
    
    function startStatusPolling() {
        if (pollingInterval) clearInterval(pollingInterval);
        pollCount = 0;
        
        // Poll every 3 seconds for 10 times (30s total)
        pollingInterval = setInterval(async () => {
            pollCount++;
            await updatePendingComments();
            
            if (pollCount >= 10) {
                clearInterval(pollingInterval);
                pollingInterval = null;
            }
        }, 3000);
    }

    async function updatePendingComments() {
        const pendingEls = document.querySelectorAll('.comment-item[data-status="pending"]');
        if (pendingEls.length === 0) {
            if (pollingInterval) clearInterval(pollingInterval);
            return;
        }

        try {
            const response = await fetch(`/api/posts/${postSlug}/comments`);
            const data = await response.json();
            
            if (data.success) {
                const commentsMap = new Map();
                
                // Flatten comments and replies for easy lookup
                const traverse = (list) => {
                    list.forEach(c => {
                        commentsMap.set(String(c.id), c);
                        if (c.replies) traverse(c.replies);
                    });
                };
                traverse(data.comments);

                pendingEls.forEach(el => {
                    const id = el.id.replace('comment-', '');
                    const commentData = commentsMap.get(id);
                    
                    if (commentData && commentData.status !== 'pending') {
                        // Update status attribute
                        el.dataset.status = commentData.status;
                        
                        // Update UI Label
                        // Find the label span (it has background color style)
                        const labelSpan = el.querySelector('span[style*="background"]');
                        
                        if (commentData.status === 'approved') {
                            if (labelSpan) labelSpan.remove();
                        } else if (commentData.status === 'flagged') {
                            // Changed from pending to flagged -> Show Warning Toast
                            showToast('Bình luận của bạn có nội dung nhạy cảm và đang chờ phê duyệt.', 'warning');
                            
                            if (labelSpan) {
                                labelSpan.textContent = 'Đang chờ phê duyệt';
                                labelSpan.style.color = '#dc3545';
                                labelSpan.style.background = '#f8d7da';
                            } else {
                                // If label was hidden (optimistic), add it now
                                const authorEl = el.querySelector('.comment-author') || el.querySelector('strong'); // Strong tag for name
                                if (authorEl) {
                                    const newLabel = document.createElement('span');
                                    newLabel.style.cssText = 'font-size: 0.75rem; color: #dc3545; background: #f8d7da; padding: 2px 6px; border-radius: 4px; margin-left: 8px;';
                                    newLabel.textContent = 'Đang chờ phê duyệt';
                                    authorEl.insertAdjacentElement('afterend', newLabel);
                                }
                            }
                        }
                    }
                });
            }
        } catch (e) {
            console.error('Polling error', e);
        }
    }
});