import os
import re
import zipfile
import tempfile
from urllib.parse import urlparse
import statistics
import pathlib
import urllib.request
import asyncio


from fmfactlabel import FMCharacterization


SPACE = ' '
INDENT_MULTIPLIER = 1  # change to 2 if you need more indentation
TEMPORAL_FOLDER = 'temp_dataset'


class DatasetCharacterization():
    
    def __init__(self, zipfile_path: str, light_fact_label: bool = False) -> None:
        self.zipfile_path = zipfile_path
        self.light_fact_label = light_fact_label
        self.metadata = None
        self.metrics = None
        self.analysis = None
    
    async def process_zipfile(self, on_progress: callable = None) -> list[FMCharacterization]:
        if not os.path.exists(TEMPORAL_FOLDER):
            os.makedirs(TEMPORAL_FOLDER)

        destination_folder = os.path.abspath(TEMPORAL_FOLDER)
        fm_characterizations = []
        try:
            with zipfile.ZipFile(self.zipfile_path, 'r') as zip_ref:
                for filename in zip_ref.namelist():
                    if filename.endswith('.uvl'):
                        # Security validation (Zip Slip vulnerability)
                        final_path = os.path.abspath(os.path.join(destination_folder, filename))
                        if not final_path.startswith(destination_folder + os.sep):
                            continue
                        # Extract file
                        zip_ref.extract(filename, destination_folder)
                        # Process the extracted file
                        characterization = await FMCharacterization.from_path_async(final_path, self.light_fact_label, on_progress)
                        fm_characterizations.append(characterization.to_json())
                        # Clean up the extracted file
                        os.remove(final_path)  
        except Exception as e:
            print(f"Error occurred while processing zipfile: {e}")
        finally:
            try:
                if os.path.exists(destination_folder) and not os.listdir(destination_folder):
                    os.rmdir(destination_folder)
            except OSError:
                pass  # Directory not empty or other error, ignore
        return fm_characterizations

    async def generate(self, on_progress: callable = None) -> dict:
        fm_characterizations = await self.process_zipfile(on_progress)
        if not fm_characterizations:
            raise Exception("No valid .uvl files found in the zipfile.")
        return self.characterize(fm_characterizations)
        

    @staticmethod
    async def from_path_async(zipfile_path: str, light_fact_label: bool = False, on_progress: callable = None) -> dict:
        """Load characterization from a feature model file."""
        if on_progress: 
            on_progress(10, "Reading feature model...")
            await asyncio.sleep(0)
        characterization = DatasetCharacterization(zipfile_path, light_fact_label)
        result = await characterization.generate(on_progress)
        result['metadata'][0]['value'] = pathlib.Path(zipfile_path).stem
        return result

    @staticmethod
    async def from_url_async(zipfile_url_path: str, light_fact_label: bool = False, on_progress: callable = None) -> dict:
        """Load characterization from a feature model URL."""
        if on_progress: on_progress(10, "Reading feature model from URL...")
        with tempfile.NamedTemporaryFile(suffix=".uvl", mode='w+', delete=True) as tmp:
            urllib.request.urlretrieve(zipfile_url_path, tmp.name)
            characterization = await DatasetCharacterization.from_path(tmp.name, light_fact_label, on_progress)
            characterization['metadata'][0]['value'] = get_filename_from_url(zipfile_url_path)
            return characterization
    
    @staticmethod
    def from_path(zipfile_path: str, light_fact_label: bool = False) -> dict:
        """Load characterization from a feature model file."""
        characterization = DatasetCharacterization(zipfile_path, light_fact_label)
        result = asyncio.run(characterization.generate())
        print(result)
        result['metadata'][0]['value'] = pathlib.Path(zipfile_path).stem
        return result

    @staticmethod
    def from_url(zipfile_url_path: str, light_fact_label: bool = False) -> dict:
        """Load characterization from a feature model URL."""
        with tempfile.NamedTemporaryFile(suffix=".uvl", mode='w+', delete=True) as tmp:
            urllib.request.urlretrieve(zipfile_url_path, tmp.name)
            characterization = asyncio.run(DatasetCharacterization.from_path(tmp.name, light_fact_label))
            characterization['metadata'][0]['value'] = get_filename_from_url(zipfile_url_path)
            return characterization
    
    @staticmethod
    def characterize(characterizations: list[dict]) -> dict:
        """
        Agrega múltiples caracterizaciones de modelos en una sola de dataset.
        """
        # Categorías del FMData
        categories = ['metadata', 'metrics', 'analysis']
        result = {cat: [] for cat in categories}
        
        model_names = [pathlib.Path(c['metadata'][0]['value']).stem for c in characterizations]

        for cat in categories:
            # Tomamos las propiedades del primer modelo como plantilla
            prop_names = [p['name'] for p in characterizations[0][cat]]

            for prop_name in prop_names:
                # Extraer valores numéricos de todos los modelos para esta propiedad
                values_with_names = []
                for idx, data in enumerate(characterizations):
                    prop = next((p for p in data[cat] if p['name'] == prop_name), None)
                    val = DatasetCharacterization._extract_numeric_value(prop)
                    if val is not None:
                        values_with_names.append({'val': val, 'name': model_names[idx]})

                print(f"Property '{prop_name}' in category '{cat}': extracted values - {values_with_names}")
                if not values_with_names:
                    # Si no es numérico (ej. Metadata tipo texto), mantenemos el del primero
                    base_prop = next(p for p in characterizations[0][cat] if p['name'] == prop_name)
                    result[cat].append(base_prop)
                    continue

                # Ordenar para cálculos estadísticos
                raw_values = sorted([v['val'] for v in values_with_names])
                stats = DatasetCharacterization._calculate_stats(raw_values, values_with_names)

                # Crear la propiedad de "Dataset"
                base_prop = next(p for p in characterizations[0][cat] if p['name'] == prop_name).copy()
                
                base_prop.update({
                    'value': stats['median'], # Valor principal para la etiqueta
                    'ratio': DatasetCharacterization._calculate_avg_ratio(characterizations, cat, prop_name),
                    'is_dataset': True,
                    'dataset_stats': stats
                })
                result[cat].append(base_prop)

        return result
    
    @staticmethod
    def _extract_numeric_value(prop: dict) -> float:
        if not prop: return None
        # Priorizar 'size' si existe, si no 'value'
        val = prop.get('size') if prop.get('size') is not None else prop.get('value')
        try:
            if val is None:
                return None
            if isinstance(val, (list, tuple)):
                return None  # No se pueden procesar listas o tuplas como valores numéricos
            if isinstance(val, str):
                if val.lower() in ['yes', 'no']:
                    return 1.0 if val.lower() == 'yes' else 0.0
                match = re.search(r"[-+]?\d*\.?\d+", val)  # Buscamos: un posible '-', seguido de dígitos, un posible punto y más dígitos
                if match:
                    val = match.group()  # Extraemos el número encontrado
            return float(val)
            #return float(val) if not isinstance(val, (list, tuple)) else None
        except (ValueError, TypeError):
            return None

    @staticmethod
    def _calculate_stats(sorted_vals: list[float], original_data: list[dict]) -> dict:
        n = len(sorted_vals)
        mean_val = statistics.mean(sorted_vals)
        
        # Quartiles y Mediana
        q1 = sorted_vals[int(n * 0.25)]
        median = statistics.median(sorted_vals)
        q3 = sorted_vals[int(n * 0.75)]
        
        # Outliers e identificación
        min_val = sorted_vals[0]
        max_val = sorted_vals[-1]
        
        min_model = next((d['name'] for d in original_data if d['val'] == min_val), "Unknown")
        max_model = next((d['name'] for d in original_data if d['val'] == max_val), "Unknown")

        return {
            'count': n,
            'mean': mean_val,
            'median': median,
            'min': min_val,
            'max': max_val,
            'q1': q1,
            'q3': q3,
            'sd': statistics.stdev(sorted_vals) if n > 1 else 0,
            'raw_values': sorted_vals,
            'outliers': {
                'min_model_name': min_model,
                'max_model_name': max_model
            }
        }

    @staticmethod
    def _calculate_avg_ratio(models: list[dict], cat: str, prop_name: str) -> float:
        ratios = []
        for m in models:
            prop = next((p for p in m[cat] if p['name'] == prop_name), None)
            if prop and 'ratio' in prop:
                ratios.append(prop['ratio'])
        if any(r is None for r in ratios):
            return None
        return statistics.mean(ratios) if ratios else 0
    

def get_filename_from_url(url: str) -> str:
    """
    Extract the file name from a URL using pathlib.

    Example:
    - https://.../models/pizzas.uvl?token=XYZ -> pizzas
    """
    parsed = urlparse(url)
    path = pathlib.PurePosixPath(parsed.path)  # Use PurePosixPath to handle POSIX paths
    return path.name.split('.')[0]