window.initRadialMenus = function () {
    const wrappers = document.querySelectorAll('.share-wrapper');

    wrappers.forEach(wrapper => {
        if (wrapper.dataset.radialInit === 'true') return;
        wrapper.dataset.radialInit = 'true';

        const btn = wrapper.querySelector('.card-share-button') || wrapper.querySelector('.slide-share-button');
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
        const RADIUS = 90; // Decreased radius for smaller menu
        // Angles in degrees. 0 is Right, -90 is Top, -180 is Left (standard math coordinates)
        // Since we are at bottom-right of the menu box which usually means (0,0) is bottom-right and we go negative x, negative y.
        // Actually since we used `transform-origin: bottom right` on the track, the coordinate system rotates around that point.
        // An element at `right: 0; bottom: 0` is at (0,0).
        // Let's assume we place items using `right` and `bottom` CSS or `transform`.
        // To arrange them in a fan from Top (-90 relative to center) to Left (-180 relative to center):
        // We want the FIRST item to be near the Top.
        // We want the LAST item to be near the Left.

        const START_ANGLE_BASE = 275; // Starting near Top (270deg in standard CD, or -90)
        // Wait, CSS rotation runs clockwise.
        // 0 deg = right (3 o'clock)
        // 270 deg = top (12 o'clock)
        // 180 deg = left (9 o'clock)

        // We want to fill the arc from 270 down to 180.
        // So steps should be negative.
        const ANGLE_STEP = -35;

        // Initial Placement
        const MENU_SIZE = 260; // Matches CSS
        const ITEM_SIZE = 44;

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
            
            // Stop page scroll while dragging menu
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
            const VISIBLE_START = 190;

            // Prevent the First Item (275) from moving down too much.
            const minRot = -5;

            // Prevent the Last Item from moving up too much (stop at bottom of view).
            // Target 180 deg (Left Edge).
            let maxRot = 180 - lastItemAngle;

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
            // const VISIBLE_START = 190;

            const minRot = -5;
            // Target 180 deg (Left Edge) to match Facebook's position relative to Top Edge.
            let maxRot = 180 - lastItemAngle;
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
            // const VISIBLE_START = 190;

            const minRot = -5;
            let maxRot = 180 - lastItemAngle;
            if (maxRot < minRot) maxRot = minRot;

            if (currentRotation < minRot) currentRotation = minRot;
            if (currentRotation > maxRot) currentRotation = maxRot;

            track.style.transition = 'none'; // Instant update
            render();
        }, { passive: false });
    });
};

document.addEventListener('DOMContentLoaded', () => {
    if (window.initRadialMenus) window.initRadialMenus();
});
