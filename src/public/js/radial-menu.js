window.initRadialMenus = function () {
    const wrappers = document.querySelectorAll('.share-wrapper');

    wrappers.forEach(wrapper => {
        if (wrapper.dataset.radialInit === 'true') return; // Prevent double init
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
            // angle in degrees
            const angleDeg = START_ANGLE_BASE + (index * ANGLE_STEP);
            const angleRad = angleDeg * (Math.PI / 180);

            // Calculate position relative to CENTER of the menu container
            // x = R * cos(theta)
            // y = R * sin(theta)

            const x = Math.cos(angleRad) * RADIUS;
            const y = Math.sin(angleRad) * RADIUS;

            // Center of container is (MENU_SIZE/2, MENU_SIZE/2)
            const left = (MENU_SIZE / 2) + x - (ITEM_SIZE / 2);
            const top = (MENU_SIZE / 2) + y - (ITEM_SIZE / 2);

            item.style.left = `${left}px`;
            item.style.top = `${top}px`;
        });

        // Toggle
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            isOpen = !isOpen;
            // Close others
            if (isOpen) {
                document.querySelectorAll('.share-wrapper').forEach(w => {
                    if (w !== wrapper) {
                        const otherMenu = w.querySelector('.radial-share-menu');
                        if (otherMenu) otherMenu.classList.remove('active');
                        // Reset rotation of others if needed, or just close them
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

        // Close on click outside
        window.addEventListener('click', (e) => {
            if (isOpen && !wrapper.contains(e.target)) {
                isOpen = false;
                toggleMenu(false);
            }
        });

        // Render rotation
        function render() {
            track.style.transform = `rotate(${currentRotation}deg)`;
            items.forEach(item => {
                // Counter rotate items so icons stay upright
                item.style.transform = `rotate(${-currentRotation}deg)`;
            });
        }

        // --- Drag Logic ---

        // Calculate angle between Menu Center and cursor
        function getCursorAngle(clientX, clientY) {
            const rect = menu.getBoundingClientRect();
            // Center is now the middle of the box
            const cx = rect.left + (rect.width / 2);
            const cy = rect.top + (rect.height / 2);

            const dx = clientX - cx;
            const dy = clientY - cy;

            // atan2 returns angle in radians from -PI to PI
            let deg = Math.atan2(dy, dx) * (180 / Math.PI);
            return deg;
        }

        function startDrag(e) {
            isDragging = true;
            const clientX = e.clientX || e.touches[0].clientX;
            const clientY = e.clientY || e.touches[0].clientY;
            startDragAngle = getCursorAngle(clientX, clientY);
            startRotation = currentRotation;
            // prevent default only on touch to stop scrolling page
    // if (e.type === 'touchstart') e.preventDefault(); 
    // Removed to allow 'click' event to fire after tap.
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

            // Handle angle wrap-around if necessary (though with this constrained arc unlikely)
            // But atan2 jumps from 180 to -180.
            if (delta > 180) delta -= 360;
            if (delta < -180) delta += 360;

            currentRotation = startRotation + delta;

            // Constrain rotation
            // We want to stop scrolling when we reach ends.
            // Items are placed from 275 deg downwards (-35 deg each).
            // e.g. Item 0: 275, Item 1: 240, Item 2: 205, Item 3: 170...
            // Visible window is essentially 180 to 270 (Top-Left quadrant).
            // If we rotate POSITIVE, items move CLOCKWISE (towards top/right).
            // If we rotate NEGATIVE, items move COUNTER-CLOCKWISE (towards left/bottom).

            // We want to allow pulling items from "hidden" area (e.g. Item 4 at 135 deg) into view (180+).
            // So we need to rotate POSITIVE to bring 135 to 180.

            // --- UPDATED BOUNDS LOGIC for "Just Enough" Scroll ---
            const lastItemAngle = START_ANGLE_BASE + ((items.length - 1) * ANGLE_STEP);
            const VISIBLE_START = 190;

            // Prevent the First Item (275) from moving down too much.
            const minRot = -5;

            // Prevent the Last Item from moving up too much (stop at bottom of view).
            // Target 180 deg (Left Edge).
            let maxRot = 180 - lastItemAngle;

            // If ALL items fit, lock to minRot.
            if (maxRot < minRot) maxRot = minRot;

            // Add some resistance/rubber band effect
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

            // Hard Clamp for Wheel
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
