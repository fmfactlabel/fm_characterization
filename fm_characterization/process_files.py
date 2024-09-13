import os
import numpy as np
from concurrent.futures import ThreadPoolExecutor, as_completed
from statistics import mean, median
from typing import Optional, Dict, Any, Tuple

from flamapy.metamodels.fm_metamodel.models import FeatureModel
from flamapy.metamodels.fm_metamodel.transformations import UVLReader, FeatureIDEReader

from fm_characterization import FMCharacterization, FMProperties
from .fm_utils import get_ratio_sizes


def read_fm_file(filename: str) -> Optional[FeatureModel]:
    try:
        if filename.endswith(".uvl"):
            return UVLReader(filename).transform()
        elif filename.endswith(".xml") or filename.endswith(".fide"):
            return FeatureIDEReader(filename).transform()
    except Exception as e:
        print(f"Error reading file with specific handler: {e}")

    try:
        return UVLReader(filename).transform()
    except Exception as e:
        print(f"Error reading file with UVLReader: {e}")

    try:
        return FeatureIDEReader(filename).transform()
    except Exception as e:
        print(f"Error reading file with FeatureIDEReader: {e}")

    return None


def process_single_file(file_path: str) -> Optional[FMCharacterization]:
    fm = read_fm_file(file_path)
    if fm:
        return FMCharacterization(fm)
    return None


def get_metrics_with_ratios() -> Dict[str, Any]:
    return {
        FMProperties.ABSTRACT_FEATURES.value.name: FMProperties.FEATURES.value.name,
        FMProperties.CONCRETE_FEATURES.value.name: FMProperties.FEATURES.value.name,
        FMProperties.ROOT_FEATURE.value.name: FMProperties.FEATURES.value.name,
        FMProperties.TOP_FEATURES.value.name: FMProperties.FEATURES.value.name,
        FMProperties.LEAF_FEATURES.value.name: FMProperties.FEATURES.value.name,
        FMProperties.COMPOUND_FEATURES.value.name: FMProperties.FEATURES.value.name,
        FMProperties.ABSTRACT_LEAF_FEATURES.value.name: FMProperties.ABSTRACT_FEATURES.value.name,
        FMProperties.ABSTRACT_COMPOUND_FEATURES.value.name: FMProperties.ABSTRACT_FEATURES.value.name,
        FMProperties.CONCRETE_LEAF_FEATURES.value.name: FMProperties.CONCRETE_FEATURES.value.name,
        FMProperties.CONCRETE_COMPOUND_FEATURES.value.name: FMProperties.CONCRETE_FEATURES.value.name,
        FMProperties.SOLITARY_FEATURES.value.name: FMProperties.FEATURES.value.name,
        FMProperties.GROUPED_FEATURES.value.name: FMProperties.FEATURES.value.name,
        FMProperties.MANDATORY_FEATURES.value.name: FMProperties.SOLITARY_FEATURES.value.name,
        FMProperties.OPTIONAL_FEATURES.value.name: FMProperties.SOLITARY_FEATURES.value.name,
        FMProperties.FEATURE_GROUPS.value.name: FMProperties.TREE_RELATIONSHIPS.value.name,
        FMProperties.ALTERNATIVE_GROUPS.value.name: FMProperties.GROUPED_FEATURES.value.name,
        FMProperties.OR_GROUPS.value.name: FMProperties.GROUPED_FEATURES.value.name,
        FMProperties.MUTEX_GROUPS.value.name: FMProperties.GROUPED_FEATURES.value.name,
        FMProperties.CARDINALITY_GROUPS.value.name: FMProperties.GROUPED_FEATURES.value.name,
        FMProperties.SIMPLE_CONSTRAINTS.value.name: FMProperties.CROSS_TREE_CONSTRAINTS.value.name,
        FMProperties.REQUIRES_CONSTRAINTS.value.name: FMProperties.SIMPLE_CONSTRAINTS.value.name,
        FMProperties.EXCLUDES_CONSTRAINTS.value.name: FMProperties.SIMPLE_CONSTRAINTS.value.name,
        FMProperties.COMPLEX_CONSTRAINTS.value.name: FMProperties.CROSS_TREE_CONSTRAINTS.value.name,
        FMProperties.PSEUDO_COMPLEX_CONSTRAINTS.value.name: FMProperties.COMPLEX_CONSTRAINTS.value.name,
        FMProperties.STRICT_COMPLEX_CONSTRAINTS.value.name: FMProperties.COMPLEX_CONSTRAINTS.value.name,
        FMProperties.EXTRA_CONSTRAINT_REPRESENTATIVENESS.value.name: (FMProperties.FEATURES.value.name, 2)
    }


def get_analysis_with_ratios() -> Dict[str, Any]:
    return {
        FMProperties.CORE_FEATURES.value.name: FMProperties.FEATURES.value.name,
        FMProperties.DEAD_FEATURES.value.name: FMProperties.FEATURES.value.name,
        FMProperties.VARIANT_FEATURES.value.name: FMProperties.FEATURES.value.name,
        FMProperties.FALSE_OPTIONAL_FEATURES.value.name: FMProperties.FEATURES.value.name
    }


def calculate_ratio(data: Dict[str, Dict], numerator_name: str, denominator_name: str, precision: int = 4, extra_data: Optional[Dict[str, Dict]] = None) -> Optional[float]:
    numerator_stats = data.get(numerator_name, {}).get('stats', {})
    
    denominator_stats = data.get(denominator_name, {}).get('stats', {})
    if extra_data and not denominator_stats:
        denominator_stats = extra_data.get(denominator_name, {}).get('stats', {})

    if 'mean' in numerator_stats and 'mean' in denominator_stats:
        numerator_mean = numerator_stats['mean']
        denominator_mean = denominator_stats['mean']
        return get_ratio_sizes(numerator_mean, denominator_mean, precision)

    return None




def process_files(extracted_files: list, extract_dir: str, zip_filename: str) -> Tuple[Dict[str, Any], Dict[str, Any], Optional[Dict[str, Any]]]:
    metrics_data = {}
    analysis_data = {}
    dataset_characterization = None

    futures = submit_file_processing_tasks(extracted_files, extract_dir)
    for future, file in futures.items():
        try:
            characterization = future.result()
            if characterization:
                if not dataset_characterization:
                    dataset_characterization = initialize_characterization(dataset_characterization, characterization, metrics_data, analysis_data)
                update_data(metrics_data, characterization)
                update_analysis_data(analysis_data, characterization)
        except Exception as e:
            print(f"Error processing file {file}: {e}")

    dataset_characterization_json = None
    if dataset_characterization and (metrics_data or analysis_data):
        dataset_characterization_json = generate_dataset_characterization_json(dataset_characterization, metrics_data, analysis_data, zip_filename)

    return metrics_data, analysis_data, dataset_characterization_json


def submit_file_processing_tasks(extracted_files: list, extract_dir: str):
    with ThreadPoolExecutor() as executor:
        return {executor.submit(process_single_file, os.path.join(extract_dir, file)): file for file in extracted_files if file.endswith('.uvl')}


def initialize_characterization(current_characterization, new_characterization, data, analysis_data):
    if current_characterization is None:
        current_characterization = new_characterization
        for m in new_characterization.metrics.get_metrics():
            data[m.property.name] = {'values': []}
        for a in new_characterization.analysis.get_analysis():
            analysis_data[a.property.name] = {'values': []}
    return current_characterization


def update_data(data, characterization):
    current_metrics = {m.property.name: m.size if m.size is not None else m.value for m in characterization.metrics.get_metrics()}

    for key, value in current_metrics.items():
        data[key]['values'].append(value)


def update_analysis_data(analysis_data, characterization):
    current_analysis = {a.property.name: a.size if a.size is not None else a.value for a in characterization.analysis.get_analysis()}

    for key, value in current_analysis.items():
        analysis_data[key]['values'].append(value)



def generate_dataset_characterization_json(dataset_characterization, metrics_data, analysis_data, zip_filename):
    dataset_characterization_json = dataset_characterization.to_json()
    dataset_characterization_json['metadata'][0]['value'] = zip_filename

    calculate_mean_values(metrics_data)
    calculate_mean_values(analysis_data)

    metrics_with_ratios = get_metrics_with_ratios()
    analysis_with_ratios = get_analysis_with_ratios()

    def process_stats(data, ratios, json_section):
        for item in json_section:
            name = item['name']
            if name in data:
                assign_metric_stats(item, data[name])

                if name in ratios:
                    ratio_info = ratios[name]
                    denominator_name, precision = ratio_info if isinstance(ratio_info, tuple) else (ratio_info, 4)
                    item['ratio'] = calculate_ratio(data, name, denominator_name, precision)


    process_stats(metrics_data, metrics_with_ratios, dataset_characterization_json['metrics'])
    process_stats(analysis_data, analysis_with_ratios, dataset_characterization_json['analysis'])
    
    for metric in dataset_characterization_json['metrics']:
        if 'value' in metric:
            metric['value'] = None
    for analysis in dataset_characterization_json['analysis']:
        if 'value' in analysis:
            analysis['value'] = None

    return dataset_characterization_json



def calculate_mean_values(data):
    for name, data in data.items():
        values = data['values']
        if values:
            stats = calculate_stats(values, name)
            data['stats'] = stats


def clean_values_based_on_name(values, name):
    if name == FMProperties.CONFIGURATIONS.value.name:
        return clean_configuration_values(values)
    elif name == FMProperties.VALID.value.name:
        return [v.lower() == 'yes' for v in values]
    else:
        return [float(v) for v in values]

def clean_configuration_values(values):
    clean_values = []
    has_le = False
    for v in values:
        if isinstance(v, str) and '≤' in v:
            has_le = True
            clean_values.append(float(v.replace('≤', '').strip()))
        else:
            clean_values.append(float(v))
    return clean_values, has_le

def calculate_stats(values, name):
    if name == FMProperties.CONFIGURATIONS.value.name:
        clean_values, has_le = clean_configuration_values(values)
    else:
        clean_values = clean_values_based_on_name(values, name)
        has_le = False


    if name == FMProperties.VALID.value.name:
        return {'mean': 'Yes' if any(clean_values) else 'No', 'median': None, 'min': None, 'max': None}

    mean_val = mean(clean_values) if clean_values else None
    median_val = median(clean_values) if clean_values else None
    min_val = min(clean_values) if clean_values else None
    max_val = max(clean_values) if clean_values else None


    return format_stats(mean_val, median_val, min_val, max_val, has_le)

def format_stats(mean_val, median_val, min_val, max_val, has_le):
    if has_le:
        return {
            'mean': f'≤ {mean_val}',
            'median': f'≤ {median_val}',
            'min': f'≤ {min_val}',
            'max': f'≤ {max_val}',
        }
    return {
        'mean': mean_val,
        'median': median_val,
        'min': min_val,
        'max': max_val,
    }

def assign_metric_stats(metric, data):
    values = data['values']
    if values:
        stats = calculate_stats(values, metric['name'])
        metric['size'] = stats['mean']
        metric['stats'] = stats


def calculate_percentiles(values):
    percentil_33 = np.percentile(values, 33)
    percentil_66 = np.percentile(values, 66)
    return {
        'percentil_33': percentil_33,
        'percentil_66': percentil_66
    }
    
def classify_value(value, percentil_33, percentil_66):
    try:
        value = float(value)  
    except ValueError:
        raise ValueError(f"Value {value} cannot be converted to a float")

    if value < percentil_33:
        return "low"
    elif value < percentil_66:
        return "medium"
    else:
        return "high"

