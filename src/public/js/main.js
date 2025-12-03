document.addEventListener('DOMContentLoaded', async () => {
    await import("./module/components/app-addons.js").then(() => {
        if (window.appAddons) window.appAddons();
    });
});
