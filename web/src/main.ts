import { ProgressBar } from './ProgressBar.js';
import { PyodideEngine } from './PyodideEngine.js';
import { handleFMSubmission } from './FormHandlers.js';
import { FMFactLabel } from './FMFactLabel.js';

// GLOBAL DECLARATIONS
declare global {
    interface Window {
        FM_NAME: string;
        IS_FLASK: boolean;
        TXT_CHARACTERIZATION: string | null;
        JSON_CHARACTERIZATION: any | null;
        drawFMFactLabel: (data: any) => void;
    }
}

// GLOBAL CONSTANTS
const engine = new PyodideEngine();
const isFlask = window.IS_FLASK || false;
const loader = new ProgressBar("progress-anchor", { isModal: false, title: "Loading FM Fact Label", color: "#000000" });
const processBar = new ProgressBar(null, { isModal: true, title: "Generating Fact Label", color: "#007bff" });

// ENTRY POINT
document.addEventListener("DOMContentLoaded", async () => {
    await initializeApp();
    setupFormObservers();
});

// INITIALIZATION
async function initializeApp() {
    if (!isFlask) {
        try {
            loader.show();
            await engine.initialize((p, msg) => loader.update(p, msg));
            loader.setState("success");
            loader.hide(1000);
        } catch (e) {
            loader.setState("error");
            console.error("Fallo al iniciar Pyodide", e);
        }
    } else {
        loader.hide();
        loadFileFromURL();
    }
}

// FORM HANDLERS
function setupFormObservers() {
    const observer = new MutationObserver(() => {
        const fmForm = document.getElementById("fmForm") as HTMLFormElement;
        const jsonForm = document.getElementById("jsonForm") as HTMLFormElement;

        if (fmForm && !fmForm.dataset.listenerAttached) {
            fmForm.addEventListener("submit", (e) => onFMFormSubmit(e, fmForm));
            fmForm.dataset.listenerAttached = "true";
        }

        if (jsonForm && !jsonForm.dataset.listenerAttached) {
            jsonForm.addEventListener("submit", (e) => onJSONFormSubmit(e, jsonForm));
            jsonForm.dataset.listenerAttached = "true";
        }

        if (fmForm?.dataset.listenerAttached && jsonForm?.dataset.listenerAttached) {
            observer.disconnect();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

// EVENT FORM SUBMISSION HANDLERS
async function onFMFormSubmit(e: Event, form: HTMLFormElement) {
    e.preventDefault();
    const btn = document.getElementById("submitButton") as HTMLButtonElement;
    
    toggleUIState(true, btn);
    processBar.update(0, "Processing file...");

    try {
        if (isFlask) {
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
                    processBar.update(100, "Success!");
                    processBar.setState("success");
                    renderPyodideResult(name);
                    processBar.hide(1000);
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
    const formData = new FormData(form);

    try {
        if (isFlask) {
            const response = await fetch('/uploadJSON', { method: 'POST', body: formData });
            const result = await response.json();
            updateAndRender(result.data);
        } else {
            const file = formData.get("inputJSON") as File;
            if (!file) throw new Error("No JSON file");
            updateAndRender(JSON.parse(await file.text()));
        }
    } catch (error) {
        console.error('Error JSON Form:', error);
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
        if (done) break;
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
        try {
            const response = await fetch('/fromURL', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: fileURL })
            });
            if (!response.ok) throw new Error('Flask response not ok.');
            const data = await response.json();
            updateAndRender(data.data);
        } catch (error) {
            console.error('Error:', error);
        }
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
    }
}