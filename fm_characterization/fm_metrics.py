import statistics
from typing import Any
from collections import defaultdict

from fm_characterization import FMProperties, FMPropertyMeasure
from .fm_utils import get_ratio
from . import constraints_utils as ctcs_utils
from flamapy.metamodels.fm_metamodel.models import FeatureModel, Feature, FeatureType
from flamapy.metamodels.fm_metamodel import operations as fm_operations


class FMMetrics():

    PRECISION: int = 2

    def __init__(self, model: FeatureModel):
        self.fm = model
        self._metrics: dict[str, Any] = traverse_metrics(self.fm)
                     
    def get_metrics(self) -> list[FMPropertyMeasure]:
        result = []
        result.append(self.fm_features())
        result.append(self.fm_abstract_features())
        result.append(self.fm_abstract_leaf_features())
        result.append(self.fm_abstract_compound_features())
        result.append(self.fm_concrete_features())
        result.append(self.fm_concrete_leaf_features())
        result.append(self.fm_concrete_compound_features())
        result.append(self.fm_compound_features())
        result.append(self.fm_leaf_features())
        result.append(self.fm_root_feature())
        result.append(self.fm_top_features())
        result.append(self.fm_solitary_features())
        result.append(self.fm_grouped_features())
        result.append(self.fm_typed_features())
        result.append(self.fm_numerical_features())
        result.append(self.fm_integer_features())
        result.append(self.fm_real_features())
        result.append(self.fm_string_features())
        result.append(self.fm_multi_features())
        result.append(self.fm_tree_relationships())
        result.append(self.fm_mandatory_features())
        result.append(self.fm_optional_features())
        result.append(self.fm_feature_groups())
        result.append(self.fm_alternative_groups())
        result.append(self.fm_or_groups())
        result.append(self.fm_mutex_groups())
        result.append(self.fm_cardinality_groups())
        result.append(self.fm_depth_tree())
        result.append(self.fm_mean_depth_tree())
        result.append(self.fm_avg_branching_factor())
        result.append(self.fm_min_children_per_feature())
        result.append(self.fm_max_children_per_feature())
        result.append(self.fm_avg_children_per_feature())
        result.append(self.fm_cross_tree_constraints())
        result.append(self.fm_logical_constraints())
        result.append(self.fm_single_feature_constraints())
        result.append(self.fm_simple_constraints())
        result.append(self.fm_requires_constraints())
        result.append(self.fm_excludes_constraints())
        result.append(self.fm_complex_constraints())
        result.append(self.fm_pseudocomplex_constraints())
        result.append(self.fm_strictcomplex_constraints())
        result.append(self.fm_arithmetic_constraints())
        result.append(self.fm_aggregation_constraints())
        result.append(self.fm_extra_constraint_representativeness())
        result.append(self.fm_min_features_per_constraint())
        result.append(self.fm_max_features_per_constraint())
        result.append(self.fm_avg_features_per_constraint())
        result.append(self.fm_avg_constraints_per_feature())
        result.append(self.fm_min_constraints_per_feature())
        result.append(self.fm_max_constraints_per_feature())
        result.append(self.fm_feature_attributes())
        result.append(self.fm_features_with_attributes())
        result.append(self.fm_min_attributes_per_feature())
        result.append(self.fm_max_attributes_per_feature())
        result.append(self.fm_avg_attributes_per_feature())
        result.append(self.fm_avg_attributes_per_feature_with_attributes())
        return result

    def fm_features(self) -> FMPropertyMeasure:
        _features = self._metrics[FMProperties.FEATURES.value]
        return FMPropertyMeasure(FMProperties.FEATURES.value, _features, len(_features))

    def fm_abstract_features(self) -> FMPropertyMeasure:
        _abstract_features = self._metrics[FMProperties.ABSTRACT_FEATURES.value]
        return FMPropertyMeasure(FMProperties.ABSTRACT_FEATURES.value, 
                                 _abstract_features, 
                                 len(_abstract_features),
                                 get_ratio(_abstract_features, self.fm_features().value))

    def fm_concrete_features(self) -> FMPropertyMeasure:
        _concrete_features = self._metrics[FMProperties.CONCRETE_FEATURES.value]
        return FMPropertyMeasure(FMProperties.CONCRETE_FEATURES.value, 
                                 _concrete_features, 
                                 len(_concrete_features),
                                 get_ratio(_concrete_features, self.fm_features().value))
    
    def fm_root_feature(self) -> FMPropertyMeasure:
        _root_feature = self._metrics[FMProperties.ROOT_FEATURE.value]
        return FMPropertyMeasure(FMProperties.ROOT_FEATURE.value, 
                                 _root_feature,
                                 len(_root_feature), 
                                 get_ratio(_root_feature, self.fm_features().value))

    def fm_top_features(self) -> FMPropertyMeasure:
        _top_features = self._metrics[FMProperties.TOP_FEATURES.value]
        return FMPropertyMeasure(FMProperties.TOP_FEATURES.value, 
                                 _top_features, 
                                 len(_top_features),
                                 get_ratio(_top_features, self.fm_features().value))

    def fm_leaf_features(self) -> FMPropertyMeasure:
        _leaf_features = self._metrics[FMProperties.LEAF_FEATURES.value]
        return FMPropertyMeasure(FMProperties.LEAF_FEATURES.value, 
                                 _leaf_features, 
                                 len(_leaf_features),
                                 get_ratio(_leaf_features, self.fm_features().value))

    def fm_compound_features(self) -> FMPropertyMeasure:
        _compound_features = self._metrics[FMProperties.COMPOUND_FEATURES.value]
        return FMPropertyMeasure(FMProperties.COMPOUND_FEATURES.value, 
                                 _compound_features, 
                                 len(_compound_features),
                                 get_ratio(_compound_features, self.fm_features().value))

    def fm_abstract_leaf_features(self) -> FMPropertyMeasure:
        _abstract_leaf_features = self._metrics[FMProperties.ABSTRACT_LEAF_FEATURES.value]
        return FMPropertyMeasure(FMProperties.ABSTRACT_LEAF_FEATURES.value, 
                                 _abstract_leaf_features, 
                                 len(_abstract_leaf_features),
                                 get_ratio(_abstract_leaf_features, self.fm_abstract_features().value))
    
    def fm_abstract_compound_features(self) -> FMPropertyMeasure:
        _abstract_compound_features = self._metrics[FMProperties.ABSTRACT_COMPOUND_FEATURES.value]
        return FMPropertyMeasure(FMProperties.ABSTRACT_COMPOUND_FEATURES.value, 
                                 _abstract_compound_features, 
                                 len(_abstract_compound_features),
                                 get_ratio(_abstract_compound_features, self.fm_abstract_features().value))

    def fm_concrete_leaf_features(self) -> FMPropertyMeasure:
        _concrete_leaf_features = self._metrics[FMProperties.CONCRETE_LEAF_FEATURES.value]
        return FMPropertyMeasure(FMProperties.CONCRETE_LEAF_FEATURES.value, 
                                 _concrete_leaf_features, 
                                 len(_concrete_leaf_features),
                                 get_ratio(_concrete_leaf_features, self.fm_concrete_features().value))
    
    def fm_concrete_compound_features(self) -> FMPropertyMeasure:
        _concrete_compound_features = self._metrics[FMProperties.CONCRETE_COMPOUND_FEATURES.value]
        return FMPropertyMeasure(FMProperties.CONCRETE_COMPOUND_FEATURES.value, 
                                 _concrete_compound_features, 
                                 len(_concrete_compound_features),
                                 get_ratio(_concrete_compound_features, self.fm_concrete_features().value))

    def fm_tree_relationships(self) -> FMPropertyMeasure:
        _tree_relationships = self._metrics[FMProperties.TREE_RELATIONSHIPS.value]
        return FMPropertyMeasure(FMProperties.TREE_RELATIONSHIPS.value, 
                                 _tree_relationships, 
                                 len(_tree_relationships))

    def fm_solitary_features(self) -> FMPropertyMeasure:
        _solitary_features = self._metrics[FMProperties.SOLITARY_FEATURES.value]
        return FMPropertyMeasure(FMProperties.SOLITARY_FEATURES.value, 
                                 _solitary_features, 
                                 len(_solitary_features),
                                 get_ratio(_solitary_features, self.fm_features().value))

    def fm_grouped_features(self) -> FMPropertyMeasure:
        _grouped_features = self._metrics[FMProperties.GROUPED_FEATURES.value]
        return FMPropertyMeasure(FMProperties.GROUPED_FEATURES.value, 
                                 _grouped_features, 
                                 len(_grouped_features),
                                 get_ratio(_grouped_features, self.fm_features().value))

    def fm_mandatory_features(self) -> FMPropertyMeasure:
        _mandatory_features = self._metrics[FMProperties.MANDATORY_FEATURES.value]
        return FMPropertyMeasure(FMProperties.MANDATORY_FEATURES.value, 
                                 _mandatory_features, 
                                 len(_mandatory_features),
                                 get_ratio(_mandatory_features, self.fm_solitary_features().value))

    def fm_optional_features(self) -> FMPropertyMeasure:
        _optional_features = self._metrics[FMProperties.OPTIONAL_FEATURES.value]
        return FMPropertyMeasure(FMProperties.OPTIONAL_FEATURES.value, 
                                 _optional_features, 
                                 len(_optional_features),
                                 get_ratio(_optional_features, self.fm_solitary_features().value))

    def fm_feature_groups(self) -> FMPropertyMeasure:
        _feature_groups = self._metrics[FMProperties.FEATURE_GROUPS.value]
        return FMPropertyMeasure(FMProperties.FEATURE_GROUPS.value, 
                                 _feature_groups, 
                                 len(_feature_groups),
                                 get_ratio(_feature_groups, self.fm_tree_relationships().value))
    
    def fm_alternative_groups(self) -> FMPropertyMeasure:
        _alternative_groups = self._metrics[FMProperties.ALTERNATIVE_GROUPS.value]
        return FMPropertyMeasure(FMProperties.ALTERNATIVE_GROUPS.value, 
                                 _alternative_groups, 
                                 len(_alternative_groups),
                                 get_ratio(_alternative_groups, self.fm_feature_groups().value))
    
    def fm_or_groups(self) -> FMPropertyMeasure:
        _or_groups = self._metrics[FMProperties.OR_GROUPS.value]
        return FMPropertyMeasure(FMProperties.OR_GROUPS.value, 
                                 _or_groups, 
                                 len(_or_groups),
                                 get_ratio(_or_groups, self.fm_feature_groups().value))

    def fm_mutex_groups(self) -> FMPropertyMeasure:
        _mutex_groups = self._metrics[FMProperties.MUTEX_GROUPS.value]
        return FMPropertyMeasure(FMProperties.MUTEX_GROUPS.value, 
                                 _mutex_groups, 
                                 len(_mutex_groups),
                                 get_ratio(_mutex_groups, self.fm_grouped_features().value))

    def fm_cardinality_groups(self) -> FMPropertyMeasure:
        _cardinality_groups = self._metrics[FMProperties.CARDINALITY_GROUPS.value]
        return FMPropertyMeasure(FMProperties.CARDINALITY_GROUPS.value, 
                                 _cardinality_groups, 
                                 len(_cardinality_groups),
                                 get_ratio(_cardinality_groups, self.fm_grouped_features().value))
    
    def fm_depth_tree(self) -> FMPropertyMeasure:
        _max_depth_tree = self._metrics[FMProperties.DEPTH_TREE.value]
        return FMPropertyMeasure(FMProperties.DEPTH_TREE.value, _max_depth_tree)

    def fm_mean_depth_tree(self) -> FMPropertyMeasure:
        _mean_depth_tree = self._metrics[FMProperties.MEAN_DEPTH_TREE.value]
        return FMPropertyMeasure(FMProperties.MEAN_DEPTH_TREE.value, round(_mean_depth_tree, FMMetrics.PRECISION))

    def fm_avg_branching_factor(self) -> FMPropertyMeasure:
        _avg_branching_factor = self._metrics[FMProperties.BRANCHING_FACTOR.value]
        return FMPropertyMeasure(FMProperties.BRANCHING_FACTOR.value, _avg_branching_factor)

    def fm_min_children_per_feature(self) -> FMPropertyMeasure:
        _min_children_per_feature = self._metrics[FMProperties.MIN_CHILDREN_PER_FEATURE.value]
        return FMPropertyMeasure(FMProperties.MIN_CHILDREN_PER_FEATURE.value, _min_children_per_feature)

    def fm_max_children_per_feature(self) -> FMPropertyMeasure:
        _max_children_per_feature = self._metrics[FMProperties.MAX_CHILDREN_PER_FEATURE.value]
        return FMPropertyMeasure(FMProperties.MAX_CHILDREN_PER_FEATURE.value, _max_children_per_feature)

    def fm_avg_children_per_feature(self) -> FMPropertyMeasure:
        _avg_children_per_feature = self._metrics[FMProperties.AVG_CHILDREN_PER_FEATURE.value]
        return FMPropertyMeasure(FMProperties.AVG_CHILDREN_PER_FEATURE.value, round(_avg_children_per_feature, FMMetrics.PRECISION))

    def fm_cross_tree_constraints(self) -> FMPropertyMeasure:
        _cross_tree_constraints = self._metrics[FMProperties.CROSS_TREE_CONSTRAINTS.value]
        return FMPropertyMeasure(FMProperties.CROSS_TREE_CONSTRAINTS.value, 
                                 _cross_tree_constraints,
                                 len(_cross_tree_constraints))

    def fm_logical_constraints(self) -> FMPropertyMeasure:
        _logical_constraints = self._metrics[FMProperties.LOGICAL_CONSTRAINTS.value]
        return FMPropertyMeasure(FMProperties.LOGICAL_CONSTRAINTS.value, 
                                 _logical_constraints,
                                 len(_logical_constraints),
                                 get_ratio(_logical_constraints, self.fm_cross_tree_constraints().value))
    
    def fm_arithmetic_constraints(self) -> FMPropertyMeasure:
        _arithmetic_constraints = self._metrics[FMProperties.ARITHMETIC_CONSTRAINTS.value]
        return FMPropertyMeasure(FMProperties.ARITHMETIC_CONSTRAINTS.value, 
                                 _arithmetic_constraints,
                                 len(_arithmetic_constraints),
                                 get_ratio(_arithmetic_constraints, self.fm_cross_tree_constraints().value))
    
    def fm_aggregation_constraints(self) -> FMPropertyMeasure:
        _aggregation_constraints = self._metrics[FMProperties.AGGREGATION_CONSTRAINTS.value]
        return FMPropertyMeasure(FMProperties.AGGREGATION_CONSTRAINTS.value, 
                                 _aggregation_constraints,
                                 len(_aggregation_constraints),
                                 get_ratio(_aggregation_constraints, self.fm_cross_tree_constraints().value))
    
    def fm_single_feature_constraints(self) -> FMPropertyMeasure:
        _single_feature_constraints = self._metrics[FMProperties.SINGLE_FEATURE_CONSTRAINTS.value]
        return FMPropertyMeasure(FMProperties.SINGLE_FEATURE_CONSTRAINTS.value, 
                                 _single_feature_constraints,
                                 len(_single_feature_constraints),
                                 get_ratio(_single_feature_constraints, self.fm_logical_constraints().value))

    def fm_simple_constraints(self) -> FMPropertyMeasure:
        _simple_constraints = self._metrics[FMProperties.SIMPLE_CONSTRAINTS.value]
        return FMPropertyMeasure(FMProperties.SIMPLE_CONSTRAINTS.value, 
                                 _simple_constraints,
                                 len(_simple_constraints),
                                 get_ratio(_simple_constraints, self.fm_logical_constraints().value))

    def fm_requires_constraints(self) -> FMPropertyMeasure:
        _requires_constraints = self._metrics[FMProperties.REQUIRES_CONSTRAINTS.value]
        return FMPropertyMeasure(FMProperties.REQUIRES_CONSTRAINTS.value, 
                                 _requires_constraints,
                                 len(_requires_constraints),
                                 get_ratio(_requires_constraints, self.fm_simple_constraints().value))

    def fm_excludes_constraints(self) -> FMPropertyMeasure:
        _excludes_constraints = self._metrics[FMProperties.EXCLUDES_CONSTRAINTS.value]
        return FMPropertyMeasure(FMProperties.EXCLUDES_CONSTRAINTS.value, 
                                 _excludes_constraints,
                                 len(_excludes_constraints),
                                 get_ratio(_excludes_constraints, self.fm_simple_constraints().value))

    def fm_complex_constraints(self) -> FMPropertyMeasure:
        _complex_constraints = self._metrics[FMProperties.COMPLEX_CONSTRAINTS.value]
        return FMPropertyMeasure(FMProperties.COMPLEX_CONSTRAINTS.value, 
                                 _complex_constraints,
                                 len(_complex_constraints),
                                 get_ratio(_complex_constraints, self.fm_logical_constraints().value))

    def fm_pseudocomplex_constraints(self) -> FMPropertyMeasure:
        _pseudocomplex_constraints = self._metrics[FMProperties.PSEUDO_COMPLEX_CONSTRAINTS.value]
        return FMPropertyMeasure(FMProperties.PSEUDO_COMPLEX_CONSTRAINTS.value, 
                                 _pseudocomplex_constraints,
                                 len(_pseudocomplex_constraints),
                                 get_ratio(_pseudocomplex_constraints, self.fm_complex_constraints().value))

    def fm_strictcomplex_constraints(self) -> FMPropertyMeasure:
        _strictcomplex_constraints = self._metrics[FMProperties.STRICT_COMPLEX_CONSTRAINTS.value]
        return FMPropertyMeasure(FMProperties.STRICT_COMPLEX_CONSTRAINTS.value, 
                                 _strictcomplex_constraints,
                                 len(_strictcomplex_constraints),
                                 get_ratio(_strictcomplex_constraints, self.fm_complex_constraints().value))

    def fm_extra_constraint_representativeness(self) -> FMPropertyMeasure:
        _features_in_constraints = self._metrics[FMProperties.EXTRA_CONSTRAINT_REPRESENTATIVENESS.value]
        _ecr = get_ratio(_features_in_constraints, self.fm_features().value, FMMetrics.PRECISION)
        return FMPropertyMeasure(FMProperties.EXTRA_CONSTRAINT_REPRESENTATIVENESS.value,
                                 _features_in_constraints,
                                 len(_features_in_constraints),
                                 _ecr)

    def fm_min_constraints_per_feature(self) -> FMPropertyMeasure:
        _constraints_per_feature = self._metrics[FMProperties.MIN_CONSTRAINTS_PER_FEATURE.value]
        return FMPropertyMeasure(FMProperties.MIN_CONSTRAINTS_PER_FEATURE.value, _constraints_per_feature)

    def fm_max_constraints_per_feature(self) -> FMPropertyMeasure:
        _constraints_per_feature = self._metrics[FMProperties.MAX_CONSTRAINTS_PER_FEATURE.value]
        return FMPropertyMeasure(FMProperties.MAX_CONSTRAINTS_PER_FEATURE.value, _constraints_per_feature)

    def fm_avg_constraints_per_feature(self) -> FMPropertyMeasure:
        _constraints_per_feature = self._metrics[FMProperties.AVG_CONSTRAINTS_PER_FEATURE.value]
        return FMPropertyMeasure(FMProperties.AVG_CONSTRAINTS_PER_FEATURE.value, round(_constraints_per_feature, FMMetrics.PRECISION))
    
    def fm_min_features_per_constraint(self) -> FMPropertyMeasure:
        _features_per_constraint = self._metrics[FMProperties.MIN_FEATURES_PER_CONSTRAINT.value]
        return FMPropertyMeasure(FMProperties.MIN_FEATURES_PER_CONSTRAINT.value, _features_per_constraint)

    def fm_max_features_per_constraint(self) -> FMPropertyMeasure:
        _features_per_constraint = self._metrics[FMProperties.MAX_FEATURES_PER_CONSTRAINT.value]
        return FMPropertyMeasure(FMProperties.MAX_FEATURES_PER_CONSTRAINT.value, _features_per_constraint)

    def fm_avg_features_per_constraint(self) -> FMPropertyMeasure:
        _features_per_constraint = self._metrics[FMProperties.AVG_FEATURES_PER_CONSTRAINT.value]
        return FMPropertyMeasure(FMProperties.AVG_FEATURES_PER_CONSTRAINT.value, round(_features_per_constraint, FMMetrics.PRECISION))
    
    def fm_feature_attributes(self) -> FMPropertyMeasure:
        _result = self._metrics[FMProperties.FEATURE_ATTRIBUTES.value]
        return FMPropertyMeasure(FMProperties.FEATURE_ATTRIBUTES.value, _result, len(_result))
    
    def fm_features_with_attributes(self) -> FMPropertyMeasure:
        _result = self._metrics[FMProperties.FEATURES_WITH_ATTRIBUTES.value]
        return FMPropertyMeasure(FMProperties.FEATURES_WITH_ATTRIBUTES.value, _result, len(_result), 
                                 get_ratio(_result, self.fm_features().value))
    
    def fm_min_attributes_per_feature(self) -> FMPropertyMeasure:
        _result = self._metrics[FMProperties.MIN_ATTRIBUTES_PER_FEATURE.value]
        return FMPropertyMeasure(FMProperties.MIN_ATTRIBUTES_PER_FEATURE.value, _result)

    def fm_max_attributes_per_feature(self) -> FMPropertyMeasure:
        _result = self._metrics[FMProperties.MAX_ATTRIBUTES_PER_FEATURE.value]
        return FMPropertyMeasure(FMProperties.MAX_ATTRIBUTES_PER_FEATURE.value, _result)

    def fm_avg_attributes_per_feature(self) -> FMPropertyMeasure:
        _result = self._metrics[FMProperties.AVG_ATTRIBUTES_PER_FEATURE.value]
        return FMPropertyMeasure(FMProperties.AVG_ATTRIBUTES_PER_FEATURE.value, round(_result, FMMetrics.PRECISION))

    def fm_avg_attributes_per_feature_with_attributes(self) -> FMPropertyMeasure:
        _result = self._metrics[FMProperties.AVG_ATTRIBUTES_PER_FEATURE_WITH_ATTRIBUTES.value]
        return FMPropertyMeasure(FMProperties.AVG_ATTRIBUTES_PER_FEATURE_WITH_ATTRIBUTES.value, round(_result, FMMetrics.PRECISION))

    def fm_multi_features(self) -> FMPropertyMeasure:
        _result = self._metrics[FMProperties.MULTI_FEATURES.value]
        return FMPropertyMeasure(FMProperties.MULTI_FEATURES.value, 
                                 _result,
                                 len(_result),
                                 get_ratio(_result, self.fm_features().value))

    def fm_typed_features(self) -> FMPropertyMeasure:
        _result = self._metrics[FMProperties.TYPED_FEATURES.value]
        return FMPropertyMeasure(FMProperties.TYPED_FEATURES.value, 
                                 _result,
                                 len(_result),
                                 get_ratio(_result, self.fm_features().value))

    def fm_numerical_features(self) -> FMPropertyMeasure:
        _result = self._metrics[FMProperties.NUMERICAL_FEATURES.value]
        return FMPropertyMeasure(FMProperties.NUMERICAL_FEATURES.value, 
                                 _result,
                                 len(_result),
                                 get_ratio(_result, self.fm_features().value))

    def fm_integer_features(self) -> FMPropertyMeasure:
        _result = self._metrics[FMProperties.INTEGER_FEATURES.value]
        return FMPropertyMeasure(FMProperties.INTEGER_FEATURES.value, 
                                 _result,
                                 len(_result),
                                 get_ratio(_result, self.fm_features().value))
    
    def fm_real_features(self) -> FMPropertyMeasure:
        _result = self._metrics[FMProperties.REAL_FEATURES.value]
        return FMPropertyMeasure(FMProperties.REAL_FEATURES.value, 
                                 _result,
                                 len(_result),
                                 get_ratio(_result, self.fm_features().value))
    
    def fm_string_features(self) -> FMPropertyMeasure:
        _result = self._metrics[FMProperties.STRING_FEATURES.value]
        return FMPropertyMeasure(FMProperties.STRING_FEATURES.value, 
                                 _result,
                                 len(_result),
                                 get_ratio(_result, self.fm_features().value))
    

def traverse_metrics(fm: FeatureModel) -> dict[str, Any]:
    """Calculate all metrics from the feature model in only one traversing of the tree."""
    metrics: dict[str, Any] = {}
    if fm is None:
        return metrics
    ## Features metrics
    metrics[FMProperties.FEATURES.value] = list()
    metrics[FMProperties.ABSTRACT_FEATURES.value] = list()
    metrics[FMProperties.CONCRETE_FEATURES.value] = list()
    metrics[FMProperties.LEAF_FEATURES.value] = list()
    metrics[FMProperties.COMPOUND_FEATURES.value] = list()
    metrics[FMProperties.CONCRETE_COMPOUND_FEATURES.value] = list()
    metrics[FMProperties.CONCRETE_LEAF_FEATURES.value] = list()
    metrics[FMProperties.ABSTRACT_COMPOUND_FEATURES.value] = list()
    metrics[FMProperties.ABSTRACT_LEAF_FEATURES.value] = list()
    metrics[FMProperties.TREE_RELATIONSHIPS.value] = list()
    metrics[FMProperties.ROOT_FEATURE.value] = list()
    metrics[FMProperties.TOP_FEATURES.value] = list()
    metrics[FMProperties.SOLITARY_FEATURES.value] = list()
    metrics[FMProperties.GROUPED_FEATURES.value] = list()
    metrics[FMProperties.MANDATORY_FEATURES.value] = list()
    metrics[FMProperties.OPTIONAL_FEATURES.value] = list()
    metrics[FMProperties.FEATURE_GROUPS.value] = list()
    metrics[FMProperties.ALTERNATIVE_GROUPS.value] = list()
    metrics[FMProperties.OR_GROUPS.value] = list()
    metrics[FMProperties.MUTEX_GROUPS.value] = list()
    metrics[FMProperties.CARDINALITY_GROUPS.value] = list()
    metrics[FMProperties.MIN_CHILDREN_PER_FEATURE.value] = None
    metrics[FMProperties.MAX_CHILDREN_PER_FEATURE.value] = 0
    metrics[FMProperties.AVG_CHILDREN_PER_FEATURE.value] = list()
    metrics[FMProperties.DEPTH_TREE.value] = 0
    metrics[FMProperties.MEAN_DEPTH_TREE.value] = list()
    metrics[FMProperties.FEATURE_ATTRIBUTES.value] = set()
    metrics[FMProperties.FEATURES_WITH_ATTRIBUTES.value] = list()
    metrics[FMProperties.AVG_ATTRIBUTES_PER_FEATURE.value] = list()
    metrics[FMProperties.AVG_ATTRIBUTES_PER_FEATURE_WITH_ATTRIBUTES.value] = list()
    metrics['Branches'] = 0
    metrics['Children'] = 0
    metrics[FMProperties.INTEGER_FEATURES.value] = list()
    metrics[FMProperties.REAL_FEATURES.value] = list()
    metrics[FMProperties.STRING_FEATURES.value] = list()
    metrics[FMProperties.NUMERICAL_FEATURES.value] = list()
    metrics[FMProperties.TYPED_FEATURES.value] = list()
    metrics[FMProperties.MULTI_FEATURES.value] = list()

    traverse_feature_metrics(fm.root, metrics)
    metrics[FMProperties.BRANCHING_FACTOR.value] = 0 if metrics['Branches'] == 0 else round(metrics['Children'] / metrics['Branches'], FMMetrics.PRECISION)
    metrics[FMProperties.MEAN_DEPTH_TREE.value] = 0 if not metrics[FMProperties.MEAN_DEPTH_TREE.value] else statistics.mean(metrics[FMProperties.MEAN_DEPTH_TREE.value])
    metrics[FMProperties.AVG_CHILDREN_PER_FEATURE.value] = 0 if not metrics[FMProperties.AVG_CHILDREN_PER_FEATURE.value] else statistics.mean(metrics[FMProperties.AVG_CHILDREN_PER_FEATURE.value])
    metrics[FMProperties.MIN_ATTRIBUTES_PER_FEATURE.value] = 0 if not metrics[FMProperties.AVG_ATTRIBUTES_PER_FEATURE.value] else min(metrics[FMProperties.AVG_ATTRIBUTES_PER_FEATURE.value])
    metrics[FMProperties.MAX_ATTRIBUTES_PER_FEATURE.value] = 0 if not metrics[FMProperties.AVG_ATTRIBUTES_PER_FEATURE.value] else max(metrics[FMProperties.AVG_ATTRIBUTES_PER_FEATURE.value])
    metrics[FMProperties.AVG_ATTRIBUTES_PER_FEATURE.value] = 0 if not metrics[FMProperties.AVG_ATTRIBUTES_PER_FEATURE.value] else statistics.mean(metrics[FMProperties.AVG_ATTRIBUTES_PER_FEATURE.value])
    metrics[FMProperties.AVG_ATTRIBUTES_PER_FEATURE_WITH_ATTRIBUTES.value] = 0 if not metrics[FMProperties.AVG_ATTRIBUTES_PER_FEATURE_WITH_ATTRIBUTES.value] else statistics.mean(metrics[FMProperties.AVG_ATTRIBUTES_PER_FEATURE_WITH_ATTRIBUTES.value])
    metrics[FMProperties.FEATURE_ATTRIBUTES.value] = list(metrics[FMProperties.FEATURE_ATTRIBUTES.value])

    ## Constraints metrics
    metrics[FMProperties.CROSS_TREE_CONSTRAINTS.value] = list()
    metrics[FMProperties.LOGICAL_CONSTRAINTS.value] = list()
    metrics[FMProperties.ARITHMETIC_CONSTRAINTS.value] = list()
    metrics[FMProperties.AGGREGATION_CONSTRAINTS.value] = list()
    metrics[FMProperties.SINGLE_FEATURE_CONSTRAINTS.value] = list()
    metrics[FMProperties.SIMPLE_CONSTRAINTS.value] = list()
    metrics[FMProperties.REQUIRES_CONSTRAINTS.value] = list()
    metrics[FMProperties.EXCLUDES_CONSTRAINTS.value] = list()
    metrics[FMProperties.COMPLEX_CONSTRAINTS.value] = list()
    metrics[FMProperties.PSEUDO_COMPLEX_CONSTRAINTS.value] = list()
    metrics[FMProperties.STRICT_COMPLEX_CONSTRAINTS.value] = list()
    metrics[FMProperties.AVG_CONSTRAINTS_PER_FEATURE.value] = defaultdict(int)
    metrics[FMProperties.EXTRA_CONSTRAINT_REPRESENTATIVENESS.value] = set()
    metrics[FMProperties.AVG_FEATURES_PER_CONSTRAINT.value] = list()

    traverse_constraints_metrics(fm, metrics)
    metrics[FMProperties.MIN_FEATURES_PER_CONSTRAINT.value] = 0 if not metrics[FMProperties.AVG_FEATURES_PER_CONSTRAINT.value] else min(metrics[FMProperties.AVG_FEATURES_PER_CONSTRAINT.value])
    metrics[FMProperties.MAX_FEATURES_PER_CONSTRAINT.value] = 0 if not metrics[FMProperties.AVG_FEATURES_PER_CONSTRAINT.value] else max(metrics[FMProperties.AVG_FEATURES_PER_CONSTRAINT.value])
    metrics[FMProperties.AVG_FEATURES_PER_CONSTRAINT.value] = 0 if not metrics[FMProperties.AVG_FEATURES_PER_CONSTRAINT.value] else statistics.mean(metrics[FMProperties.AVG_FEATURES_PER_CONSTRAINT.value])
    metrics[FMProperties.MIN_CONSTRAINTS_PER_FEATURE.value] = 0 if not metrics[FMProperties.AVG_CONSTRAINTS_PER_FEATURE.value] else min(metrics[FMProperties.AVG_CONSTRAINTS_PER_FEATURE.value].values())
    metrics[FMProperties.MAX_CONSTRAINTS_PER_FEATURE.value] = 0 if not metrics[FMProperties.AVG_CONSTRAINTS_PER_FEATURE.value] else max(metrics[FMProperties.AVG_CONSTRAINTS_PER_FEATURE.value].values())
    metrics[FMProperties.AVG_CONSTRAINTS_PER_FEATURE.value] = 0 if not metrics[FMProperties.AVG_CONSTRAINTS_PER_FEATURE.value] else statistics.mean(metrics[FMProperties.AVG_CONSTRAINTS_PER_FEATURE.value].values())
    metrics[FMProperties.EXTRA_CONSTRAINT_REPRESENTATIVENESS.value] = list(metrics[FMProperties.EXTRA_CONSTRAINT_REPRESENTATIVENESS.value])
    return metrics


def traverse_feature_metrics(feature: Feature, metrics: dict[str, Any], depth: int = 0) -> None:
    if feature is not None:
        metrics[FMProperties.FEATURES.value].append(feature.name)
        if feature.parent is None:
            metrics[FMProperties.ROOT_FEATURE.value].append(feature.name)
            metrics[FMProperties.SOLITARY_FEATURES.value].append(feature.name)
        elif feature.parent.is_root():
            metrics[FMProperties.TOP_FEATURES.value].append(feature.name)
        if feature.parent is not None and not feature.parent.is_group():
            metrics[FMProperties.SOLITARY_FEATURES.value].append(feature.name)
        if feature.feature_cardinality.min != 1 or feature.feature_cardinality.max != 1:
            metrics[FMProperties.MULTI_FEATURES.value].append(feature.name)
        if feature.feature_type != FeatureType.BOOLEAN:
            metrics[FMProperties.TYPED_FEATURES.value].append(feature.name)
            if feature.feature_type == FeatureType.INTEGER:
                metrics[FMProperties.INTEGER_FEATURES.value].append(feature.name)
                metrics[FMProperties.NUMERICAL_FEATURES.value].append(feature.name)
            elif feature.feature_type == FeatureType.REAL:
                metrics[FMProperties.REAL_FEATURES.value].append(feature.name)
                metrics[FMProperties.NUMERICAL_FEATURES.value].append(feature.name)
            elif feature.feature_type == FeatureType.STRING:
                metrics[FMProperties.STRING_FEATURES.value].append(feature.name)

        # Attributes
        attributes = feature.get_attributes()
        metrics[FMProperties.AVG_ATTRIBUTES_PER_FEATURE.value].append(len(attributes))
        if attributes:
            metrics[FMProperties.FEATURES_WITH_ATTRIBUTES.value].append(feature.name)
            metrics[FMProperties.AVG_ATTRIBUTES_PER_FEATURE_WITH_ATTRIBUTES.value].append(len(attributes))
            for attribute in attributes:
                metrics[FMProperties.FEATURE_ATTRIBUTES.value].add(attribute.name)

        relations = feature.get_relations()
        n_children = 0
        if relations:  # it is a compound feature (non leaf)
            metrics[FMProperties.COMPOUND_FEATURES.value].append(feature.name)
            if feature.is_abstract:
                metrics[FMProperties.ABSTRACT_FEATURES.value].append(feature.name)
                metrics[FMProperties.ABSTRACT_COMPOUND_FEATURES.value].append(feature.name)
            else:
                metrics[FMProperties.CONCRETE_FEATURES.value].append(feature.name)
                metrics[FMProperties.CONCRETE_COMPOUND_FEATURES.value].append(feature.name)
            metrics['Branches'] += 1

            for relation in feature.get_relations():
                metrics[FMProperties.TREE_RELATIONSHIPS.value].append(str(relation))
                if relation.is_mandatory():
                    n_children += 1
                    metrics[FMProperties.MANDATORY_FEATURES.value].append(feature.name)
                    traverse_feature_metrics(relation.children[0], metrics, depth + 1)
                elif relation.is_optional():
                    n_children += 1
                    metrics[FMProperties.OPTIONAL_FEATURES.value].append(feature.name)
                    traverse_feature_metrics(relation.children[0], metrics, depth + 1)
                elif relation.is_group():
                    n_children += len(relation.children)
                    metrics[FMProperties.FEATURE_GROUPS.value].append(str(relation))
                    if relation.is_or():
                        metrics[FMProperties.OR_GROUPS.value].append(str(relation))
                    elif relation.is_alternative():
                        metrics[FMProperties.ALTERNATIVE_GROUPS.value].append(str(relation))
                    elif relation.is_mutex():
                        metrics[FMProperties.MUTEX_GROUPS.value].append(str(relation))
                    else:
                        metrics[FMProperties.CARDINALITY_GROUPS.value].append(str(relation))
                    for child in relation.children:
                        metrics[FMProperties.GROUPED_FEATURES.value].append(child.name)
                        traverse_feature_metrics(child, metrics, depth + 1)
            metrics['Children'] += n_children
            metrics[FMProperties.MIN_CHILDREN_PER_FEATURE.value] = n_children if metrics[FMProperties.MIN_CHILDREN_PER_FEATURE.value] is None else min(metrics[FMProperties.MIN_CHILDREN_PER_FEATURE.value], n_children)
            metrics[FMProperties.MAX_CHILDREN_PER_FEATURE.value] = max(metrics[FMProperties.MAX_CHILDREN_PER_FEATURE.value], n_children)
        else:  # it is a leaf feature
            metrics[FMProperties.LEAF_FEATURES.value].append(feature.name)
            if feature.is_abstract:
                metrics[FMProperties.ABSTRACT_FEATURES.value].append(feature.name)
                metrics[FMProperties.ABSTRACT_LEAF_FEATURES.value].append(feature.name)
            else:
                metrics[FMProperties.CONCRETE_FEATURES.value].append(feature.name)
                metrics[FMProperties.CONCRETE_LEAF_FEATURES.value].append(feature.name)
            metrics[FMProperties.DEPTH_TREE.value] = max(metrics[FMProperties.DEPTH_TREE.value], depth)
            metrics[FMProperties.MEAN_DEPTH_TREE.value].append(depth)
        metrics[FMProperties.AVG_CHILDREN_PER_FEATURE.value].append(n_children)


def traverse_constraints_metrics(fm: FeatureModel, metrics: dict[str, Any]) -> None:
    for ctc in fm.get_constraints():
        metrics[FMProperties.CROSS_TREE_CONSTRAINTS.value].append(ctc.ast.pretty_str())
        if ctc.is_logical_constraint():
            metrics[FMProperties.LOGICAL_CONSTRAINTS.value].append(ctc.ast.pretty_str())
            if ctc.is_single_feature_constraint():
                metrics[FMProperties.SINGLE_FEATURE_CONSTRAINTS.value].append(ctc.ast.pretty_str())
            elif ctc.is_requires_constraint():
                metrics[FMProperties.SIMPLE_CONSTRAINTS.value].append(ctc.ast.pretty_str())
                metrics[FMProperties.REQUIRES_CONSTRAINTS.value].append(ctc.ast.pretty_str())
            elif ctc.is_excludes_constraint():
                metrics[FMProperties.SIMPLE_CONSTRAINTS.value].append(ctc.ast.pretty_str())
                metrics[FMProperties.EXCLUDES_CONSTRAINTS.value].append(ctc.ast.pretty_str())
            else:
                metrics[FMProperties.COMPLEX_CONSTRAINTS.value].append(ctc.ast.pretty_str())
                if ctc.is_pseudocomplex_constraint():
                    metrics[FMProperties.PSEUDO_COMPLEX_CONSTRAINTS.value].append(ctc.ast.pretty_str())
                else:
                    metrics[FMProperties.STRICT_COMPLEX_CONSTRAINTS.value].append(ctc.ast.pretty_str())
        elif ctc.is_aggregation_constraint():
            metrics[FMProperties.AGGREGATION_CONSTRAINTS.value].append(ctc.ast.pretty_str())
        elif ctc.is_arithmetic_constraint():
            metrics[FMProperties.ARITHMETIC_CONSTRAINTS.value].append(ctc.ast.pretty_str())
        
        features = ctc.get_features()
        metrics[FMProperties.EXTRA_CONSTRAINT_REPRESENTATIVENESS.value].update(features)
        metrics[FMProperties.AVG_FEATURES_PER_CONSTRAINT.value].append(len(features))
        for feature in features:
            metrics[FMProperties.AVG_CONSTRAINTS_PER_FEATURE.value][feature] += 1
