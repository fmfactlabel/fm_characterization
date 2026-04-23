// Definimos una interfaz para las opciones para tener autocompletado
interface ProgressBarOptions {
    title?: string;
    color?: string;
    isModal?: boolean;
}

export class ProgressBar {
    private isModal: boolean;
    private container: HTMLElement | null;
    private options: Required<ProgressBarOptions>; // Required asegura que los valores por defecto existan
    private el: HTMLDivElement | null = null;

    constructor(containerId: string | null, options: ProgressBarOptions = {}) {
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

    private init(): void {
        if (!this.container) {
            console.error("ProgressBar: No se encontró el contenedor.");
            return;
        }

        this.el = document.createElement("div");
        this.el.className = this.isModal ? "pg-wrapper pg-modal" : "pg-wrapper pg-inline";
        
        this.el.innerHTML = `
            <div class="pg-backdrop"></div>
            <div class="pg-card">
                <div class="pg-spinner-container">
                    <div class="pg-spinner"></div>
                </div>
                <h3 class="pg-title">${this.options.title}</h3>
                <p class="pg-msg">Iniciando...</p>
                <div class="pg-bar-bg">
                    <div class="pg-bar-fill" style="width: 0%; background-color: ${this.options.color}"></div>
                </div>
                <p class="pg-detail"></p> 
            </div>
        `;

        if (!document.getElementById("pg-module-styles")) {
            this.injectStyles();
        }

        this.container.appendChild(this.el);
        if (this.isModal) this.hide(); 
    }

    // --- Métodos de Control ---

    public update(percent: number, message?: string, detail?: string, title?: string): void {
        if (!this.el) return;
        
        const fill = this.el.querySelector(".pg-bar-fill") as HTMLDivElement;
        const msgEl = this.el.querySelector(".pg-msg") as HTMLParagraphElement;
        const detailEl = this.el.querySelector(".pg-detail") as HTMLParagraphElement;
        const titleEl = this.el.querySelector(".pg-title") as HTMLHeadingElement;

        if (fill) fill.style.width = `${Math.max(0, Math.min(100, percent))}%`;
        if (message && msgEl) msgEl.innerText = message;
        if (detail !== undefined && detailEl) detailEl.innerText = detail;
        if (title && titleEl) titleEl.innerText = title;
    }

    public setState(state: "success" | "error" | "loading"): void {
        if (!this.el) return;

        // Buscamos el contenedor del spinner que definimos en el nuevo init()
        const iconContainer = this.el.querySelector(".pg-spinner-container") as HTMLDivElement;
        const bar = this.el.querySelector(".pg-bar-fill") as HTMLDivElement;
        
        if (!iconContainer || !bar) return;

        if (state === "success") {
            bar.style.backgroundColor = "#28a745"; // Verde
            // Reemplazamos el spinner por un icono de éxito grande y animado
            iconContainer.innerHTML = '<span style="font-size: 3rem; animation: pg-bounce 0.5s ease;">✅</span>';
        } else if (state === "error") {
            bar.style.backgroundColor = "#dc3545"; // Rojo
            iconContainer.innerHTML = '<span style="font-size: 3rem; animation: pg-bounce 0.5s ease;">❌</span>';
        } else {
            // Volver al estado de carga
            bar.style.backgroundColor = this.options.color;
            iconContainer.innerHTML = '<div class="pg-spinner"></div>';
        }
    }

    public show(): void {
        //if (this.el) this.el.style.display = "flex";
        if (this.el) {
            this.el.style.setProperty('display', 'flex', 'important');
            this.el.style.setProperty('visibility', 'visible', 'important');
            this.el.style.setProperty('opacity', '1', 'important');
            this.el.style.setProperty('z-index', '2147483647', 'important');
        }
    }
    
    public hide(delay: number = 0): void {
        if (!this.el) return;
        setTimeout(() => {
            if (this.el) this.el.style.display = "none";
        }, delay);
    }

    private injectStyles(): void {
        const style = document.createElement("style");
        style.id = "pg-module-styles";
        style.innerHTML = `
            .pg-wrapper { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; transition: opacity 0.3s; }
            .pg-wrapper.pg-modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 9999; }
            .pg-wrapper.pg-modal .pg-backdrop { position: absolute; width: 100%; height: 100%; background: rgba(255,255,255,0.7); backdrop-filter: blur(4px); }
            
            .pg-card { 
                position: relative; background: white; padding: 40px; border-radius: 8px; 
                box-shadow: 0 4px 30px rgba(0,0,0,0.1); text-align: center; 
                width: 100%; max-width: 500px; z-index: 10; 
            }

            .pg-spinner-container { height: 60px; display: flex; justify-content: center; align-items: center; margin-bottom: 20px; }
            .pg-spinner { 
                border: 3px solid #f0f2f6; border-top: 3px solid ${this.options.color}; 
                border-radius: 50%; width: 50px; height: 50px; 
                animation: pg-spin 1s cubic-bezier(0.4, 0, 0.2, 1) infinite; 
            }

            .pg-title { color: #0e1117; font-size: 1.5rem; font-weight: 700; margin: 0 0 8px 0; }
            .pg-msg { color: #555e6d; font-size: 1.1rem; margin: 0 0 25px 0; }
            
            .pg-bar-bg { background: #f0f2f6; border-radius: 100px; height: 8px; overflow: hidden; margin: 10px 0; }
            .pg-bar-fill { height: 100%; border-radius: 100px; transition: width 0.3s ease; }
            
            .pg-detail { color: #808495; font-size: 0.85rem; margin-top: 12px; font-variant-numeric: tabular-nums; }

            @keyframes pg-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            @keyframes pg-bounce {
                0% { transform: scale(0); }
                70% { transform: scale(1.2); }
                100% { transform: scale(1); }
            }
        `;
        document.head.appendChild(style);
    }
}