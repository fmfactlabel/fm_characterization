import math
import pathlib
import logging
from typing import Any

from fmfactlabel import FMProperties, FMPropertyMeasure
from .fm_utils import get_ratio, get_nof_configuration_as_str, get_percentage_str

from flamapy.metamodels.fm_metamodel.models import FeatureModel
from flamapy.metamodels.pysat_metamodel.transformations import FmToPysat
from flamapy.metamodels.bdd_metamodel.transformations import FmToBDD
from flamapy.metamodels.pysat_metamodel import operations as sat_operations
from flamapy.metamodels.bdd_metamodel import operations as bdd_operations
from flamapy.metamodels.fm_metamodel import operations as fm_operations


class FMAnalysis():

    def __init__(self, model: FeatureModel, light_fact_label: bool = False) -> None:
        self.fm = model
        self.light_fact_label = light_fact_label
        self.bdd_model = None
        self.sat_model = FmToPysat(model).transform()
        self.sat_model.original_model = self.fm
        if not self.light_fact_label:
            try:
                self.bdd_model = FmToBDD(model).transform()
            except Exception as e:
                logging.warning(f'Warning: the feature model is too large to build the BDD model. (Exception: {e})')

        # For performance purposes
        self._features = self.fm.get_features()
        if self.bdd_model is not None:
            self._configurations = bdd_operations.BDDConfigurationsNumber().execute(self.bdd_model).get_result()
            self._approximation = False
            self._fip = bdd_operations.BDDFeatureInclusionProbability().execute(self.bdd_model).get_result()
            self._pd = bdd_operations.BDDProductDistribution().execute(self.bdd_model).get_result()
            self._descriptive_statistics = descriptive_statistics(self._pd)
            self._core_features = [feat for feat, prob, in self._fip.items() if prob >= 1.0]
            self._dead_features = [feat for feat, prob, in self._fip.items() if prob <= 0.0]
            self._variant_features = [feat for feat, prob, in self._fip.items() if 0.0 < prob < 1.0]
        else:
            self._configurations = fm_operations.FMEstimatedConfigurationsNumber().execute(self.fm).get_result()
            self._approximation = True
            self._core_features = sat_operations.PySATCoreFeatures().execute(self.sat_model).get_result()
            self._dead_features = sat_operations.PySATDeadFeatures().execute(self.sat_model).get_result()
            self._variant_features = [f.name for f in self._features 
                                      if f.name not in self._core_features and
                                      f.name not in self._dead_features]
            self._fip = None
            self._descriptive_statistics = None

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
        if self.bdd_model is not None:
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
        if self.bdd_model is not None:
            _false_optional_features = [feat for feat in self._core_features 
                                        if not self.fm.get_feature_by_name(feat).is_root() and 
                                        not self.fm.get_feature_by_name(feat).is_mandatory()]
        else:
            try:
                _false_optional_features = sat_operations.PySATFalseOptionalFeatures().execute(self.sat_model).get_result()
            except AssertionError as e:
                logging.warning(f'Warning: Feature model has feature cardinalities, false optional features cannot be computed.\n {e}')
                _false_optional_features = []
        return FMPropertyMeasure(FMProperties.FALSE_OPTIONAL_FEATURES.value, 
                                 _false_optional_features, 
                                 len(_false_optional_features),
                                 get_ratio(_false_optional_features, self._features))

    def fm_configurations_number(self) -> FMPropertyMeasure:
        _configurations = get_nof_configuration_as_str(self._configurations, self._approximation, len(self.fm.get_constraints()))
        return FMPropertyMeasure(FMProperties.CONFIGURATIONS.value, _configurations)
    
    def fm_total_variability(self) -> FMPropertyMeasure:
        _total_variability = self._configurations / (2 ** len(self._features) - 1)
        _total_variability = get_percentage_str(_total_variability, 2) + "%"
        return FMPropertyMeasure(FMProperties.TOTAL_VARIABILITY.value, _total_variability)
    
    def fm_partial_variability(self) -> FMPropertyMeasure:
        _partial_variability = 0 if not self._variant_features else self._configurations / (2 ** len(self._variant_features) - 1)
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