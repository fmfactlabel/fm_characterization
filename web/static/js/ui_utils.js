/**
 * Loads an external HTML file into a specific container
 */
async function loadComponent(url, containerId, callback = null) {
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
// Auto-load componentes con [data-include]
document.querySelectorAll('[data-include]').forEach(el => {
    const url = el.getAttribute('data-include');
    if (url) {
        loadComponent(url, el.id);
    }
});
// --- UI Progress System ---
let modalEl = null;
let modalInstance = null;
function ensureModal() {
    if (modalEl)
        return modalEl;
    modalEl = document.createElement("div");
    modalEl.className = "modal fade";
    modalEl.id = "genModal";
    modalEl.setAttribute("tabindex", "-1");
    modalEl.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-body text-center py-10 px-8">
                    <div id="genIcon" class="mb-5"><div class="spinner-border text-primary" role="status"></div></div>
                    <h4 id="genTitle" class="fw-bold mb-2">Preparing Pyodide</h4>
                    <p id="genMsg" class="text-muted mb-6">Downloading components...</p>
                    <div class="progress h-10px rounded-pill">
                        <div id="genBar" class="progress-bar bg-primary progress-bar-striped progress-bar-animated" style="width: 0%;"></div>
                    </div>
                </div>
            </div>
        </div>`;
    document.body.appendChild(modalEl);
    modalInstance = new bootstrap.Modal(modalEl, { backdrop: "static", keyboard: false });
    return modalEl;
}
function setModal({ title, msg, percent, state }) {
    ensureModal();
    const titleEl = document.getElementById("genTitle");
    const msgEl = document.getElementById("genMsg");
    const barEl = document.getElementById("genBar");
    const iconEl = document.getElementById("genIcon");
    if (title && titleEl)
        titleEl.innerText = title;
    if (msg && msgEl)
        msgEl.innerText = msg;
    if (percent !== undefined && barEl)
        barEl.style.width = `${percent}%`;
    if (state === "success" && barEl && iconEl) {
        barEl.classList.replace("bg-primary", "bg-success");
        iconEl.innerHTML = '<i class="fa fa-check-circle fa-3x text-success"></i>';
    }
}
// Exportamos las funciones por si las necesitas en otros módulos TS
export { loadComponent, setModal, modalInstance };
//# sourceMappingURL=ui_utils.js.map