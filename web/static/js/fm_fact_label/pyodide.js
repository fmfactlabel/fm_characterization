// Pyodide Integration
let pyodideInstance;

async function loadPyodideAndPackages() {
    document.getElementById("pyodideStatus").innerText = "Loading Pyodide, please wait...";
    pyodideInstance = await loadPyodide();
    await pyodideInstance.loadPackage("micropip");
    await pyodideInstance.loadPackage("python-sat");

    await pyodideInstance.runPythonAsync(`
        import micropip
        await micropip.install("flamapy/ply-3.11-py2.py3-none-any.whl", deps=False)
        await micropip.install("flamapy/uvlparser-2.0.1-py3-none-any.whl", deps=False)
        await micropip.install("flamapy/afmparser-1.0.3-py3-none-any.whl", deps=False)
        await micropip.install("flamapy/antlr4_python3_runtime-4.13.1-py3-none-any.whl", deps=False)
        await micropip.install("flamapy/flamapy-2.1.0.dev0-py3-none-any.whl", deps=False)
        await micropip.install("flamapy/flamapy_fw-2.1.0.dev0-py3-none-any.whl", deps=False)
        await micropip.install("flamapy/flamapy_fm-2.1.0.dev0-py3-none-any.whl", deps=False)
        await micropip.install("flamapy/flamapy_sat-2.1.0.dev0-py3-none-any.whl", deps=False)
        await micropip.install("flamapy/flamapy_bdd-2.1.0.dev0-py3-none-any.whl", deps=False)
        await micropip.install("flamapy/dd-0.5.7-py3-none-any.whl", deps=False)
        await micropip.install("flamapy/astutils-0.0.6-py3-none-any.whl", deps=False)
        await micropip.install("flamapy/fmfactlabel-1.8.0-py3-none-any.whl", deps=False)
    `);

    document.getElementById("pyodideStatus").innerText = "Pyodide loaded. FM Fact Label ready.";
}

loadPyodideAndPackages();

document.getElementById("fmForm").addEventListener("submit", async function (event) {
    event.preventDefault();
    document.getElementById("submitButton").innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i> Loading...';

    const formData = new FormData(event.target);
    const formObject = {};
    formData.forEach((value, key) => { formObject[key] = value });
    const fileInputElement = document.getElementById("inputFM");
    if (!fileInputElement || fileInputElement.files.length === 0) return;
    const inputFM = fileInputElement.files[0];
    if (!inputFM) return;

    const arrayBuffer = await inputFM.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    pyodideInstance.FS.writeFile(inputFM.name, uint8Array);

    const toPyStringOrNone = (value) => value?.trim() ? `"""${value.trim()}"""` : "None";
    const toPyIntOrNone = (value) => value?.trim() ? `int(${parseInt(value.trim())})` : "None";

    const pyCode = `
name = ${toPyStringOrNone(formObject.inputName)}
description = ${toPyStringOrNone(formObject.inputDescription)}
authors = ${toPyStringOrNone(formObject.inputAuthor)}
year = ${toPyIntOrNone(formObject.inputYear)}
domain = ${toPyStringOrNone(formObject.inputDomain)}
tags = ${toPyStringOrNone(formObject.inputKeywords)}
doi = ${toPyStringOrNone(formObject.inputReference)}
ligth_fm = ${formObject.lightFactLabel === "on" ? "True" : "False"}

fm_file = """${inputFM.name}"""

from flamapy.metamodels.fm_metamodel.models import FeatureModel
from flamapy.metamodels.fm_metamodel.transformations import (
    UVLReader, 
    FeatureIDEReader, 
    GlencoeReader,
    AFMReader,
    JSONReader
)

from fmfactlabel import FMCharacterization
import pathlib
import json

def read_fm_file(filename: str) -> FeatureModel:
    if filename.endswith(".uvl"):
        return UVLReader(filename).transform()
    elif filename.endswith(".xml") or filename.endswith(".fide"):
        return FeatureIDEReader(filename).transform()
    elif filename.endswith("gfm.json"):
        return GlencoeReader(filename).transform()
    elif filename.endswith(".afm"):
        return AFMReader(filename).transform()
    elif filename.endswith(".json"):
        return JSONReader(filename).transform()
    else:
        raise Exception(f"Unsupported file format: {filename}")

fm = read_fm_file(fm_file)
if fm is None:
    raise Exception('Feature model format not supported.')

characterization = FMCharacterization(fm, ligth_fm)
characterization.metadata.name = name if name is not None else pathlib.Path(fm_file).stem
characterization.metadata.description = description
characterization.metadata.author = authors
characterization.metadata.year = year
characterization.metadata.tags = tags
characterization.metadata.reference = doi
characterization.metadata.domains = domain

json_characterization = characterization.to_json()
txt_characterization = str(characterization)
name = characterization.metadata.name

# Write the characterization to a JSON file
filename = f'{name}.json'
characterization.to_json_file(filename)
# Write the characterization to a text file
filename = f'{name}.txt'
with open(filename, 'w', encoding='utf-8') as file_txt:
    file_txt.write(str(characterization))

`;

    try {
        await pyodideInstance.runPythonAsync(pyCode);
        window.FM_NAME = pyodideInstance.globals.get("name");
        const jsonString = pyodideInstance.FS.readFile(window.FM_NAME + ".json", { encoding: "utf8" });
        const fmData = JSON.parse(jsonString);
        drawFMFactLabel(fmData);
    } catch (error) {
        console.error("Pyodide Error:", error);
    }

    document.getElementById("submitButton").innerHTML = 'Submit';
});

document.getElementById("jsonForm").addEventListener("submit", async function (event) {
    event.preventDefault();
    document.getElementById("submitButtonJSON").innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i> Loading...';

    const fileInputElement = document.getElementById("inputJSON");
    if (!fileInputElement || fileInputElement.files.length === 0) return;
    const inputJSON = fileInputElement.files[0];
    if (!inputJSON) return;

    const arrayBuffer = await inputJSON.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    pyodideInstance.FS.writeFile(inputJSON.name, uint8Array);

    const pyCode = `
json_file = """${inputJSON.name}"""

from fmfactlabel import FMCharacterization
import json

json_characterization = json.load(open(json_file))
txt_characterization = FMCharacterization.json_to_text(json_characterization)
name = next((item['value'] for item in json_characterization["metadata"] if item["name"] == "Name"), None)

# Write the characterization to a JSON file
filename = f'{name}.json'
with open(filename, 'w', encoding='utf-8') as file_json:
    json.dump(json_characterization, file_json, indent=4)
# Write the characterization to a text file
filename = f'{name}.txt'
with open(filename, 'w', encoding='utf-8') as file_txt:
    file_txt.write(txt_characterization)
`;

    try {
        await pyodideInstance.runPythonAsync(pyCode);
        window.FM_NAME = pyodideInstance.globals.get("name");
        const jsonString = pyodideInstance.FS.readFile(window.FM_NAME + ".json", { encoding: "utf8" });
        const fmData = JSON.parse(jsonString);
        drawFMFactLabel(fmData);
    } catch (error) {
        console.error("Pyodide Error:", error);
    }

    document.getElementById("submitButtonJSON").innerHTML = 'Submit';
});
