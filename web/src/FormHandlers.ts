import { PyodideEngine } from './PyodideEngine.js';

export async function handleFMSubmission(
    form: HTMLFormElement, 
    engine: PyodideEngine,
    onResult: (name: string) => void,
    onProgress?: (percent: number, message: string, details: string) => void
) {
    const formData = new FormData(form);
    const fileInput = form.querySelector('#inputFM') as HTMLInputElement;
    const file = fileInput.files?.[0];

    if (!file) {
        alert("Please, select a file.");
        return;
    }

    if (onProgress) onProgress(5, "Processing feature model...", "Preparing virtual file system");

    // 1. Escribir archivo en la memoria de Pyodide
    const arrayBuffer = await file.arrayBuffer();
    engine.writeFile(file.name, new Uint8Array(arrayBuffer));

    // 2. Extraer datos del formulario
    const name = formData.get("inputName")?.toString().trim() || null;
    const desc = formData.get("inputDescription")?.toString().trim() || "";
    const isLight = formData.get("lightFactLabel") === "on";

    // 3. Delegar la ejecución al motor unificado
    const fmName = await engine.processFM(file.name, name, isLight, desc, onProgress);
    onResult(fmName);
}

export async function handleJSONSubmission(
    form: HTMLFormElement, 
    engine: PyodideEngine,
    onResult: (name: string) => void,
    onProgress?: (percent: number, message: string, details: string) => void
) {
    const fileInput = form.querySelector('#inputCharacterization') as HTMLInputElement;
    const file = fileInput.files?.[0];

    if (!file) {
        alert("Please, select a file.");
        return;
    }

    if (onProgress) onProgress(5, "Reading JSON into memory...", "");

    // 1. Escribir archivo
    const arrayBuffer = await file.arrayBuffer();
    engine.writeFile(file.name, new Uint8Array(arrayBuffer));

    // 2. Delegar al motor
    const fmName = await engine.processJSON(file.name, onProgress);
    onResult(fmName);
}

export async function handleDatasetSubmission(
    form: HTMLFormElement, 
    engine: PyodideEngine,
    onResult: (name: string) => void,
    onProgress?: (percent: number, message: string, details: string) => void
) {
    const formData = new FormData(form);
    const fileInput = form.querySelector('#inputDataset') as HTMLInputElement;
    const file = fileInput.files?.[0];

    if (!file) {
        alert("Please, select a file.");
        return;
    }

    if (onProgress) onProgress(5, "Processing dataset...", "Preparing virtual file system");

    // 1. Escribir archivo en la memoria de Pyodide
    const arrayBuffer = await file.arrayBuffer();
    engine.writeFile(file.name, new Uint8Array(arrayBuffer));

    // 2. Extraer datos del formulario
    const name = formData.get("inputName")?.toString().trim() || null;
    const desc = formData.get("inputDescription")?.toString().trim() || "";
    const isLight = formData.get("lightFactLabel") === "on";

    // 3. Delegar la ejecución al motor unificado
    const fmName = await engine.processDataset(file.name, name, isLight, desc, onProgress);
    onResult(fmName);
}