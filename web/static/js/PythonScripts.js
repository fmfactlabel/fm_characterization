export const PYTHON_CODE = {
    PROCESS_FM: (fileName, name, isLight, desc) => `
from flamapy.metamodels.fm_metamodel.transformations import UVLReader, FeatureIDEReader, GlencoeReader, AFMReader, JSONReader
from fmfactlabel import FMCharacterization
import pathlib, json

def read_fm_file(filename: str):
    if filename.endswith(".uvl"): return UVLReader(filename).transform()
    elif filename.endswith((".xml", ".fide")): return FeatureIDEReader(filename).transform()
    elif filename.endswith("gfm.json"): return GlencoeReader(filename).transform()
    elif filename.endswith(".afm"): return AFMReader(filename).transform()
    elif filename.endswith(".json"): return JSONReader(filename).transform()
    return None

fm = read_fm_file("${fileName}")
char = FMCharacterization(fm, ${isLight ? "True" : "False"})
char.metadata.name = ${name} or pathlib.Path("${fileName}").stem
char.metadata.description = ${desc}

char.to_json_file(f"{char.metadata.name}.json")
with open(f"{char.metadata.name}.txt", 'w') as f: f.write(str(char))
char.metadata.name
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
`
};
//# sourceMappingURL=PythonScripts.js.map