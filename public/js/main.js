// import { appDown } from "./module/components/app-addons.js";
// Đợi DOM sẵn sàng trước khi chạy
document.addEventListener('DOMContentLoaded', async () => {
    // --- PHẦN QUAN TRỌNG: Dùng Dynamic Import để bắt lỗi ---
    try {
        console.log("Đang thử load module app-addons.js...");
        
        // Dùng await import() để load file. Nếu file lỗi, nó sẽ nhảy xuống catch
        const module = await import("./module/components/app-addons.js");
        
        console.log("Module load thành công:", module);

        // Chạy hàm appDown từ module
        if (typeof window.appDown === 'function') {
            console.log("Tìm thấy window.appDown, đang chạy...");
            window.appDown(); 
        } else {
            throw new Error("Không tìm thấy hàm appDown trong window sau khi load file.");
        }
    } catch (loadError) {
        // Đây là nơi bắt lỗi "require is not defined" hoặc lỗi không tìm thấy file
        console.error("🔴 LỖI NGHIÊM TRỌNG KHI IMPORT:", loadError);
        alert("Không thể load file script phụ. Xem console (F12) để biết chi tiết.");
    }
    // -------------------------------------------------------
    const MOBILE_BREAKPOINT = 768; // Khớp với media query trong CSS
    let isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
    let sidebarOpen = false;

    // --- 1. Lấy các thành phần có sẵn trong HTML ---
    const sbarButton = document.getElementById('sbar');
    const header = document.querySelector('header');
    
    // Các thành phần cần di chuyển
    const logo = document.getElementById('gen-brand');
    const menuList = document.querySelector('.main-mn > ul');
    const searchForm = document.querySelector('.header-search');
    const dlSwitch = document.getElementById('dl');
    const socialLinks = document.querySelector('.link-social');
    
    // Lưu lại "cha" và "anh em" (nếu cần) để khôi phục
    const originalParents = {
        logo: { parent: logo.parentElement, nextSibling: logo.nextElementSibling },
        menuList: { parent: menuList.parentElement, nextSibling: menuList.nextElementSibling },
        searchForm: { parent: searchForm.parentElement, nextSibling: searchForm.nextElementSibling },
        dlSwitch: { parent: dlSwitch.parentElement, nextSibling: dlSwitch.nextElementSibling },
        socialLinks: { parent: socialLinks.parentElement, nextSibling: socialLinks.nextElementSibling }
    };

    // --- 2. Tạo các phần tử mới cho Sidebar (chỉ 1 lần) ---
    
    // Tạo container sidebar
    const sidebar = document.createElement('nav');
    sidebar.id = 'mobile-sidebar';
    
    // Tạo nút đóng (X)
    const closeButton = document.createElement('button');
    closeButton.id = 'mobile-sidebar-close';
    closeButton.setAttribute('title', 'Đóng menu');
    closeButton.setAttribute('aria-label', 'Đóng menu');
    closeButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16"><path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8z"/></svg>`;
    
    // Tạo overlay
    const overlay = document.createElement('div');
    overlay.id = 'mobile-sidebar-overlay';

    // Thêm các phần tử mới vào body
    document.body.appendChild(sidebar);
    document.body.appendChild(overlay);

    // --- 3. Định nghĩa hàm Mở/Đóng ---

    const openSidebar = () => {
        if (sidebarOpen) return;
        
        // Thêm nút đóng, logo, menu, search, D/L, social vào sidebar
        sidebar.appendChild(closeButton);
        sidebar.appendChild(logo);
        sidebar.appendChild(menuList);
        sidebar.appendChild(searchForm);
        sidebar.appendChild(dlSwitch);
        sidebar.appendChild(socialLinks); // Sẽ được CSS đẩy xuống cuối
        
        // Kích hoạt CSS
        sidebar.classList.add('active');
        overlay.classList.add('active');
        document.body.classList.add('sidebar-open');
        sidebarOpen = true;
    };

    const closeSidebar = () => {
        if (!sidebarOpen) return;
        
        // Hủy kích hoạt CSS
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        document.body.classList.remove('sidebar-open');
        sidebarOpen = false;

        // Trả các thành phần về vị trí cũ.
        // Dùng `insertBefore` để giữ đúng thứ tự DOM ban đầu.
        const restoreElement = (el, info) => {
            if (info.nextSibling) {
                info.parent.insertBefore(el, info.nextSibling);
            } else {
                info.parent.appendChild(el);
            }
        };

        // Chờ hiệu ứng trượt (300ms) trước khi di chuyển DOM
        // để tránh bị "giật" hình
        setTimeout(() => {
            if (sidebarOpen) return; // Nếu bị mở lại ngay thì thôi

            restoreElement(logo, originalParents.logo);
            restoreElement(menuList, originalParents.menuList);
            restoreElement(searchForm, originalParents.searchForm);
            restoreElement(dlSwitch, originalParents.dlSwitch);
            restoreElement(socialLinks, originalParents.socialLinks);

            // Xóa nút đóng khỏi sidebar
            if (closeButton.parentElement === sidebar) {
                sidebar.removeChild(closeButton);
            }
            
        }, 300); // 300ms = thời gian transition của sidebar
    };

    // --- 4. Gán Event Listeners ---

    // Click nút hamburger
    sbarButton.addEventListener('click', (e) => {
        e.preventDefault();
        if (isMobile) {
            openSidebar();
        }
    });

    // Click nút (X)
    closeButton.addEventListener('click', closeSidebar);
    
    // Click vào overlay
    overlay.addEventListener('click', closeSidebar);

    // Xử lý khi thay đổi kích thước cửa sổ
    window.addEventListener('resize', () => {
        const newIsMobile = window.innerWidth <= MOBILE_BREAKPOINT;
        
        // Nếu chuyển từ mobile sang desktop VÀ sidebar đang mở
        // thì tự động đóng và khôi phục header
        if (isMobile && !newIsMobile && sidebarOpen) {
            closeSidebar();
        }
        
        isMobile = newIsMobile;
    });
});
