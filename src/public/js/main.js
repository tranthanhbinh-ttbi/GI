document.addEventListener('DOMContentLoaded', async () => {
    // Import optional addons
    await import("./module/components/app-addons.js").then((module) => {
        if (window.appAddons) window.appAddons();
    }).catch(err => console.log("Addons not found or failed to load", err));

    // Elements
    const filterToggle = document.getElementById('filter-toggle');
    const filterMenu = document.getElementById('filter-dropdown-menu');
    const mainKeywordInput = document.getElementById('main-keyword-input');
    const searchSuggestions = document.getElementById('search-suggestions');
    const clearSearchBtn = document.getElementById('clear-search');
    const filterTabs = document.querySelectorAll('.filter-tab');
    const filterGroups = document.querySelectorAll('.filter-group');
    const applyFilterBtn = document.getElementById('apply-filter-search');

    // 1. Filter Menu Toggle
    if (filterToggle && filterMenu) {
        filterToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            filterMenu.classList.toggle('hidden');
            searchSuggestions.classList.add('hidden'); // Hide suggestions when opening filter
        });
    }

    // 2. Filter Tabs Switching
    filterTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            // Remove active class from all tabs
            filterTabs.forEach(t => t.classList.remove('active'));
            // Add active class to clicked tab
            tab.classList.add('active');

            // Hide all filter groups
            filterGroups.forEach(group => group.classList.add('hidden'));

            // Show target filter group
            const targetId = tab.getAttribute('data-target');
            const targetGroup = document.getElementById(targetId);
            if (targetGroup) {
                targetGroup.classList.remove('hidden');
            }
        });
    });

    // 3. Search Suggestions (Mock Data)
    const mockSuggestions = [
        {
            type: 'Series',
            title: 'Hành trình vào vũ trụ: Những điều chưa biết',
            rating: 4.8,
            image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=100'
        },
        {
            type: 'Tin tức',
            title: 'Cập nhật công nghệ AI mới nhất 2024',
            author: 'TechDaily',
            image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=100'
        },
        {
            type: 'Khám phá',
            title: 'Văn hóa ẩm thực đường phố Việt Nam',
            date: '20/10/2025',
            image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=100'
        },
        {
            type: 'Series',
            title: 'Lịch sử văn minh nhân loại - Phần 1',
            rating: 4.5,
            image: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?auto=format&fit=crop&q=80&w=100'
        },
        {
            type: 'Series',
            title: 'Top 10 ngôn ngữ lập trình 2025',
            rating: 4.9,
            image: 'https://images.unsplash.com/photo-1542831371-d531d36971e6?auto=format&fit=crop&q=80&w=100'
        },
        {
            type: 'Tin tức',
            title: 'Sự kiện Google I/O Extended',
            author: 'Google Devs',
            image: 'https://images.unsplash.com/photo-1591115765373-5207764f72e7?auto=format&fit=crop&q=80&w=100'
        },
        {
            type: 'Khám phá',
            title: 'Du lịch bền vững: Xu hướng mới',
            date: '15/11/2025',
            image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&q=80&w=100'
        },
        {
            type: 'Series',
            title: 'Mastering React JS: Từ cơ bản đến nâng cao',
            rating: 4.7,
            image: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&q=80&w=100'
        }
    ];

    function renderSuggestions(query) {
        if (!query) return '';

        // Filter mock data (simple contain search)
        const lowerQuery = query.toLowerCase();
        // In a real app, you would fetch from API here. 
        // For now we just show all mock data if query is present to demonstrate the UI
        const filtered = mockSuggestions;

        if (filtered.length === 0) return '<div class="suggestion-section-title">Không tìm thấy kết quả</div>';

        let html = '<div class="suggestion-section-title">Gợi ý bài viết</div>';

        filtered.forEach(item => {
            html += `
                <div class="suggestion-item">
                    <img src="${item.image}" alt="${item.title}" class="suggestion-image">
                    <div class="suggestion-info">
                        <div class="suggestion-title">${item.title}</div>
                        <div class="suggestion-meta">
                            ${item.type === 'Series' ? `<span class="rating-star">★</span> ${item.rating} Rating` : ''}
                            ${item.type === 'Tin tức' ? `<span>${item.author}</span>` : ''}
                            ${item.type === 'Khám phá' ? `<span>${item.date}</span>` : ''}
                            <span style="opacity: 0.5">• ${item.type}</span>
                        </div>
                    </div>
                </div>
            `;
        });

        // Add Category suggestions for "wow" factor
        html += '<div class="suggestion-section-title" style="margin-top: 8px; border-top: 1px solid var(--gen-border); padding-top: 8px;">Danh mục phổ biến</div>';
        html += `
            <div class="suggestion-item">
               <div style="width: 40px; height: 40px; border-radius: 8px; background: var(--gen-mems); display: flex; align-items: center; justify-content: center; color: white;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M6 13c0 1.105-1.12 2-2.5 2S1 14.105 1 13c0-1.104 1.12-2 2.5-2s2.5.896 2.5 2m9-2c0 1.105-1.12 2-2.5 2s-2.5-.895-2.5-2 1.12-2 2.5-2 2.5.895 2.5 2"/></svg>
               </div>
               <div class="suggestion-info">
                   <div class="suggestion-title">Công nghệ & AI</div>
                   <div class="suggestion-meta">120 Bài viết</div>
               </div>
            </div>
             <div class="suggestion-item">
               <div style="width: 40px; height: 40px; border-radius: 8px; background: var(--gen-blue-400); display: flex; align-items: center; justify-content: center; color: white;">
                   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M2 1a1 1 0 0 0-1 1v4.5A1.5 1.5 0 0 0 2.5 8 1.5 1.5 0 0 0 1 9.5V14a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-4.5A1.5 1.5 0 0 0 13.5 8 1.5 1.5 0 0 0 15 6.5V2a1 1 0 0 0-1-1zm11 0v4.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5V1zm0 13h-9v-4.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 .5.5z"/></svg>
               </div>
               <div class="suggestion-info">
                   <div class="suggestion-title">Lịch sử & Văn hóa</div>
                   <div class="suggestion-meta">85 Bài viết</div>
               </div>
            </div>
        `;

        return html;
    }

    // Spotlight Logic
    const spotlightOverlay = document.getElementById('spotlight-overlay');

    // Move overlay to body to ensure z-index covers fixed header
    if (spotlightOverlay && spotlightOverlay.parentElement !== document.body) {
        document.body.appendChild(spotlightOverlay);
    }

    const spotlightInput = document.getElementById('spotlight-input');
    const spotlightClose = document.getElementById('spotlight-close');
    const headerSearchTrigger = document.getElementById('header-search-trigger');
    const spotlightResults = document.getElementById('spotlight-results');
    const spotlightVoice = document.getElementById('spotlight-voice');

    function toggleSpotlight(show) {
        if (show) {
            spotlightOverlay.classList.remove('hidden');
            setTimeout(() => {
                spotlightOverlay.classList.add('active');
                if (spotlightInput) spotlightInput.focus();
            }, 10);
            document.body.style.overflow = 'hidden';

            // Close mobile sidebar if open
            const mobileSidebar = document.getElementById('gen-mobile-sidebar');
            const mobileOverlay = document.getElementById('gen-mobile-overlay');
            if (mobileSidebar && mobileSidebar.classList.contains('active')) {
                mobileSidebar.classList.remove('active');
                if (mobileOverlay) mobileOverlay.classList.remove('active');
                // Also restore overflow if sidebar logic removed it, but we set it to hidden again for spotlight
                // It's fine since we want hidden for spotlight.
            }
        } else {
            spotlightOverlay.classList.remove('active');
            setTimeout(() => {
                spotlightOverlay.classList.add('hidden');
            }, 200);
            if (spotlightInput) spotlightInput.value = '';
            document.body.style.overflow = '';
        }
    }

    // Open from Triggers (Desktop & Mobile)
    document.addEventListener('click', (e) => {
        const trigger = e.target.closest('.search-bar-wrapper');
        if (trigger) {
            e.preventDefault();
            toggleSpotlight(true);
            const input = trigger.querySelector('input');
            if (input) input.blur();
        }
    });

    // Handle focus on trigger inputs
    document.addEventListener('focusin', (e) => {
        if (e.target.matches('.search-bar-wrapper input')) {
            e.preventDefault();
            toggleSpotlight(true);
            e.target.blur();
        }
    });

    // Close Actions
    if (spotlightClose) spotlightClose.addEventListener('click', () => toggleSpotlight(false));
    if (spotlightOverlay) {
        spotlightOverlay.addEventListener('click', (e) => {
            if (e.target === spotlightOverlay) toggleSpotlight(false);
        });
    }

    // Keydown shortcuts
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            toggleSpotlight(true);
        }
        if (e.key === '/') {
            const tag = e.target.tagName.toLowerCase();
            if (tag !== 'input' && tag !== 'textarea' && !e.target.isContentEditable) {
                e.preventDefault();
                toggleSpotlight(true);
            }
        }
        if (e.key === 'Escape') {
            if (spotlightOverlay && spotlightOverlay.classList.contains('active')) {
                toggleSpotlight(false);
            }
        }
    });

    // Spotlight Input Handling
    if (spotlightInput) {
        spotlightInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            if (query.length > 0) {
                const filtered = mockSuggestions;
                let html = '';
                filtered.forEach(item => {
                    html += `
                        <div class="sp-item">
                            <img src="${item.image}" alt="${item.title}">
                            <div class="sp-info">
                                <div class="sp-title">${item.title}</div>
                                <div class="sp-meta">
                                    ${item.type === 'Series' ? `<span>★ ${item.rating}</span>` : ''}
                                    ${item.type === 'Tin tức' ? `<span>${item.author}</span>` : ''}
                                    <span>${item.type}</span>
                                </div>
                            </div>
                        </div>
                     `;
                });
                if (filtered.length === 0) html = '<div class="sp-helper-text">Không tìm thấy kết quả</div>';
                spotlightResults.innerHTML = html;
            } else {
                spotlightResults.innerHTML = '<div class="sp-helper-text">Nhập từ khóa để tìm kiếm nội dung...</div>';
            }
        });
    }

    // Spotlight Tabs & Filters
    const spTabs = document.querySelectorAll('.sp-tab');
    const spGroups = document.querySelectorAll('.sp-filter-group');

    spTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // 1. Update Active Tab
            spTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // 2. Hide all groups
            spGroups.forEach(group => group.classList.add('hidden'));

            // 3. Show target group
            const targetId = tab.getAttribute('data-target');
            const targetGroup = document.getElementById(targetId);
            if (targetGroup) {
                targetGroup.classList.remove('hidden');
            }

            // Focus input again
            spotlightInput.focus();
        });
    });

    // Spotlight Voice Search
    if (spotlightVoice) {
        if ('webkitSpeechRecognition' in window) {
            const recognition = new webkitSpeechRecognition();
            recognition.continuous = false;
            recognition.lang = 'vi-VN';
            recognition.interimResults = false;

            spotlightVoice.addEventListener('click', () => {
                recognition.start();
                spotlightVoice.classList.add('active');
            });

            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                if (spotlightInput) {
                    spotlightInput.value = transcript;
                    spotlightInput.dispatchEvent(new Event('input'));
                    spotlightInput.focus();
                }
                spotlightVoice.classList.remove('active');
            };

            recognition.onspeechend = () => {
                recognition.stop();
                spotlightVoice.classList.remove('active');
            };

            recognition.onerror = () => {
                spotlightVoice.classList.remove('active');
            };
        } else {
            spotlightVoice.style.display = 'none';
        }
    }
});