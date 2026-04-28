import math
import pathlib
import logging
from typing import Any
import asyncio

from fmfactlabel import FMProperties, FMPropertyMeasure, FMMetrics
from .fm_utils import get_ratio, get_nof_configuration_as_str, get_percentage_str

from flamapy.metamodels.fm_metamodel.models import FeatureModel
from flamapy.metamodels.pysat_metamodel.transformations import FmToPysat
from flamapy.metamodels.z3_metamodel.transformations import FmToZ3
from flamapy.metamodels.bdd_metamodel.transformations import FmToBDD
from flamapy.metamodels.pysat_metamodel import operations as sat_operations
from flamapy.metamodels.bdd_metamodel import operations as bdd_operations
from flamapy.metamodels.fm_metamodel import operations as fm_operations
from flamapy.metamodels.z3_metamodel import operations as z3_operations


class FMAnalysis():

    def __init__(self, 
                 model: FeatureModel, 
                 metrics: FMMetrics,
                 light_fact_label: bool = False) -> None:
        self.fm = model
        self.metrics = metrics
        self.light_fact_label = light_fact_label
        
    async def calculate_analysis(self, on_progress: callable = None) -> None:
        self.bdd_model = None
        self.sat_model = None
        self.z3_model = None
        self._configurations = None
        self._boolean_configurations = None
        self._approximation = None
        self._boolean_approximation = None
        self._features = self.metrics.metrics[FMProperties.FEATURES.value]
        self._language_level = fm_operations.FMLanguageLevel().execute(self.fm).get_result()

        if not self.light_fact_label:
            try:
                if on_progress: 
                    on_progress(40, "Obtaining analytical metrics...", "BDD transformation")
                    await asyncio.sleep(0)
                self.bdd_model = FmToBDD(self.fm).transform()
            except Exception as e:
                logging.warning(f'Warning: the feature model is too large to build the BDD model. (Exception: {e})')
                
        if self.bdd_model is not None:  
            if on_progress: 
                on_progress(50, "Obtaining analytical metrics...", "BDD analysis")
                await asyncio.sleep(0)
            self._boolean_configurations = bdd_operations.BDDConfigurationsNumber().execute(self.bdd_model).get_result()
            self._boolean_approximation = None
            self._fip = bdd_operations.BDDFeatureInclusionProbability().execute(self.bdd_model).get_result()
            self._pd = bdd_operations.BDDProductDistribution().execute(self.bdd_model).get_result()
            self._descriptive_statistics = descriptive_statistics(self._pd)
            self._core_features = [feat for feat, prob, in self._fip.items() if prob >= 1.0]
            self._dead_features = [feat for feat, prob, in self._fip.items() if prob <= 0.0]
            self._variant_features = [feat for feat, prob, in self._fip.items() if 0.0 < prob < 1.0]
            self._false_optional_features = bdd_operations.BDDFalseOptionalFeatures().execute(self.bdd_model).get_result()
        else:  # The BDD could not be built
            self._fip = None
            self._pd = None
            self._descriptive_statistics = None
            if on_progress: 
                on_progress(50 if self.light_fact_label else 60, "Obtaining analytical metrics...", "SAT transformation")
                await asyncio.sleep(0)
            self.sat_model = FmToPysat(self.fm).transform()
            self.sat_model.original_model = self.fm

            if on_progress: 
                on_progress(60 if self.light_fact_label else 70, "Obtaining analytical metrics...", "SAT analysis")
                await asyncio.sleep(0)
            print("Calculating estimated number of Boolean configurations...")
            self._boolean_configurations = fm_operations.FMEstimatedConfigurationsNumber().execute(self.fm).get_result()
            if self.fm.get_constraints():
                if self._boolean_configurations <= 1e3:  # Try to calculate the exact number of configurations if the number of Boolean configurations is not too high
                    print("Calculating exact number of Boolean configurations with PySAT...")
                    self._boolean_configurations = sat_operations.PySATConfigurationsNumber().execute(self.sat_model).get_result()
                    self._boolean_approximation = None
                else:
                    self._boolean_approximation = '≤'
            else:
                self._boolean_approximation = None
            print("Calculating core with PySAT...")
            #backbone = sat_operations.PySATBackbone().execute(self.sat_model).get_result()
            self._core_features = sat_operations.PySATCoreFeatures().execute(self.sat_model).get_result()
            print("Calculating dead with PySAT...")
            self._dead_features = sat_operations.PySATDeadFeatures().execute(self.sat_model).get_result()
            print("Calculating variant with PySAT...")
            self._variant_features = [f for f in self._features if f not in self._core_features and f not in self._dead_features]
            print("Finished SAT analysis.")
            self._false_optional_features = sat_operations.PySATFalseOptionalFeatures().execute(self.sat_model).get_result()
        self._configurations = self._boolean_configurations
        self._approximation = self._boolean_approximation
        self._unbounded_features = []
        if self._language_level.major != fm_operations.MajorLevel.BOOLEAN:
            unbounded_features_cardinalities = [f.name for f in self.fm.get_features() if f.is_multifeature() and (f.feature_cardinality.min == -1 or f.feature_cardinality.max == -1)]
            self._unbounded_features = unbounded_features_cardinalities
            if self._unbounded_features:
                    self._configurations = float('inf')
                    self._approximation = None
            else:
                self._approximation = '≈'
                if not self.light_fact_label:
                    if on_progress: 
                        on_progress(70 if self.light_fact_label else 80, "Obtaining analytical metrics...", "SMT transformation")
                        await asyncio.sleep(0)
                    self.z3_model = FmToZ3(self.fm).transform()
                    if on_progress: 
                        on_progress(80 if self.light_fact_label else 90, "Obtaining analytical metrics...", "SMT analysis")
                        await asyncio.sleep(0)
                    print("Calculating backbone with Z3...")
                    backbone = z3_operations.Z3Backbone().execute(self.z3_model).get_result()
                    self._core_features = backbone['core']
                    self._dead_features = backbone['dead']
                    print("Calculating variant with Z3...")
                    self._variant_features = [f for f in self._features if f not in self._core_features and f not in self._dead_features]
                    self._false_optional_features = z3_operations.Z3FalseOptionalFeatures().execute(self.z3_model).get_result()
                    features_bounds = z3_operations.Z3AllFeatureBounds().execute(self.z3_model).get_result()
                    _unbounded_typed_features = []
                    for feature, bounds in features_bounds.items():
                        if not bounds['bounded']:
                            _unbounded_typed_features.append(feature)
                    self._unbounded_features = list(set(unbounded_features_cardinalities + _unbounded_typed_features))
                    if self._unbounded_features:
                        self._configurations = float('inf')
                        self._approximation = None
                    else:
                        if self._boolean_configurations <= 1e3:  # Try to calculate the exact number of configurations if the number of Boolean configurations is not too high
                            print("Calculating exact number of configurations with Z3...")
                            self._configurations = z3_operations.Z3ConfigurationsNumber().execute(self.z3_model).get_result()
                            self._approximation = None
        if on_progress:
            on_progress(95, "Obtaining analytical metrics...", "Finishing analysis")
            await asyncio.sleep(0) 
        print("Finished analysis.")

    def clean(self) -> None:
        if self.bdd_model is not None:
            logging.warning(f'BDD temp filepath: {self.bdd_model.bdd_file}')
            filepath = self.bdd_model.bdd_file
            filepath = filepath + '.dddmp' if not filepath.endswith('.dddmp') else filepath
            bdd_filepath = pathlib.Path(filepath)
            if bdd_filepath.exists():
                bdd_filepath.unlink()

    def get_analysis(self) -> list[FMPropertyMeasure]:
        result = []
        result.append(self.fm_valid())
        result.append(self.fm_core_features())
        result.append(self.fm_false_optional_features())
        result.append(self.fm_dead_features())
        result.append(self.fm_variant_features())
        if self.bdd_model is not None:
            result.append(self.fm_unique_features())
        if self._fip is not None:
            result.append(self.fm_pure_optional_features())
        result.append(self.fm_configurations_number())
        if self._language_level.major != fm_operations.MajorLevel.BOOLEAN:
            result.append(self.fm_boolean_configurations_number())
            if self.z3_model is not None:
                result.append(self.fm_unbounded_features())
        result.append(self.fm_total_variability())
        result.append(self.fm_partial_variability())
        if self.bdd_model is not None:
            result.append(self.fm_homogeneity())
        if self._descriptive_statistics is not None:
            result.append(self.fm_product_distribution())
            result.append(self.fm_mean_pd())
            result.append(self.fm_std_pd())
            result.append(self.fm_median_pd())
            result.append(self.fm_mad_pd())
            result.append(self.fm_mode_pd())
            result.append(self.fm_min_pd())
            result.append(self.fm_max_pd())
            result.append(self.fm_range_pd())
        return result

    def fm_valid(self) -> FMPropertyMeasure:
        if self.z3_model is not None:
            _valid = z3_operations.Z3Satisfiable().execute(self.z3_model).get_result()
        elif self.bdd_model is not None:
            _valid = self._configurations > 0
        else:
            _valid = sat_operations.PySATSatisfiable().execute(self.sat_model).get_result()
        _result = 'Yes' if _valid else 'No'
        return FMPropertyMeasure(FMProperties.VALID.value, _result)

    def fm_core_features(self) -> FMPropertyMeasure:
        return FMPropertyMeasure(FMProperties.CORE_FEATURES.value,
                                 self._core_features, 
                                 len(self._core_features),
                                 get_ratio(self._core_features, self._features))

    def fm_dead_features(self) -> FMPropertyMeasure:
        return FMPropertyMeasure(FMProperties.DEAD_FEATURES.value, 
                                 self._dead_features, 
                                 len(self._dead_features),
                                 get_ratio(self._dead_features, self._features))

    def fm_variant_features(self) -> FMPropertyMeasure:
        return FMPropertyMeasure(FMProperties.VARIANT_FEATURES.value, 
                        self._variant_features, 
                        len(self._variant_features),
                        get_ratio(self._variant_features, self._features))
    
    def fm_unique_features(self) -> FMPropertyMeasure:
        _unique_features = bdd_operations.BDDUniqueFeatures().execute(self.bdd_model).get_result()
        return FMPropertyMeasure(FMProperties.UNIQUE_FEATURES.value, 
                                 _unique_features, 
                                 len(_unique_features),
                                 get_ratio(_unique_features, self._features))
    
    def fm_pure_optional_features(self) -> FMPropertyMeasure:
        _pure_optional_features = [feat for feat, prob, in self._fip.items() if prob == 0.5]
        return FMPropertyMeasure(FMProperties.PURE_OPTIONAL_FEATURES.value, 
                                 _pure_optional_features, 
                                 len(_pure_optional_features),
                                 get_ratio(_pure_optional_features, self._features))

    def fm_false_optional_features(self) -> FMPropertyMeasure:
        _false_optional_features = self._false_optional_features
        return FMPropertyMeasure(FMProperties.FALSE_OPTIONAL_FEATURES.value, 
                                 _false_optional_features, 
                                 len(_false_optional_features),
                                 get_ratio(_false_optional_features, self._features))

    def fm_configurations_number(self) -> FMPropertyMeasure:
        if self._configurations == float('inf'):
            _configurations_str = '∞ (inf)'
        else:
            _configurations_str = get_nof_configuration_as_str(self._configurations, self._approximation)
        return FMPropertyMeasure(FMProperties.CONFIGURATIONS.value, _configurations_str)

    def fm_boolean_configurations_number(self) -> FMPropertyMeasure:
        _boolean_configurations = get_nof_configuration_as_str(self._boolean_configurations, self._boolean_approximation)
        return FMPropertyMeasure(FMProperties.BOOLEAN_CONFIGURATIONS.value, _boolean_configurations)
    
    def fm_unbounded_features(self) -> FMPropertyMeasure:
        return FMPropertyMeasure(FMProperties.UNBOUNDED_FEATURES.value, self._unbounded_features, len(self._unbounded_features), get_ratio(self._unbounded_features, self._features))

    def fm_total_variability(self) -> FMPropertyMeasure:
        _configs = self._configurations if self._configurations != float('inf') else self._boolean_configurations
        _total_variability = _configs / (2 ** len(self._features) - 1)
        _total_variability = get_percentage_str(_total_variability, 2) + "%"
        return FMPropertyMeasure(FMProperties.TOTAL_VARIABILITY.value, _total_variability)
    
    def fm_partial_variability(self) -> FMPropertyMeasure:
        _configs = self._configurations if self._configurations != float('inf') else self._boolean_configurations
        _partial_variability = 0 if not self._variant_features else _configs / (2 ** len(self._variant_features) - 1)
        _partial_variability = get_percentage_str(_partial_variability, 2) + "%"
        return FMPropertyMeasure(FMProperties.PARTIAL_VARIABILITY.value, _partial_variability)
    
    def fm_homogeneity(self) -> FMPropertyMeasure:
        _homogeneity = bdd_operations.BDDHomogeneity().execute(self.bdd_model).get_result()
        _homogeneity = get_percentage_str(_homogeneity, 2) + "%"
        return FMPropertyMeasure(FMProperties.HOMOGENEITY.value, _homogeneity)

    def fm_product_distribution(self) -> FMPropertyMeasure:
        return FMPropertyMeasure(FMProperties.PRODUCT_DISTRIBUTION.value, None)

    def fm_mean_pd(self) -> FMPropertyMeasure:
        _mean_pd = round(self._descriptive_statistics['Mean'], 2)
        return FMPropertyMeasure(FMProperties.PD_MEAN.value, _mean_pd)
    
    def fm_std_pd(self) -> FMPropertyMeasure:
        _std_pd = round(self._descriptive_statistics['Standard deviation'], 2)
        return FMPropertyMeasure(FMProperties.PD_STD.value, _std_pd)
    
    def fm_median_pd(self) -> FMPropertyMeasure:
        _median_pd = round(self._descriptive_statistics['Median'], 2)
        return FMPropertyMeasure(FMProperties.PD_MEDIAN.value, _median_pd)
    
    def fm_mad_pd(self) -> FMPropertyMeasure:
        _mad_pd = round(self._descriptive_statistics['Median absolute deviation'], 2)
        return FMPropertyMeasure(FMProperties.PD_MAD.value, _mad_pd)
    
    def fm_mode_pd(self) -> FMPropertyMeasure:
        return FMPropertyMeasure(FMProperties.PD_MODE.value, self._descriptive_statistics['Mode'])
    
    def fm_min_pd(self) -> FMPropertyMeasure:
        return FMPropertyMeasure(FMProperties.PD_MIN.value, self._descriptive_statistics['Min'])
    
    def fm_max_pd(self) -> FMPropertyMeasure:
        return FMPropertyMeasure(FMProperties.PD_MAX.value, self._descriptive_statistics['Max'])
    
    def fm_range_pd(self) -> FMPropertyMeasure:
        return FMPropertyMeasure(FMProperties.PD_RANGE.value, self._descriptive_statistics['Range'])


def descriptive_statistics(frequencies: list[int]) -> dict[str, Any]:
    total_count = sum(frequencies)
    
    # Mean calculation
    mean = sum(i * freq for i, freq in enumerate(frequencies)) / total_count
    
    # Standard deviation calculation
    variance = sum(freq * (i - mean) ** 2 for i, freq in enumerate(frequencies)) / total_count
    std_dev = math.sqrt(variance)
    
    # Median calculation
    cumulative_count = 0
    median_position = total_count / 2
    median = None
    for i, freq in enumerate(frequencies):
        cumulative_count += freq
        if cumulative_count >= median_position:
            median = i
            break
    
    # Median Absolute Deviation (MAD) calculation
    cumulative_count = 0
    mad_total = 0
    for i, freq in enumerate(frequencies):
        mad_total += freq * abs(i - median)
    mad = mad_total / total_count
    
    # Mode calculation
    mode_val = max(range(len(frequencies)), key=lambda i: frequencies[i])
    
    # Min and Max calculation
    min_val = next(i for i, freq in enumerate(frequencies) if freq > 0)
    max_val = next(i for i, freq in reversed(list(enumerate(frequencies))) if freq > 0)
    
    # Range calculation
    range_val = max_val - min_val


    return {
        'Mean': mean,
        'Standard deviation': std_dev,
        'Median': median,
        'Median absolute deviation': mad,
        'Mode': mode_val,
        'Min': min_val,
        'Max': max_val,
        'Range': range_val
    }