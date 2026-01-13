window.initRadialMenus = function () {
    const wrappers = document.querySelectorAll('.share-wrapper');

    wrappers.forEach(wrapper => {
        if (wrapper.dataset.radialInit === 'true') return;
        wrapper.dataset.radialInit = 'true';

        // Xác định nút và chế độ xem (Card hay List)
        const cardBtn = wrapper.querySelector('.card-share-button');
        const listBtn = wrapper.querySelector('.slide-share-button');
        const btn = cardBtn || listBtn;
        
        // --- NEW LOGIC: Xác định chế độ ---
        const isListView = !!listBtn; 

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

        // Configuration
        const RADIUS = 90; 
        const START_ANGLE_BASE = 275; 
        const ANGLE_STEP = -35;
        const MENU_SIZE = 260; 
        const ITEM_SIZE = 44;

        // --- NEW LOGIC: Cấu hình riêng cho từng chế độ ---
        // Bạn có thể tinh chỉnh các số này để đạt độ "sát khung" mong muốn
        const viewConfig = isListView ? {
            // Cấu hình cho LIST VIEW
            minRot: -15,      // Cho phép cuộn lên cao hơn một chút (số càng nhỏ càng cuộn được nhiều về phía trên)
            visibleEdge: 210  // Điểm giới hạn dưới. Tăng số này lên (ví dụ 200, 210) để cuộn được sâu hơn xuống dưới.
        } : {
            // Cấu hình cho CARD VIEW (Giữ nguyên như cũ vì bạn đã ưng ý)
            minRot: -5,
            visibleEdge: 180
        };

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
            
            // --- UPDATED BOUNDS LOGIC ---
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

document.addEventListener('DOMContentLoaded', () => {
    if (window.initRadialMenus) window.initRadialMenus();
});
