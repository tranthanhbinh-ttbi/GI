document.addEventListener('DOMContentLoaded', function () {
    const ratingStars = document.querySelectorAll('.rating-stars svg');
    const currentRatingDisplay = document.querySelector('.current-rating .stars');
    let currentRating = 4.5;
    let totalRatings = 45;
    let userSelectedRating = 0;

    ratingStars.forEach((star, index) => {
        star.style.cursor = 'pointer';
        star.addEventListener('click', function () {
            const rating = index + 1;
            userSelectedRating = rating;
            updateRating(rating);
        });

        star.addEventListener('mouseenter', function () {
            highlightStars(index + 1);
        });
    });

    document.querySelector('.rating-stars').addEventListener('mouseleave', function () {
        highlightStars(0);
    });

    function highlightStars(rating) {
        ratingStars.forEach((star, index) => {
            if (index < rating) {
                star.style.fill = '#f6ad55';
                star.style.stroke = '#f6ad55';
                star.classList.add('active');
            } else {
                star.style.fill = 'none';
                star.style.stroke = '#f6ad55';
                star.classList.remove('active');
            }
        });
    }

    function updateRating(newRating) {
        const totalScore = currentRating * totalRatings + newRating;
        totalRatings += 1;
        currentRating = (totalScore / totalRatings).toFixed(1);

        const fullStars = Math.floor(currentRating);
        const hasHalfStar = currentRating % 1 >= 0.5;
        let starsHTML = '';

        for (let i = 0; i < fullStars; i++) {
            starsHTML += '★';
        }
        if (hasHalfStar && fullStars < 5) {
            starsHTML += '☆';
        }
        for (let i = fullStars + (hasHalfStar ? 1 : 0); i < 5; i++) {
            starsHTML += '☆';
        }

        currentRatingDisplay.textContent = starsHTML + ' ' + currentRating + ' trên 5 (' + totalRatings + ' đánh giá)';
        highlightStars(newRating);
        showRatingFeedback();
    }

    function showRatingFeedback() {
        const feedbackDiv = document.createElement('div');
        feedbackDiv.textContent = 'Cảm ơn bạn đã đánh giá!';
        feedbackDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #28a745;
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
        `;
        document.body.appendChild(feedbackDiv);
        setTimeout(() => {
            feedbackDiv.remove();
        }, 3000);
    }

    const shareButtons = document.querySelectorAll('.share-icon');
    const postTitle = document.querySelector('.post-title').textContent;
    const postUrl = window.location.href;

    shareButtons.forEach(button => {
        button.addEventListener('click', function (e) {
            e.preventDefault();
            const platform = this.classList[1];
            shareContent(platform, postTitle, postUrl);
        });
    });

    function shareContent(platform, title, url) {
        const encodedTitle = encodeURIComponent(title);
        const encodedUrl = encodeURIComponent(url);
        let shareUrl = '';

        switch (platform) {
            case 'facebook':
                shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
                break;
            case 'twitter':
                shareUrl = `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`;
                break;
            case 'linkedin':
                shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
                break;
            case 'pinterest':
                shareUrl = `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedTitle}`;
                break;
            case 'telegram':
                shareUrl = `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`;
                break;
            case 'email':
                shareUrl = `mailto:?subject=${encodedTitle}&body=Check out this article: ${encodedUrl}`;
                break;
        }

        if (shareUrl) {
            if (platform === 'email') {
                window.location.href = shareUrl;
            } else {
                window.open(shareUrl, '_blank', 'width=600,height=400');
            }
        }
    }

    const commentForm = document.querySelector('.comment-form');
    if (commentForm) {
        commentForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const textarea = this.querySelector('textarea');
            const emailInput = this.querySelector('input[type="text"]');
            const nameInput = this.querySelectorAll('input[type="text"]')[1];

            if (!textarea.value.trim()) {
                showCommentError('Vui lòng nhập bình luận của bạn.');
                return;
            }

            if (!emailInput.value.trim() || !nameInput.value.trim()) {
                showCommentError('Vui lòng nhập email và tên của bạn.');
                return;
            }

            submitComment(textarea.value, nameInput.value, emailInput.value);

            textarea.value = '';
            emailInput.value = '';
            nameInput.value = '';
            this.querySelectorAll('input[type="text"]')[2].value = '';

            showCommentSuccess();
        });
    }

    function submitComment(text, name, email) {
        const commentList = document.querySelector('.comment-list');
        const newComment = document.createElement('div');
        newComment.className = 'comment-item';
        newComment.innerHTML = `
            <img src="/photos/placeholder-m6a0q.png" alt="${name}">
            <div class="comment-content">
                <p><span class="comment-author">${name}</span><span class="comment-date">${new Date().toLocaleString('vi-VN')}</span></p>
                <p class="comment-text">${text}</p>
                <button class="comment-reply-btn">Reply</button>
            </div>
        `;

        commentList.insertBefore(newComment, commentList.firstChild);

        const commentsTitle = document.querySelector('.comments-title');
        const currentCount = parseInt(commentsTitle.textContent.match(/\d+/)[0]);
        commentsTitle.textContent = `Bình luận (${currentCount + 1})`;
    }

    function showCommentError(message) {
        showError(message);
    }

    function showCommentSuccess() {
        const successDiv = document.createElement('div');
        successDiv.textContent = 'Bình luận của bạn đã được gửi thành công!';
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #28a745;
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
        `;
        document.body.appendChild(successDiv);
        setTimeout(() => {
            successDiv.remove();
        }, 3000);
    }

    function showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #dc3545;
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
        `;
        document.body.appendChild(errorDiv);
        setTimeout(() => {
            errorDiv.remove();
        }, 3000);
    }

    const replyButtons = document.querySelectorAll('.comment-reply-btn');
    replyButtons.forEach(button => {
        button.addEventListener('click', function () {
            const commentContent = this.closest('.comment-content');
            const authorName = commentContent.querySelector('.comment-author').textContent;

            const commentForm = document.querySelector('.comment-form textarea');
            commentForm.focus();
            commentForm.value = `@${authorName} `;
        });
    });

    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);
});
