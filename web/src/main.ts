import { ProgressBar } from './ProgressBar.js';
import { PyodideEngine } from './PyodideEngine.js';
import { handleFMSubmission, handleJSONSubmission } from './FormHandlers.js';
import { FMFactLabel } from './FMFactLabel.js';

// GLOBAL DECLARATIONS
declare global {
    interface Window {
        FM_NAME: string;
        TXT_CHARACTERIZATION: string | null;
        JSON_CHARACTERIZATION: any | null;
        drawFMFactLabel: (data: any) => void;
    }
}

interface AppConfig {
    version: string;
    is_flask: boolean;
}
let CONFIG: AppConfig;

// GLOBAL CONSTANTS
export const engine = new PyodideEngine();
const loader = new ProgressBar("progress-anchor", { isModal: false, title: "Loading FM Fact Label", color: "#000000" });
const processBar = new ProgressBar(null, { isModal: true, title: "Generating Fact Label", color: "#007bff" });

document.addEventListener("DOMContentLoaded", async () => {
    await loadConfiguration();

    // 1. Primero configuramos los formularios para que sean interactivos
    setupFormObservers(); 
    
    // 2. Lanzamos la carga de Pyodide sin bloquear el hilo principal
    // No usamos 'await' aquí inmediatamente si queremos que el código siga
    initializeApp().then(() => {
        // 3. Cuando Pyodide esté listo, chequeamos la URL
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                loadFileFromURL(); 
            });
        });
    });
    setupCopyrightYear();
});

async function loadConfiguration() {
    const response = await fetch('./config.json');
    CONFIG = await response.json();
    (window as any).CONFIG = CONFIG; // Exponemos la configuración globalmente por si es necesaria en otros módulos
    
    // Update version in the UI
    const versionSpan = document.getElementById("app-version");
    if (versionSpan) {
        versionSpan.textContent = CONFIG.version;
    }
}

// INITIALIZATION
async function initializeApp() {
    if (!CONFIG.is_flask) {
        try {
            loader.show();
            await engine.initialize((p, msg) => loader.update(p, msg));
            //(window as any).pyodideInstance = (engine as any).instance;
            loader.setState("success");
            loader.hide(1500);
        } catch (e) {
            loader.setState("error");
            console.error("Error loading Pyodide", e);
        }
    } else {
        loader.hide();
    }
}

// FORM HANDLERS
function setupFormObservers() {
    const attach = () => {
        const fmForm = document.getElementById("fmForm") as HTMLFormElement;
        const jsonForm = document.getElementById("jsonForm") as HTMLFormElement;

        if (fmForm && !fmForm.dataset.listenerAttached) {
            fmForm.onsubmit = (e) => {
                e.preventDefault();
                onFMFormSubmit(e, fmForm);
                return false;
            };
            fmForm.dataset.listenerAttached = "true";
        }

        if (jsonForm && !jsonForm.dataset.listenerAttached) {
            jsonForm.onsubmit = (e) => {
                e.preventDefault();
                onJSONFormSubmit(e, jsonForm);
                return false;
            };
            jsonForm.dataset.listenerAttached = "true";
        }
    };

    attach();

    const observer = new MutationObserver(() => {
        attach();
        const fmForm = document.getElementById("fmForm");
        const jsonForm = document.getElementById("jsonForm");
        if (fmForm?.dataset.listenerAttached && jsonForm?.dataset.listenerAttached) {
            observer.disconnect();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

// EVENT FORM SUBMISSION HANDLERS
async function onFMFormSubmit(e: Event, form: HTMLFormElement) {
    e.preventDefault();
    const btn = document.getElementById("submitButtonFM") as HTMLButtonElement;
    
    toggleUIState(true, btn);
    processBar.update(0, "Initializing...");

    try {
        if (CONFIG.is_flask) {
            const response = await fetch('/', { method: 'POST', body: new FormData(form) });
            if (!response.ok) throw new Error('Flask response not ok.');

            await readStream(response, (event) => {
                if (event.type === 'progress') processBar.update(event.p, event.m);
                if (event.type === 'final') {
                    processBar.update(100, "Fact Label generated!");
                    processBar.setState("success");
                    updateAndRender(event.data);
                    processBar.hide(1500);
                }
                if (event.type === 'error') throw new Error(event.msg);
            });
        } else {
            await handleFMSubmission(form, engine, 
                (name) => {
                    processBar.update(100, "Fact Label generated!");
                    processBar.setState("success");
                    renderPyodideResult(name);
                    processBar.hide(1500);
                },
                (p, msg) => processBar.update(p, msg)
            );
        }
    } catch (err: any) {
        processBar.setState("error");
        processBar.update(100, err.message);
    } finally {
        toggleUIState(false, btn);
    }
}

async function onJSONFormSubmit(e: Event, form: HTMLFormElement) {
    e.preventDefault();
    const btn = document.getElementById("submitButtonJSON") as HTMLButtonElement;
    
    toggleUIState(true, btn);
    processBar.update(0, "Initializing...");

    try {
        if (CONFIG.is_flask) {
            const response = await fetch('/uploadJSON', { method: 'POST', body: new FormData(form) });
            if (!response.ok) throw new Error('Flask response not ok.');

            await readStream(response, (event) => {
                if (event.type === 'progress') processBar.update(event.p, event.m);
                if (event.type === 'final') {
                    processBar.update(100, "Fact Label generated!");
                    processBar.setState("success");
                    updateAndRender(event.data);
                    processBar.hide(1500);
                }
                if (event.type === 'error') throw new Error(event.msg);
            });
        } else {  // Pyodide
            await handleJSONSubmission(form, engine, 
                (name) => {
                    processBar.update(100, "Fact Label generated!");
                    processBar.setState("success");
                    renderPyodideResult(name);
                    processBar.hide(1500);
                },
                (p, msg) => processBar.update(p, msg)
            );
        }
    } catch (err: any) {
        processBar.setState("error");
        processBar.update(100, err.message);
    } finally {
        toggleUIState(false, btn);
    }
}

// AUXILIARY FUNCTIONS
function toggleUIState(isLoading: boolean, btn?: HTMLButtonElement) {
    if (btn) btn.disabled = isLoading;
    if (isLoading) {
        processBar.show();
        processBar.setState("loading");
    }
}

function updateAndRender(payload: any) {
    if (!payload) return;
    window.JSON_CHARACTERIZATION = payload.JSON_CHARACTERIZATION || payload;
    window.TXT_CHARACTERIZATION = payload.TXT_CHARACTERIZATION || null;
    window.FM_NAME = payload.FM_NAME || "Model";
    createFMFactLabel(window.JSON_CHARACTERIZATION);
}

async function readStream(response: Response, onEvent: (data: any) => void) {
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    if (!reader) return;

    while (true) {
        const { value, done } = await reader.read();
        if (done) {
            break;
        }
        const chunk = decoder.decode(value);
        chunk.split('\n').forEach(line => {
            if (line.trim().startsWith('data: ')) {
                try { onEvent(JSON.parse(line.replace('data: ', '').trim())); }
                catch (e) { console.error("Stream parse error", e); }
            }
        });
    }
}

async function loadFileFromURL() {
    const params = new URLSearchParams(window.location.search);
    const fileURL = params.get('file');

    if (fileURL) {
        const btn = document.getElementById("submitButtonFM") as HTMLButtonElement;
        toggleUIState(true, btn);
        processBar.update(0, "Initializing...");

        if (CONFIG.is_flask) {
            // --- LÓGICA FLASK (STREAM) ---
            try {
                const response = await fetch('/fromURL', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: fileURL })
                });

                if (!response.ok) throw new Error('Flask response not ok.');

                // Consumimos el stream igual que en los formularios
                await readStream(response, (event) => {
                    if (event.type === 'progress') {
                        processBar.update(event.p, event.m);
                    } else if (event.type === 'final') {
                        processBar.update(100, "Fact Label generated!");
                        processBar.setState("success");
                        updateAndRender(event.data);
                        processBar.hide(1500);
                    } else if (event.type === 'error') {
                        throw new Error(event.msg);
                    }
                });
            } catch (err: any) {
                processBar.setState("error");
                processBar.update(100, `Error: ${err.message}`);
                console.error("Flask URL Error:", err);
            }
        } else {
            // --- LÓGICA PYODIDE ---
            try {
                // Suponiendo que tu motor tiene un método para manejar URLs 
                // similar a handleFMSubmission pero para URLs
                processBar.update(20, "Downloading via Pyodide...");
                
                // Aquí usamos la lógica de Pyodide:
                // Nota: Asegúrate de tener expuesta esta lógica en tu PyodideEngine o similar
                const fmName = await engine.processFromURL(
                    fileURL, 
                    (p: number, msg: string) => processBar.update(p, msg)
                );

                processBar.update(100, "Done!");
                processBar.setState("success");
                renderPyodideResult(fmName);
                processBar.hide(1000);
            } catch (error: any) {
                processBar.setState("error");
                processBar.update(100, "Pyodide URL Error");
                console.error("Pyodide URL Error:", error);
            }
        }
        toggleUIState(false, btn);
    }
}

function renderPyodideResult(fmName: string) {
    window.FM_NAME = fmName;
    const jsonStr = engine.readFile(`${fmName}.json`);
    const data = JSON.parse(jsonStr);
    
    createFMFactLabel(data);
}

function createFMFactLabel(data: any) {
    // show the options and export panels
    const optionsPanel = document.getElementById("optionsPanel");
    const exportDropdown = document.getElementById("exportDropdown");
    if (exportDropdown) {
        exportDropdown.classList.remove("d-none");
    }
    if (optionsPanel) {
        optionsPanel.classList.remove("d-none");
    }

    const chartContainer = document.getElementById("FMFactLabelChart");
    if (chartContainer) {
        chartContainer.replaceChildren();

        const options = {
            zeroValuesSelector: "#collapseZeroValues",
            subPropertiesSelector: "#collapseSubProperties",
            zebraStripingSelector: "#checkZebraStriping",
            showRatioBarSelector: "#checkRatioBar",
            showPercentagesSelector: "#checkShowPercentages",
            metricsSelectorContainer: "#metricsSelectorContainer"
        };

        const factLabel = new FMFactLabel("#FMFactLabelChart", data, options);
        setupPersistenceButtons(factLabel);
    }
}

function setupPersistenceButtons(factLabel: FMFactLabel) {
    const buttons = [
        { id: "saveSVG", format: "svg", type: "export" },
        { id: "savePNG", format: "png", type: "export" },
        { id: "savePDF", format: "pdf", type: "export" },
        { id: "saveJSON", format: "json", type: "source" },
        { id: "saveTXT", format: "txt", type: "source" }
    ];

    buttons.forEach(btnInfo => {
        const btn = document.getElementById(btnInfo.id);
        if (btn) {
            // Eliminamos listeners previos para evitar duplicados si se llama varias veces
            const newBtn = btn.cloneNode(true) as HTMLButtonElement;
            btn.parentNode?.replaceChild(newBtn, btn);

            newBtn.addEventListener("click", (e) => {
                e.preventDefault();
                
                if (btnInfo.type === "export") {
                    factLabel.export(btnInfo.format as 'svg' | 'png' | 'pdf');
                } else {
                    // Pasamos el engine que ya tienes en el scope de main.ts
                    factLabel.downloadSource(btnInfo.format as 'json' | 'txt', engine);
                }
            });
        }
    });
}

function setupCopyrightYear(): void {
    const yearElement = document.getElementById("current-year");
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear().toString();
    }
    // Set the maximum year for the input field to current year + 1
    const inputYear = document.getElementById("inputYear") as HTMLInputElement;
    if (inputYear) {
        const maxYear = new Date().getFullYear() + 1;
        inputYear.max = maxYear.toString();
    }
}