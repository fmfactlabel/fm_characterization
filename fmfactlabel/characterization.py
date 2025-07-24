import json
import tempfile
from urllib.parse import urlparse
import pathlib
from typing import Any
import urllib.request

from flamapy.core.exceptions import FlamaException
from flamapy.metamodels.fm_metamodel.models import FeatureModel
from flamapy.metamodels.fm_metamodel.transformations import (
    UVLReader,
    FeatureIDEReader,
    AFMReader,
    GlencoeReader,
    JSONReader
)

from fmfactlabel import FMProperty, FMAnalysis, FMMetadata, FMMetrics


SPACE = ' '
INDENT_MULTIPLIER = 1  # change to 2 if you need more indentation


class FMCharacterization():
    
    def __init__(self, model: FeatureModel, light_fact_label: bool = False) -> None:
        self.metadata = FMMetadata(model)
        self.metrics = FMMetrics(model)
        self.analysis = FMAnalysis(model, light_fact_label)
    
    @staticmethod
    def from_path(fm_filepath: str, light_fact_label: bool = False) -> 'FMCharacterization':
        """Load characterization from a feature model file."""
        fm_model = read_fm_file(fm_filepath)
        characterization = FMCharacterization(fm_model, light_fact_label)
        characterization.metadata.name = fm_filepath.split('.')[0]
        return characterization

    @staticmethod
    def from_url(fm_url_filepath: str, light_fact_label: bool = False) -> 'FMCharacterization':
        """Load characterization from a feature model URL."""
        with tempfile.NamedTemporaryFile(suffix=".uvl", mode='w+', delete=True) as tmp:
            urllib.request.urlretrieve(fm_url_filepath, tmp.name)
            characterization = FMCharacterization.from_path(tmp.name, light_fact_label)
            characterization.metadata.name = get_filename_from_url(fm_url_filepath)
            return characterization
    
    def clean(self) -> None:
        self.analysis.clean()

    def __str__(self) -> str:
        lines = ['METADATA']
        for property in self.metadata.get_metadata():
            name = property.property.name
            value = str(property.value)
            lines.append(f'{name}: {value}')    

        lines.append('METRICS')
        for property in self.metrics.get_metrics():
            indentation = SPACE * get_parents_numbers(property.property)
            name = property.property.name
            value = str(property.value) if property.size is None else str(property.size)
            ratio = f' ({str(property.ratio*100)}%)' if property.ratio is not None else ''
            lines.append(f'{indentation}{name}: {value}{ratio}')    
        
        lines.append('ANALYSIS')
        for property in self.analysis.get_analysis():
            indentation = SPACE * get_parents_numbers(property.property)
            name = property.property.name
            value = str(property.value) if property.size is None else str(property.size)
            ratio = f' ({str(property.ratio*100)}%)' if property.ratio is not None else ''
            lines.append(f'{indentation}{name}: {value}{ratio}')    
        return '\n'.join(lines)

    @staticmethod
    def json_to_text(data: dict) -> str:
        lines = ['METADATA']
        for prop in data.get("metadata", []):
            name = prop.get("name")
            value = str(prop.get("value", "None"))
            lines.append(f"{name}: {value}")

        lines.append('METRICS')
        for prop in data.get("metrics", []):
            indentation = SPACE * (prop.get("level", 0) * INDENT_MULTIPLIER)
            name = prop.get("name")
            value = str(prop["size"]) if prop.get("size") is not None else str(prop.get("value"))
            ratio = prop.get("ratio")
            ratio_str = f" ({round(ratio * 100, 2)}%)" if ratio is not None else ""
            lines.append(f"{indentation}{name}: {value}{ratio_str}")

        lines.append('ANALYSIS')
        for prop in data.get("analysis", []):
            indentation = SPACE * (prop.get("level", 0) * INDENT_MULTIPLIER)
            name = prop.get("name")
            value = str(prop["size"]) if prop.get("size") is not None else str(prop.get("value"))
            ratio = prop.get("ratio")
            ratio_str = f" ({round(ratio * 100, 2)}%)" if ratio is not None else ""
            lines.append(f"{indentation}{name}: {value}{ratio_str}")

        return "\n".join(lines)

    def to_json(self) -> dict[Any]:
        metadata = []
        metrics = []
        analysis = []

        for property in self.metadata.get_metadata():
            metadata.append(property.to_dict())

        for property in self.metrics.get_metrics():
            metrics.append(property.to_dict())

        for property in self.analysis.get_analysis():
            analysis.append(property.to_dict())

        result = {}
        result['metadata'] = metadata
        result['metrics'] = metrics
        result['analysis'] = analysis
        return result

    def to_json_str(self) -> str:
        result = self.to_json()
        return json.dumps(result, indent=4)

    def to_json_file(self, filepath: str = None) -> None:
        result = self.to_json()
        with open(filepath, 'w', encoding='utf-8') as output_file:
            json.dump(result, output_file, indent=4)


def get_parents_numbers(property: FMProperty) -> int:
    if property.parent is None:
        return 1
    return 1 + get_parents_numbers(property.parent)


def read_fm_file(filename: str) -> FeatureModel | None:
    try:
        if filename.endswith(".uvl"):
            return UVLReader(filename).transform()
        elif filename.endswith(".xml") or filename.endswith(".fide"):
            return FeatureIDEReader(filename).transform()
        elif filename.endswith(".afm"):
            return AFMReader(filename).transform()
        elif filename.endswith(".gfm.json"):
            return GlencoeReader(filename).transform()
        elif filename.endswith(".json"):
            return JSONReader(filename).transform()
    except Exception as e:
        raise FlamaException(f"Error reading feature model from {filename}: {e}")
    return None


def get_filename_from_url(url: str) -> str:
    """
    Extract the file name from a URL using pathlib.

    Example:
    - https://.../models/pizzas.uvl?token=XYZ -> pizzas
    """
    parsed = urlparse(url)
    path = pathlib.PurePosixPath(parsed.path)  # Use PurePosixPath to handle POSIX paths
    return path.name.split('.')[0]