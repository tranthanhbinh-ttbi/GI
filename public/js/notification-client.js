/**
 * Notification Client
 * Connects to SSE stream and handles Toast UI
 */

(function() {
    const streamUrl = '/api/notifications/stream';
    let evtSource;
    const reconnectInterval = 5000;

    function connect() {
        evtSource = new EventSource(streamUrl);

        evtSource.onmessage = function(event) {
            try {
                const data = JSON.parse(event.data);
                showToast(data);
                updateNotificationBadge();
            } catch (e) {
                console.error('Error parsing notification data', e);
            }
        };

        evtSource.onerror = function(err) {
            console.error('EventSource failed:', err);
            evtSource.close();
            setTimeout(connect, reconnectInterval);
        };
    }

    function showToast(notification) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${notification.type || 'info'} show`;
        
        let icon = '<i class="fa-solid fa-bell"></i>'; // Default
        if (notification.type === 'new_post') icon = '<i class="fa-solid fa-newspaper"></i>';
        if (notification.type === 'success') icon = '<i class="fa-solid fa-check-circle"></i>';

        toast.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <div class="toast-content">
                <div class="toast-title">${notification.title}</div>
                <div class="toast-message">${notification.message}</div>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
        `;

        // Click to go to link
        if (notification.link) {
            toast.style.cursor = 'pointer';
            toast.onclick = (e) => {
                if (!e.target.classList.contains('toast-close')) {
                    window.location.href = notification.link;
                }
            };
        }

        container.appendChild(toast);

        // Auto remove after 5 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            toast.classList.add('hide');
            setTimeout(() => toast.remove(), 500); // Wait for animation
        }, 5000);
    }

    function updateNotificationBadge() {
        // Logic to update badge count if existing
        const badge = document.querySelector('.notif-badge');
        if (badge) {
            let count = parseInt(badge.getAttribute('data-count') || '0');
            count++;
            badge.innerText = count > 99 ? '99+' : count;
            badge.setAttribute('data-count', count);
            badge.style.display = 'flex';
        }
    }

    async function fetchInitialCount() {
        try {
            // Fetch recent notifications to set initial badge count (e.g., notifications from today)
            const response = await fetch('/api/notifications?limit=20');
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data) {
                    // Count notifications created within last 24h
                    const now = new Date();
                    const oneDayAgo = new Date(now - 86400000);
                    const count = data.data.filter(n => new Date(n.createdAt) > oneDayAgo).length;
                    
                    const badge = document.querySelector('.notif-badge');
                    if (badge) {
                        if (count > 0) {
                            badge.innerText = count > 99 ? '99+' : count;
                            badge.setAttribute('data-count', count);
                            badge.style.display = 'flex';
                        } else {
                            badge.style.display = 'none';
                            badge.setAttribute('data-count', 0);
                        }
                    }
                }
            }
        } catch (e) {
            console.error('Error fetching initial notification count', e);
        }
    }

    // Initialize
    if (window.EventSource) {
        connect();
        fetchInitialCount();
    } else {
        console.warn('Your browser does not support Server-Sent Events.');
    }
})();
