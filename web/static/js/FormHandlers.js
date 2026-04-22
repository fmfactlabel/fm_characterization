import { PyodideEngine } from './PyodideEngine.js';
import { PYTHON_CODE } from './PythonScripts.js';
export async function handleFMSubmission(form, engine, onResult, onProgress) {
    const formData = new FormData(form);
    const fileInput = form.querySelector('#inputFM');
    if (!fileInput.files?.length)
        return;
    const file = fileInput.files[0];
    if (!file) {
        alert("Please, select a file.");
        return; // Si no hay archivo, salimos de la función
    }
    if (onProgress)
        onProgress(5, "Preparando archivos en el navegador...");
    const arrayBuffer = await file.arrayBuffer();
    engine.writeFile(file.name, new Uint8Array(arrayBuffer));
    const name = formData.get("inputName")?.toString().trim() ? `"""${formData.get("inputName")}"""` : "None";
    const desc = formData.get("inputDescription")?.toString().trim() ? `"""${formData.get("inputDescription")}"""` : "None";
    const isLight = formData.get("lightFactLabel") === "on";
    const pyCode = PYTHON_CODE.PROCESS_FM(file.name, name, isLight, desc);
    const fmName = await engine.run(pyCode, onProgress);
    onResult(fmName);
}
export async function handleJSONSubmission(form, engine, onResult, onProgress) {
    const formData = new FormData(form);
    const fileInput = form.querySelector('#inputCharacterization');
    if (!fileInput.files?.length)
        return;
    const file = fileInput.files[0];
    if (!file) {
        alert("Please, select a file.");
        return; // Si no hay archivo, salimos de la función
    }
    if (onProgress)
        onProgress(5, "Preparando archivos en el navegador...");
    const arrayBuffer = await file.arrayBuffer();
    engine.writeFile(file.name, new Uint8Array(arrayBuffer));
    const pyCode = PYTHON_CODE.PROCESS_JSON(file.name);
    const fmName = await engine.run(pyCode, onProgress);
    onResult(fmName);
}
//# sourceMappingURL=FormHandlers.js.map