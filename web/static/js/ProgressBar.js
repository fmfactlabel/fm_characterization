export class ProgressBar {
    isModal;
    container;
    options; // Required asegura que los valores por defecto existan
    el = null;
    constructor(containerId, options = {}) {
        this.isModal = options.isModal || false;
        // Buscamos el contenedor
        const target = this.isModal ? document.body : (containerId ? document.getElementById(containerId) : null);
        this.container = target;
        this.options = {
            title: options.title || "Procesando",
            color: options.color || "#007bff",
            isModal: this.isModal,
            ...options
        };
        this.init();
    }
    init() {
        if (!this.container) {
            console.error("ProgressBar: No se encontró el contenedor.");
            return;
        }
        this.el = document.createElement("div");
        this.el.className = this.isModal ? "pg-wrapper pg-modal" : "pg-wrapper pg-inline";
        this.el.innerHTML = `
            <div class="pg-backdrop"></div>
            <div class="pg-card">
                <div class="pg-icon"><div class="pg-spinner"></div></div>
                <h4 class="pg-title">${this.options.title}</h4>
                <p class="pg-msg">Iniciando...</p>
                <div class="pg-bar-bg">
                    <div class="pg-bar-fill" style="width: 0%; background-color: ${this.options.color}"></div>
                </div>
            </div>
        `;
        if (!document.getElementById("pg-module-styles")) {
            this.injectStyles();
        }
        this.container.appendChild(this.el);
        if (this.isModal)
            this.hide();
    }
    // --- Métodos de Control ---
    update(percent, message, title) {
        if (!this.el)
            return;
        const fill = this.el.querySelector(".pg-bar-fill");
        const msgEl = this.el.querySelector(".pg-msg");
        const titleEl = this.el.querySelector(".pg-title");
        if (fill)
            fill.style.width = `${Math.max(0, Math.min(100, percent))}%`;
        if (message && msgEl)
            msgEl.innerText = message;
        if (title && titleEl)
            titleEl.innerText = title;
    }
    setState(state) {
        if (!this.el)
            return;
        const icon = this.el.querySelector(".pg-icon");
        const bar = this.el.querySelector(".pg-bar-fill");
        if (!icon || !bar)
            return;
        if (state === "success") {
            bar.style.backgroundColor = "#28a745";
            icon.innerHTML = '<span style="font-size: 2rem;">✅</span>';
        }
        else if (state === "error") {
            bar.style.backgroundColor = "#dc3545";
            icon.innerHTML = '<span style="font-size: 2rem;">❌</span>';
        }
        else {
            bar.style.backgroundColor = this.options.color;
            icon.innerHTML = '<div class="pg-spinner"></div>';
        }
    }
    show() {
        if (this.el)
            this.el.style.display = "flex";
    }
    hide(delay = 0) {
        if (!this.el)
            return;
        setTimeout(() => {
            if (this.el)
                this.el.style.display = "none";
        }, delay);
    }
    injectStyles() {
        const style = document.createElement("style");
        style.id = "pg-module-styles";
        style.innerHTML = `
            .pg-wrapper { font-family: 'Segoe UI', sans-serif; display: flex; align-items: center; justify-content: center; }
            .pg-wrapper.pg-modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 9999; }
            .pg-wrapper.pg-modal .pg-backdrop { position: absolute; width: 100%; height: 100%; background: rgba(0,0,0,0.5); backdrop-filter: blur(2px); }
            .pg-wrapper.pg-inline { position: relative; width: 100%; padding: 20px; border: 1px solid #eee; border-radius: 12px; background: #fafafa; }
            .pg-card { position: relative; background: white; padding: 30px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); text-align: center; min-width: 300px; z-index: 10; }
            .pg-spinner { border: 4px solid #f3f3f3; border-top: 4px solid ${this.options.color}; border-radius: 50%; width: 40px; height: 40px; animation: pg-spin 1s linear infinite; margin: 0 auto 20px; }
            .pg-bar-bg { background: #e9ecef; border-radius: 10px; height: 12px; overflow: hidden; margin-top: 15px; }
            .pg-bar-fill { height: 100%; transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
            @keyframes pg-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `;
        document.head.appendChild(style);
    }
}
//# sourceMappingURL=ProgressBar.js.map