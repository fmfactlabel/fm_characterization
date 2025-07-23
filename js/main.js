// Tooltips
$(function () {
    $('[data-toggle="tooltip"]').tooltip()
});

// BibTeX copy function
const bibtexEntry = `
@article{Horcas2025_FMFactLabel,
  author       = {Jos{\'{e}} Miguel Horcas and Jos{\'{e}} A. Galindo and Lidia Fuentes and David Benavides},
  title        = {{FM} fact label},
  journal      = {Sci. Comput. Program.},
  volume       = {240},
  pages        = {103214},
  year         = {2025},
  url          = {https://doi.org/10.1016/j.scico.2024.103214},
  doi          = {10.1016/J.SCICO.2024.103214},
  timestamp    = {Mon, 21 Oct 2024 11:11:55 +0200},
  biburl       = {https://dblp.org/rec/journals/scp/HorcasGFB25.bib},
  bibsource    = {dblp computer science bibliography, https://dblp.org}
}`;

function copyBibTeX() {
    const tempTextarea = document.createElement("textarea");
    tempTextarea.value = bibtexEntry;
    document.body.appendChild(tempTextarea);
    tempTextarea.select();
    document.execCommand("copy");
    document.body.removeChild(tempTextarea);
}

// // Chart of countries
// function chart_countries() {
//     var ctx = document.getElementById('chart_countries');
//     data = '{{data["usage_stats"]["countries"] | tojson | safe}}';
//     data = JSON.parse(data);
//     var x = Object.keys(data);
//     var y = Object.values(data);

//     new Chart(ctx, {
//         type: 'bar',
//         data: {
//             labels: x,
//             datasets: [{
//                 label: 'Countries',
//                 data: y,
//             }]
//         },
//         options: {
//             scales: {
//                 y: {
//                     beginAtZero: true,
//                     title: { display: true, text: "Fact Labels generated" },
//                     ticks: {
//                         callback: function (value) {
//                             return Number.isInteger(value) ? value : null;
//                         }
//                     }
//                 },
//                 x: {
//                     title: { display: true, text: "Countries" },
//                 }
//             },
//             plugins: {
//                 legend: { display: false },
//                 tooltip: {
//                     displayColors: false,
//                     callbacks: {
//                         label: function (context) {
//                             return context.parsed.y;
//                         },
//                     }
//                 }
//             }
//         }
//     });
// }
// chart_countries();

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
        await micropip.install("flamapy/fact_label_json_gen-1.8.0-py3-none-any.whl", deps=False)
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
from flamapy.metamodels.fm_metamodel.transformations import UVLReader, FeatureIDEReader

from fm_characterization import FMCharacterization
from typing import Optional
import pathlib
import json

def read_fm_file(filename: str) -> Optional[FeatureModel]:
    try:
        if filename.endswith(".uvl"):
            return UVLReader(filename).transform()
        elif filename.endswith(".xml") or filename.endswith(".fide"):
            return FeatureIDEReader(filename).transform()
    except Exception as e:
        print(e)
    try:
        return UVLReader(filename).transform()
    except Exception as e:
        print(e)
    try:
        return FeatureIDEReader(filename).transform()
    except Exception as e:
        print(e)
    return None

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

characterization.to_json_file("fm_characterization.json")


with open("fm_characterization.json", "r", encoding="utf-8") as f:
    json_data = json.load(f)

text_representation = FMCharacterization.json_to_text(json_data)
with open("fm_characterization.txt", "w", encoding="utf-8") as f:
    f.write(text_representation)

`;

    try {
        await pyodideInstance.runPythonAsync(pyCode);
        const jsonString = pyodideInstance.FS.readFile("fm_characterization.json", { encoding: "utf8" });
        const fmData = JSON.parse(jsonString);
        drawFMFactLabel(fmData);
    } catch (error) {
        console.error("Pyodide Error:", error);
        document.getElementById("result").innerHTML = `<div class="alert alert-danger">Error: ${error}</div>`;
    }

    document.getElementById("submitButton").innerHTML = 'Submit';
});
