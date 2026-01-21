
window.initSpotlight = function initSpotlight() {
    // Spotlight Logic
    const spotlightOverlay = document.getElementById('spotlight-overlay');
    const spotlightInput = document.getElementById('spotlight-input');
    const spotlightClose = document.getElementById('spotlight-close');
    const spotlightResults = document.getElementById('spotlight-results');
    const spotlightVoice = document.getElementById('spotlight-voice');
    const spTabs = document.querySelectorAll('.sp-tab');
    const spGroups = document.querySelectorAll('.sp-filter-group');

    // Populate Authors
    const authorSelect = document.getElementById('sp-author-select');
    if (authorSelect) {
        fetch('/api/search/authors')
            .then(res => res.json())
            .then(authors => {
                authors.forEach(author => {
                    const option = document.createElement('option');
                    option.value = author;
                    option.textContent = author;
                    authorSelect.appendChild(option);
                });
            })
            .catch(err => console.error('Failed to load authors:', err));
    }

    // Move overlay to body to ensure z-index covers fixed header
    if (spotlightOverlay && spotlightOverlay.parentElement !== document.body) {
        document.body.appendChild(spotlightOverlay);
    }

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
        const trigger = e.target.closest('.search-bar-wrapper') || e.target.closest('.search-trigger-btn');
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

    // Search & Filters Logic
    if (spotlightInput) {
        let debounceTimeout;

        const performSearch = async () => {
            const query = spotlightInput.value.trim();
            spotlightResults.innerHTML = '<div class="sp-helper-text">Đang tìm kiếm...</div>';

            try {
                // Collect filters
                const activeTab = document.querySelector('.sp-tab.active');
                let params = new URLSearchParams();
                if (query.length > 0) params.append('q', query);

                let hasFilters = false;

                if (activeTab) {
                    const targetId = activeTab.getAttribute('data-target');
                    let type = 'all';
                    if (targetId === 'sp-series') type = 'series';
                    else if (targetId === 'sp-news') type = 'news';

                    if (type !== 'all') {
                        params.append('type', type);
                        hasFilters = true;
                    }

                    const activeGroup = document.getElementById(targetId);
                    if (activeGroup) {
                        const inputs = activeGroup.querySelectorAll('input, select');
                        inputs.forEach(input => {
                            if (input.name && input.value && input.value !== 'all') {
                                params.append(input.name, input.value);
                                hasFilters = true;
                            }
                        });
                    }
                }

                if (query.length === 0 && !hasFilters) {
                    spotlightResults.innerHTML = '<div class="sp-helper-text">Nhập từ khóa để tìm kiếm nội dung...</div>';
                    return;
                }

                const response = await fetch(`/api/search?${params.toString()}`);
                if (!response.ok) throw new Error('Search failed');

                const results = await response.json();

                if (results.length === 0) {
                    spotlightResults.innerHTML = '<div class="sp-helper-text">Không tìm thấy kết quả nào.</div>';
                    return;
                }

                function escapeHtml(text) {
                    if (!text) return '';
                    return String(text)
                        .replace(/&/g, "&amp;")
                        .replace(/</g, "&lt;")
                        .replace(/>/g, "&gt;")
                        .replace(/"/g, "&quot;")
                        .replace(/'/g, "&#039;");
                }

                let html = '';
                results.forEach(item => {
                    const safeTitle = escapeHtml(item.title);
                    const safeType = escapeHtml(item.type === 'series' ? 'Series' : (item.type === 'news' ? 'Tin tức' : 'Khám phá'));

                    let formattedDate = '';
                    if (item.date) {
                        const d = new Date(item.date);
                        formattedDate = `${d.getDate()} Tháng ${d.getMonth() + 1}, ${d.getFullYear()}`;
                    }

                    const rating = (item.rating !== undefined && item.rating !== null) ? item.rating : '5.0';
                    const ratingCount = (item.ratingCount !== undefined && item.ratingCount !== null) ? item.ratingCount : '0';

                    html += `
                        <a href="${item.url}" class="sp-item-link" style="text-decoration: none; color: inherit; display: block;">
                            <div class="sp-item">
                                <img src="${item.thumbnail}" alt="${safeTitle}" onerror="this.src='/photos/placeholder-m6a0q.png'">
                                <div class="sp-info">
                                    <div class="sp-meta">
                                        <span>${safeType}</span>
                                        <span class="separator">/</span>
                                        <span><span class="star">★</span> ${rating} (${ratingCount})</span>
                                        <span class="separator">/</span>
                                        <span>${formattedDate}</span>
                                    </div>
                                    <div class="sp-title">${safeTitle}</div>
                                </div>
                            </div>
                        </a>
                        `;
                });
                spotlightResults.innerHTML = html;

            } catch (error) {
                console.error('Search error:', error);
                spotlightResults.innerHTML = '<div class="sp-helper-text">Đã xảy ra lỗi khi tìm kiếm.</div>';
            }
        };

        const debouncedSearch = () => {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(performSearch, 300);
        };

        spotlightInput.addEventListener('input', debouncedSearch);

        // Add listeners to all filter inputs
        const filterInputs = document.querySelectorAll('.sp-filter-group input, .sp-filter-group select');
        filterInputs.forEach(input => {
            input.addEventListener('change', performSearch);
            if (input.tagName === 'INPUT' && input.type === 'text') {
                input.addEventListener('input', debouncedSearch);
            }
        });

        // Tab Switching Logic
        spTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                spTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                spGroups.forEach(group => group.classList.add('hidden'));

                const targetId = tab.getAttribute('data-target');
                const targetGroup = document.getElementById(targetId);
                if (targetGroup) targetGroup.classList.remove('hidden');

                spotlightInput.focus();
                performSearch();
            });
        });
    }

    // Voice Search
    if (spotlightVoice) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.lang = 'vi-VN';
            recognition.interimResults = false;

            let originalPlaceholder = '';

            const startListening = () => {
                if (spotlightInput) {
                    originalPlaceholder = spotlightInput.getAttribute('placeholder');
                    spotlightInput.setAttribute('placeholder', 'Đang nghe...');
                    spotlightInput.value = ''; // Clear input to show placeholder
                }
                spotlightVoice.classList.add('active');
                recognition.start();
            };

            const stopListening = () => {
                if (spotlightInput) {
                    spotlightInput.setAttribute('placeholder', originalPlaceholder);
                }
                spotlightVoice.classList.remove('active');
            };

            spotlightVoice.addEventListener('click', () => {
                if (spotlightVoice.classList.contains('active')) {
                    recognition.stop();
                } else {
                    startListening();
                }
            });

            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                if (spotlightInput) {
                    spotlightInput.value = transcript;
                    spotlightInput.dispatchEvent(new Event('input'));
                    spotlightInput.focus();
                }
                stopListening();
            };

            recognition.onend = () => {
                stopListening();
            };

            recognition.onerror = (event) => {
                console.error('Voice search error:', event.error);
                stopListening();
            };
        } else {
            spotlightVoice.style.display = 'none';
        }
    }

    // Date Selects
    const dateSelects = document.querySelectorAll('.sp-date-select');
    dateSelects.forEach(select => {
        select.addEventListener('change', (e) => {
            if (e.target.value === 'custom') {
                const dateInput = e.target.nextElementSibling;
                if (dateInput && dateInput.type === 'date') {
                    try {
                        dateInput.showPicker();
                    } catch (err) {
                        dateInput.focus();
                        dateInput.click();
                    }
                }
            }
        });
    });
}
