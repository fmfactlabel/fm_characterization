export const PYTHON_CODE = {
    PROCESS_FM: (fileName, name, isLight, desc) => `
import js
import asyncio
from fmfactlabel import FMCharacterization
import pathlib

async def run_process():
    # 1. Definimos el adaptador para el callback
    def progress_adapter(p, m, d=""):
        if hasattr(js, "py_progress_callback"):
            js.py_progress_callback(p, m, d)

    # 2. Llamada asíncrona a tu clase modificada
    # Usamos from_path porque ya implementamos el on_progress ahí
    char = await FMCharacterization.from_path_async("${fileName}", ${isLight ? "True" : "False"}, on_progress=progress_adapter)
    
    # 3. Metadatos extra
    if ${name} is not None:
        char.metadata.name = ${name}
    char.metadata.description = ${desc}

    # 4. Guardado de archivos
    char.to_json_file(f"{char.metadata.name}.json")
    with open(f"{char.metadata.name}.txt", 'w', encoding='utf-8') as f: 
        f.write(str(char))
    
    return char.metadata.name

# Ejecutamos la corrutina y devolvemos el resultado a JS
await run_process()
`,
    PROCESS_JSON: (fileName) => `
import json
from fmfactlabel import FMCharacterization
with open("${fileName}") as f:
    data = json.load(f)
name = next((item['value'] for item in data["metadata"] if item["name"] == "Name"), "model")
with open(f"{name}.json", 'w') as f: json.dump(data, f)
with open(f"{name}.txt", 'w') as f: f.write(FMCharacterization.json_to_text(data))
name
`,
    PROCESS_URL: (url) => `
import js
import asyncio
import pyodide_http  # Importamos el parche
from fmfactlabel import FMCharacterization

# 1. PARCHEAMOS LAS LIBRERÍAS DE RED
# Esto hace que urllib.request use fetch() de JS automáticamente
pyodide_http.patch_all()

async def run_url_process():
    def progress_adapter(p, m, d=""):
        if hasattr(js, "py_progress_callback"):
            js.py_progress_callback(p, m, d)

    # 2. Ahora urllib (usado por from_url) funcionará perfectamente
    # Nota: Asegúrate de que fmfactlabel sea compatible con el parche
    # Si 'from_url' no es una corrutina en tu lib, quita el 'await' de delante
    # pero mantén el async/await del wrapper.
    char = await FMCharacterization.from_url_async("${url}", on_progress=progress_adapter)
    
    name = char.metadata.name
    char.to_json_file(f"{name}.json")
    with open(f"{name}.txt", 'w', encoding='utf-8') as f:
        f.write(str(char))
    
    return name

await run_url_process()
`
};
//# sourceMappingURL=PythonScripts.js.map