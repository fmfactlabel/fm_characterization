/**
 * ui_utils.ts - Solo utilidades de carga de componentes
 */
/**
 * Loads an external HTML file into a specific container
 */
export async function loadComponent(url, containerId, callback = null) {
    const container = document.getElementById(containerId);
    if (!container)
        return;
    try {
        const response = await fetch(url);
        if (!response.ok)
            throw new Error(`Failed to load ${url}`);
        const html = await response.text();
        container.innerHTML = html;
        if (callback && typeof callback === 'function') {
            callback();
        }
    }
    catch (error) {
        console.error('Error loading component:', error);
        container.innerHTML = `<p class="text-danger">Error loading ${url}.</p>`;
    }
}
// Escuchar elementos que quieran auto-cargarse
document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll('[data-include]').forEach(el => {
        const url = el.getAttribute('data-include');
        if (url) {
            loadComponent(url, el.id);
        }
    });
});
//# sourceMappingURL=ui_utils.js.map