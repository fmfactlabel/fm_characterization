import { ProgressBar } from './ProgressBar.js';
import { PyodideEngine } from './PyodideEngine.js';
import { handleFMSubmission } from './FormHandlers.js';
import { FMFactLabel } from './FMFactLabel.js';
const engine = new PyodideEngine();
const isFlask = window.IS_FLASK || false;
document.addEventListener("DOMContentLoaded", async () => {
    const loader = new ProgressBar("progress-anchor", { isModal: false, title: "Iniciando Sistema", color: "#000000" });
    // 1. Inicialización
    if (!isFlask) {
        try {
            loader.show();
            await engine.initialize((p, msg) => loader.update(p, msg));
            loader.setState("success");
            loader.hide(1000);
        }
        catch (e) {
            loader.setState("error");
            console.error("Fallo al iniciar Pyodide", e);
        }
    }
    else {
        loader.hide();
        loadFileFromURL();
    }
    console.log("IS_FLASK:", isFlask);
    // Observador único para formularios dinámicos
    const observer = new MutationObserver(() => {
        const fmForm = document.getElementById("fmForm");
        const jsonForm = document.getElementById("jsonForm");
        // --- FM FORM ---
        if (fmForm && !fmForm.dataset.listenerAttached) {
            console.log("FM Form detectado");
            fmForm.addEventListener("submit", async (e) => {
                console.log("SUBMIT FM interceptado");
                e.preventDefault();
                e.stopPropagation();
                const btn = document.getElementById("submitButton");
                if (btn)
                    btn.disabled = true;
                if (isFlask) {
                    const formData = new FormData(fmForm);
                    try {
                        const response = await fetch('/', { method: 'POST', body: formData });
                        if (!response.ok)
                            throw new Error('Flask response not ok.');
                        const data = await response.json();
                        updateAndRender(data.data);
                    }
                    catch (error) {
                        console.error('Error en Flask:', error);
                    }
                    finally {
                        if (btn)
                            btn.disabled = false;
                    }
                }
                else {
                    await handleFMSubmission(fmForm, engine, (fmName) => {
                        renderPyodideResult(fmName);
                        if (btn)
                            btn.disabled = false;
                    });
                }
            });
            fmForm.dataset.listenerAttached = "true";
        }
        // --- JSON FORM ---
        if (jsonForm && !jsonForm.dataset.listenerAttached) {
            console.log("JSON Form detectado");
            jsonForm.addEventListener("submit", async (e) => {
                console.log("SUBMIT JSON interceptado");
                e.preventDefault();
                const formData = new FormData(jsonForm);
                if (isFlask) {
                    try {
                        const response = await fetch('/uploadJSON', { method: 'POST', body: formData });
                        if (!response.ok)
                            throw new Error('Flask response not ok.');
                        const data = await response.json();
                        updateAndRender(data.data);
                    }
                    catch (error) {
                        console.error('Error Flask JSON:', error);
                    }
                }
                else {
                    // 🔵 AQUÍ TU LÓGICA PYODIDE PARA JSON
                    try {
                        const file = formData.get("inputJSON");
                        if (!file)
                            throw new Error("No JSON file provided");
                        const text = await file.text();
                        const data = JSON.parse(text);
                        updateAndRender(data);
                    }
                    catch (error) {
                        console.error("Error Pyodide JSON:", error);
                    }
                }
            });
            jsonForm.dataset.listenerAttached = "true";
        }
        // 🔑 Si ya tenemos ambos, dejamos de observar
        if (fmForm?.dataset.listenerAttached &&
            jsonForm?.dataset.listenerAttached) {
            observer.disconnect();
        }
    });
    // Iniciar observación
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
});
// --- FUNCIONES AUXILIARES ---
function updateAndRender(payload) {
    if (!payload)
        return;
    // Mapeo exacto de tu código original
    window.JSON_CHARACTERIZATION = payload.JSON_CHARACTERIZATION;
    window.TXT_CHARACTERIZATION = payload.TXT_CHARACTERIZATION;
    window.FM_NAME = payload.FM_NAME;
    createFMFactLabel(window.JSON_CHARACTERIZATION);
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
            if (!response.ok)
                throw new Error('Flask response not ok.');
            const data = await response.json();
            updateAndRender(data.data);
        }
        catch (error) {
            console.error('Error:', error);
        }
    }
}
function renderPyodideResult(fmName) {
    window.FM_NAME = fmName;
    const jsonStr = engine.readFile(`${fmName}.json`);
    const data = JSON.parse(jsonStr);
    createFMFactLabel(data);
}
function createFMFactLabel(data) {
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
            showPercentagesSelector: "#checkShowPercentages"
        };
        const factLabel = new FMFactLabel("#FMFactLabelChart", data, options);
    }
}
//# sourceMappingURL=main.js.map