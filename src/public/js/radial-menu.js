window.initRadialMenus = function () {
    const wrappers = document.querySelectorAll('.share-wrapper');

    wrappers.forEach(wrapper => {
        if (wrapper.dataset.radialInit === 'true') return;
        wrapper.dataset.radialInit = 'true';

        // Xác định nút và chế độ xem (Card hay List)
        const cardBtn = wrapper.querySelector('.card-share-button');
        const listBtn = wrapper.querySelector('.slide-share-button');
        const btn = cardBtn || listBtn;

        const gridContainer = document.getElementById('series-grid-container') || document.getElementById('kham-pha-grid-container');

        const menu = wrapper.querySelector('.radial-share-menu');
        const track = wrapper.querySelector('.radial-track');
        const items = wrapper.querySelectorAll('.share-item');

        if (!btn || !menu || !track || items.length === 0) return;

        // State
        let isOpen = false;
        let currentRotation = 0;
        let isDragging = false;
        let startDragAngle = 0;
        let startRotation = 0;

        const isResearch = wrapper.closest('.research-layout') !== null;

        const isHeroSide = wrapper.classList.contains('hero-side-share');

        // Dynamic Configuration State
        let START_ANGLE_BASE = 0;
        let ANGLE_STEP = 0;

        // Layout Update Function
        function updateLayout() {
            const isMobile = window.innerWidth < 768;

            // Dynamic Configuration based on layout
            let MENU_SIZE = 260; // Default
            let RADIUS = 90;     // Default
            const ITEM_SIZE = 40;

            if (isResearch) {
                MENU_SIZE = 280;
                RADIUS = 105;
                if (isMobile) {
                    START_ANGLE_BASE = 273;
                    ANGLE_STEP = -60;
                } else {
                    START_ANGLE_BASE = 187;
                    ANGLE_STEP = -35;
                }
            } else if (isHeroSide) {
                // Hero Side (Top Right Cards)
                MENU_SIZE = 200; // Reduced from 250
                RADIUS = 60;     // Reduced from 80
                START_ANGLE_BASE = 277; // Slightly left of top
                ANGLE_STEP = -50;
            } else {
                START_ANGLE_BASE = 275;
                ANGLE_STEP = -45;
            }

            // Sync container size with logic
            menu.style.width = `${MENU_SIZE}px`;
            menu.style.height = `${MENU_SIZE}px`;

            items.forEach((item, index) => {
                const angleDeg = START_ANGLE_BASE + (index * ANGLE_STEP);
                const angleRad = angleDeg * (Math.PI / 180);

                const x = Math.cos(angleRad) * RADIUS;
                const y = Math.sin(angleRad) * RADIUS;

                const left = (MENU_SIZE / 2) + x - (ITEM_SIZE / 2);
                const top = (MENU_SIZE / 2) + y - (ITEM_SIZE / 2);

                item.style.left = `${left}px`;
                item.style.top = `${top}px`;
            });
        }

        // Helper function to get current config
        function getCurrentConfig() {
            if (isHeroSide) {
                return {
                    minRot: -5,
                    visibleEdge: 178
                };
            }

            if (isResearch) {
                const isMobile = window.innerWidth < 768;
                return isMobile ? {
                    minRot: -9,
                    visibleEdge: 95
                } : {
                    minRot: -3,
                    visibleEdge: 85
                };
            }

            if (gridContainer && gridContainer.classList.contains('view-list') && cardBtn) {
                // Responsive adjustment:
                // Mobile (width < 768px): Cards are very short (~90px), need aggressive scroll (-70).
                // Desktop (width >= 768px): Cards are taller (~200px), less scroll needed (-30).
                const isMobile = window.innerWidth < 768;

                return isMobile ? {
                    minRot: -70,
                    visibleEdge: 180
                } : {
                    minRot: -15,
                    visibleEdge: 180
                };
            }

            // Case 2: Hero Slide (slide-share-button)
            // Preserving original config which works for the large Hero banner
            if (listBtn) {
                return {
                    minRot: -5,
                    visibleEdge: 180
                };
            }

            // Case 3: Grid items in Card View Mode (Default)
            return {
                minRot: -5,
                visibleEdge: 180
            };
        }

        /*
        function getCurrentConfig() {
            // Case 1: Grid items in List View Mode
            // Requires aggressive negative rotation to bring top icons (Facebook at 275deg) 
            // down into the visible left/center area, as the card height clips the top.
            if (gridContainer && gridContainer.classList.contains('view-list') && cardBtn) {
                // Responsive adjustment:
                // Mobile (width < 768px): Cards are very short (~90px), need aggressive scroll (-70).
                // Desktop (width >= 768px): Cards are taller (~200px), less scroll needed (-30).
                const isMobile = window.innerWidth < 768;

                return isMobile ? {
                    minRot: -70,
                    visibleEdge: 180
                } : {
                    minRot: -15,
                    visibleEdge: 180
                };
            }

            // Case 2: Hero Slide (slide-share-button)
            // Preserving original config which works for the large Hero banner
            if (listBtn) {
                return {
                    minRot: -5,
                    visibleEdge: 180
                };
            }

            // Case 3: Grid items in Card View Mode (Default)
            return {
                minRot: -5,
                visibleEdge: 180
            };
        }
        
        */

        // Initial layout
        updateLayout();

        // Update on resize
        window.addEventListener('resize', () => {
            updateLayout();
        });

        // Toggle
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            isOpen = !isOpen;
            if (isOpen) {
                document.querySelectorAll('.share-wrapper').forEach(w => {
                    if (w !== wrapper) {
                        const otherMenu = w.querySelector('.radial-share-menu');
                        if (otherMenu) otherMenu.classList.remove('active');
                    }
                });
            }
            toggleMenu(isOpen);
        });

        function toggleMenu(open) {
            if (open) {
                menu.classList.add('active');
            } else {
                menu.classList.remove('active');
            }
        }

        window.addEventListener('click', (e) => {
            if (isOpen && !wrapper.contains(e.target)) {
                isOpen = false;
                toggleMenu(false);
            }
        });

        function render() {
            track.style.transform = `rotate(${currentRotation}deg)`;
            items.forEach(item => {
                item.style.transform = `rotate(${-currentRotation}deg)`;
            });
        }

        // --- Drag Logic ---
        function getCursorAngle(clientX, clientY) {
            const rect = menu.getBoundingClientRect();
            const cx = rect.left + (rect.width / 2);
            const cy = rect.top + (rect.height / 2);
            const dx = clientX - cx;
            const dy = clientY - cy;
            let deg = Math.atan2(dy, dx) * (180 / Math.PI);
            return deg;
        }

        function startDrag(e) {
            isDragging = true;
            const clientX = e.clientX || e.touches[0].clientX;
            const clientY = e.clientY || e.touches[0].clientY;
            startDragAngle = getCursorAngle(clientX, clientY);
            startRotation = currentRotation;
        }

        function moveDrag(e) {
            if (!isDragging) return;

            if (e.cancelable && e.type === 'touchmove') {
                e.preventDefault();
            }

            const clientX = e.clientX || (e.touches ? e.touches[0].clientX : 0);
            const clientY = e.clientY || (e.touches ? e.touches[0].clientY : 0);

            const currentAngle = getCursorAngle(clientX, clientY);
            let delta = currentAngle - startDragAngle;

            if (delta > 180) delta -= 360;
            if (delta < -180) delta += 360;

            currentRotation = startRotation + delta;

            // --- UPDATED BOUNDS LOGIC ---
            const lastItemAngle = START_ANGLE_BASE + ((items.length - 1) * ANGLE_STEP);

            const viewConfig = getCurrentConfig();

            // Sử dụng config động
            const minRot = viewConfig.minRot;

            // Tính toán maxRot dựa trên visibleEdge của từng chế độ
            let maxRot = viewConfig.visibleEdge - lastItemAngle;

            if (maxRot < minRot) maxRot = minRot;

            // Rubber band effect
            if (currentRotation < minRot) currentRotation = minRot - (minRot - currentRotation) * 0.2;
            if (currentRotation > maxRot) currentRotation = maxRot + (currentRotation - maxRot) * 0.2;

            render();
        }

        function endDrag() {
            if (!isDragging) return;
            isDragging = false;

            const lastItemAngle = START_ANGLE_BASE + ((items.length - 1) * ANGLE_STEP);

            const viewConfig = getCurrentConfig();
            const minRot = viewConfig.minRot;
            let maxRot = viewConfig.visibleEdge - lastItemAngle;

            if (maxRot < minRot) maxRot = minRot;

            if (currentRotation < minRot) {
                currentRotation = minRot;
                track.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                setTimeout(() => track.style.transition = '', 300);
            } else if (currentRotation > maxRot) {
                currentRotation = maxRot;
                track.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                setTimeout(() => track.style.transition = '', 300);
            }

            render();
        }

        track.addEventListener('mousedown', startDrag);
        track.addEventListener('touchstart', startDrag, { passive: false });

        window.addEventListener('mousemove', moveDrag);
        window.addEventListener('touchmove', moveDrag, { passive: false });

        window.addEventListener('mouseup', endDrag);
        window.addEventListener('touchend', endDrag);

        // --- Wheel Logic ---
        menu.addEventListener('wheel', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const sensitivity = 0.5;
            const delta = e.deltaY * sensitivity;

            currentRotation += delta;

            const lastItemAngle = START_ANGLE_BASE + ((items.length - 1) * ANGLE_STEP);

            // --- UPDATED BOUNDS LOGIC ---
            const viewConfig = getCurrentConfig();
            const minRot = viewConfig.minRot;
            let maxRot = viewConfig.visibleEdge - lastItemAngle;

            if (maxRot < minRot) maxRot = minRot;

            if (currentRotation < minRot) currentRotation = minRot;
            if (currentRotation > maxRot) currentRotation = maxRot;

            track.style.transition = 'none';
            render();
        }, { passive: false });
    });
};

window.initShareButtons = function () {

    const shareBtns = document.querySelectorAll('.share-action[data-platform]');

    shareBtns.forEach(btn => {

        if (btn.dataset.bound) return;

        btn.dataset.bound = true;



        btn.addEventListener('click', (e) => {

            e.preventDefault();

            e.stopPropagation();

            const platform = btn.dataset.platform;

            const slug = btn.dataset.slug;

            const title = btn.dataset.title;

            // Determine the prefix based on current path or data attribute

            let prefix = '/kham-pha/';

            if (window.location.pathname.startsWith('/series')) {

                prefix = '/series/';

            }

            if (btn.dataset.prefix) {

                prefix = btn.dataset.prefix;

            }



            const url = `${window.location.origin}${prefix}${slug}`;



            switch (platform) {

                case 'facebook':

                    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400');

                    break;

                case 'twitter':

                    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, '_blank', 'width=600,height=400');

                    break;

                case 'messenger':

                    const fbAppId = '1501202124127451';

                    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

                    if (isMobile) {

                        window.location.href = `fb-messenger://share/?link=${encodeURIComponent(url)}`;

                    } else {

                        window.open(`https://www.facebook.com/dialog/send?link=${encodeURIComponent(url)}&app_id=${fbAppId}&redirect_uri=${encodeURIComponent(url)}`, '_blank', 'width=1100,height=600');

                    }

                    break;

                case 'copy':

                    navigator.clipboard.writeText(url).then(() => {

                        if (window.appAddons && typeof window.showToast === 'function') {

                            window.showToast('Đã sao chép liên kết!', 'success');

                        } else {

                            alert('Đã sao chép liên kết: ' + url);

                        }

                    }).catch(() => {

                        console.error('Copy failed');

                    });

                    break;

            }

        });

    });

};



document.addEventListener('DOMContentLoaded', () => {

    if (window.initRadialMenus) window.initRadialMenus();

    if (window.initShareButtons) window.initShareButtons();

});