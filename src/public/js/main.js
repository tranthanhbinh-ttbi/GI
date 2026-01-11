document.addEventListener('DOMContentLoaded', async () => {
    // Import optional addons
    await import("./module/components/app-addons.js").then((module) => {
        if (window.appAddons) window.appAddons();
    }).catch(err => console.log("Addons not found or failed to load", err));

    // Import Spotlight Search Feature
    await import("./module/search-spotlight.js").then((module) => {
        if (window.initSpotlight) window.initSpotlight();
    }).catch(err => console.log("Search Spotlight failed to load", err));

    // Init Notification Client
    if (window.NotificationClient) {
        window.NotificationClient.init();
    }

    // Elements
    const filterToggle = document.getElementById('filter-toggle');
    const filterMenu = document.getElementById('filter-dropdown-menu');
    const searchSuggestions = document.getElementById('search-suggestions');
    const filterTabs = document.querySelectorAll('.filter-tab');
    const filterGroups = document.querySelectorAll('.filter-group');

    // 1. Filter Menu Toggle
    if (filterToggle && filterMenu) {
        filterToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            filterMenu.classList.toggle('hidden');
            if (searchSuggestions) searchSuggestions.classList.add('hidden'); 
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
});