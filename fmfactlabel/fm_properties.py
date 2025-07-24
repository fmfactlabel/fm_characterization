from typing import Any, Optional
from enum import Enum


class FMProperty():
    '''It defines a property of the feature model.
    
    Each property has a name, a description, and maybe a property parent.
    The property parent is used to organize the properties in a hierarchy.
    '''

    def __init__(self, 
                 name: str,  
                 description: Optional[str] = None,  
                 parent: Optional['FMProperty'] = None):
        self.name = name
        self.description = description
        self.parent = parent

    def to_dict(self) -> dict[str, Any]:
        return {'name': self.name, 
                'description': self.description,
                'parent': self.parent.name if self.parent is not None else None,
                'level': self.level()}

    def level(self) -> int:
        '''Return the level of parents.'''
        return 0 if self.parent is None else 1 + self.parent.level()


class FMPropertyMeasure():
    """It represent the measure of a property.
    
    It has the value of the measure, it can also have a size and a ratio.
    Example:
        property: Abstract Features.
        value: the list of abstract features.
        size: the length of the list.
        ratio: the percentage of abstract features with regards the total number of features.
    """
    def __init__(self, 
                 property: FMProperty,
                 value: Optional[Any] = None,  # Example: the list of abstract features
                 size: Optional[Any] = None,  # Example: number of abstract features
                 ratio: Optional[Any] = None):  # Example: percentage of abstract features from the total number of features
        self.property = property
        self.value = value
        self.size = size 
        self.ratio = ratio

    def to_dict(self) -> dict[str, Any]:
        result = {'value': safe_value(self.value),
                  'size': self.size,
                  'ratio': self.ratio}
        return self.property.to_dict() | result


class FMProperties(Enum):
    # METADATA
    NAME = FMProperty('Name', 'Name of the feature model.', None)
    DESCRIPTION = FMProperty('Description', 'Description of the feature model.', None)
    AUTHOR = FMProperty('Author', 'Author of the feature model', None)
    YEAR = FMProperty('Year', 'Year of creation of the feature model', None)
    REFERENCE = FMProperty('Reference', 'Main paper for reference or DOI of the feature model', None)
    TAGS = FMProperty('Tags', 'Tags or keywords that identify the feature model.', None)
    DOMAIN = FMProperty('Domain', 'Domain of the feature model.', None)

    # METRICS
    FEATURES = FMProperty('Features', 'Set of features in the feature model.', None)
    ABSTRACT_FEATURES = FMProperty('Abstract features', 'Features used to structure the feature model that, however, do not have any impact at implementation level.', FEATURES)
    CONCRETE_FEATURES = FMProperty('Concrete features', 'Features that are mapped to at least one implementation artifact.', FEATURES)
    LEAF_FEATURES = FMProperty('Leaf features', "Features that have not subfeatures (aka 'primitive features' or 'terminal features').", FEATURES)
    COMPOUND_FEATURES = FMProperty('Compound features', "Features that have subfeatures.", FEATURES)
    CONCRETE_COMPOUND_FEATURES = FMProperty('Concrete compound features', "Concrete and compound features.", CONCRETE_FEATURES)
    CONCRETE_LEAF_FEATURES = FMProperty('Concrete leaf features', "Concrete and leaf features.", CONCRETE_FEATURES)
    ABSTRACT_COMPOUND_FEATURES = FMProperty('Abstract compound features', "Abstract and compound features.", ABSTRACT_FEATURES)
    ABSTRACT_LEAF_FEATURES = FMProperty('Abstract leaf features', "Abstract and leaf features.", ABSTRACT_FEATURES)
    TREE_RELATIONSHIPS = FMProperty('Tree relationships', 'Number of relationships (edges) of the feature model.', None)
    ROOT_FEATURE = FMProperty('Root feature', 'The root of the feature model.', FEATURES)
    TOP_FEATURES = FMProperty('Top features', 'Features that are first descendants of the root.', ROOT_FEATURE)
    SOLITARY_FEATURES = FMProperty('Solitary features', 'Features that are not grouped in a feature group.', FEATURES)
    GROUPED_FEATURES = FMProperty('Grouped features', 'Features that occurs in a feature group.', FEATURES)
    MANDATORY_FEATURES = FMProperty('Mandatory features', 'Features marked as mandatory that need to be selected if its parent is selected.', TREE_RELATIONSHIPS)
    OPTIONAL_FEATURES = FMProperty('Optional features', 'Feature marked as optional.', TREE_RELATIONSHIPS)
    FEATURE_GROUPS = FMProperty('Feature groups', 'Features that express a choice over the grouped features in a group.', TREE_RELATIONSHIPS)
    ALTERNATIVE_GROUPS = FMProperty('Alternative groups', "Feature groups that require the selection of just one child (i.e., [1..1] cardinality).", FEATURE_GROUPS)
    OR_GROUPS = FMProperty('Or groups', "Feature groups that require the selection of at least one child (i.e., [1..*] cardinality).", FEATURE_GROUPS)
    MUTEX_GROUPS = FMProperty('Mutex groups', "Feature groups that require the selection of zero or just one child (i.e., [0..1] cardinality).", FEATURE_GROUPS)
    CARDINALITY_GROUPS = FMProperty('Cardinality groups', "Feature groups with arbitraty cardinality [a..b] that require the selection of an minimum and a maximum number of children.", FEATURE_GROUPS)
    BRANCHING_FACTOR = FMProperty('Branching factor', "Average number of children per non-leaf feature (aka 'Ratio of Variability').", None)  # Also 'Avg children per feature'
    MIN_CHILDREN_PER_FEATURE = FMProperty('Min children per feature', 'Minimal number of children per non-leaf feature.', BRANCHING_FACTOR)
    MAX_CHILDREN_PER_FEATURE = FMProperty('Max children per feature', 'Maximal number of children per feature.', BRANCHING_FACTOR)
    AVG_CHILDREN_PER_FEATURE = FMProperty('Avg children per feature', "Average number of children per feature.", BRANCHING_FACTOR)
    DEPTH_TREE = FMProperty('Depth of tree', 'Number of features of the longest path from the root to the leaf features.', None)
    MEAN_DEPTH_TREE = FMProperty('Mean depth of tree', 'Number of features of the mean path from the root to the leaf features.', DEPTH_TREE)
    FEATURE_ATTRIBUTES = FMProperty('Attributes', 'Features attributes in the model (i.e., number of distinct attributes).', None)
    FEATURES_WITH_ATTRIBUTES = FMProperty('Features with attributes', 'Features that contain some attributes defined in the model.', FEATURE_ATTRIBUTES)
    MIN_ATTRIBUTES_PER_FEATURE = FMProperty('Min attributes per feature', 'The minimal number of attributes in a feature.', FEATURE_ATTRIBUTES)
    MAX_ATTRIBUTES_PER_FEATURE = FMProperty('Max attributes per feature', 'The maximal number of attributes in a feature.', FEATURE_ATTRIBUTES)
    AVG_ATTRIBUTES_PER_FEATURE = FMProperty('Avg attributes per feature', 'Average number of attributes in features.', FEATURE_ATTRIBUTES)
    AVG_ATTRIBUTES_PER_FEATURE_WITH_ATTRIBUTES = FMProperty('Avg attributes per feature w. attributes', 'Average number of attributes in features with attributes.', FEATURE_ATTRIBUTES)
    TYPED_FEATURES = FMProperty('Typed features', 'Non-Boolean features its selection require to provide a value (e.g., a number, a string,...', FEATURES)
    NUMERICAL_FEATURES = FMProperty('Numerical features', 'Features with a Integer or Real type.', TYPED_FEATURES)
    INTEGER_FEATURES = FMProperty('Integer features', 'Features with a Integer type.', NUMERICAL_FEATURES)
    REAL_FEATURES = FMProperty('Real features', 'Features with a Real type.', NUMERICAL_FEATURES)
    STRING_FEATURES = FMProperty('String features', 'Features with a String type.', TYPED_FEATURES)
    MULTI_FEATURES = FMProperty('Multi-features', "Features with cardinalities (aka 'clonable features')", FEATURES)

    CROSS_TREE_CONSTRAINTS = FMProperty('Cross-tree constraints', 'Textual cross-tree constraints.', None)
    LOGICAL_CONSTRAINTS = FMProperty('Logical constraints', 'Constraints with only logical operators.', CROSS_TREE_CONSTRAINTS)
    ARITHMETIC_CONSTRAINTS = FMProperty('Arithmetic constraints', 'Constraints with at least one arithmetic operator.', CROSS_TREE_CONSTRAINTS)
    AGGREGATION_CONSTRAINTS = FMProperty('Aggregation constraints', 'Constraints with at least one aggregation operator.', CROSS_TREE_CONSTRAINTS)
    SINGLE_FEATURE_CONSTRAINTS = FMProperty('Single feature constraints', 'Constraints with a single feature or negated feature.', LOGICAL_CONSTRAINTS)
    SIMPLE_CONSTRAINTS = FMProperty('Simple constraints', 'Requires and Excludes constraints.', LOGICAL_CONSTRAINTS)  # Requires and excludes
    REQUIRES_CONSTRAINTS = FMProperty('Requires constraints', 'Constraints modeling that the activation of a feature f1 implies the activation of a feature f2.', SIMPLE_CONSTRAINTS)
    EXCLUDES_CONSTRAINTS = FMProperty('Excludes constraints', 'Constraints modeling that two features are mutually exclusive and cannot be activated together.', SIMPLE_CONSTRAINTS)
    COMPLEX_CONSTRAINTS = FMProperty('Complex constraints', 'Constraints in arbitrary propositional logic formulae.', LOGICAL_CONSTRAINTS)  # Prop logic constraints (aka advanced constraints)
    PSEUDO_COMPLEX_CONSTRAINTS = FMProperty('Pseudo-complex constraints', 'Constraints that are convertible to a set of simple constraints.', COMPLEX_CONSTRAINTS)
    STRICT_COMPLEX_CONSTRAINTS = FMProperty('Strict-complex constraints', 'Constraints that cannot be converted to a set of simple constraints.', COMPLEX_CONSTRAINTS)
    MIN_CONSTRAINTS_PER_FEATURE = FMProperty('Min constraints per feature', 'The minimal number of constraints per feature.', CROSS_TREE_CONSTRAINTS)
    MAX_CONSTRAINTS_PER_FEATURE = FMProperty('Max constraints per feature', 'The maximal number of constraints per feature.', CROSS_TREE_CONSTRAINTS)
    AVG_CONSTRAINTS_PER_FEATURE = FMProperty('Avg constraints per feature', 'The average number of constraints per feature.', CROSS_TREE_CONSTRAINTS)
    EXTRA_CONSTRAINT_REPRESENTATIVENESS = FMProperty('Features in constraints', "Features involved in cross-tree constraints. The ratio to the total number of features is called 'Extra constraint representativeness (ECR)'.", CROSS_TREE_CONSTRAINTS)
    MIN_FEATURES_PER_CONSTRAINT = FMProperty('Min features per constraint', "The minimal number of features involved per cross-tree constraint.", EXTRA_CONSTRAINT_REPRESENTATIVENESS)
    MAX_FEATURES_PER_CONSTRAINT = FMProperty('Max features per constraint', "The maximal number of features involved per cross-tree constraint.", EXTRA_CONSTRAINT_REPRESENTATIVENESS)
    AVG_FEATURES_PER_CONSTRAINT = FMProperty('Avg features per constraint', "The average number of features involved per cross-tree constraint.", EXTRA_CONSTRAINT_REPRESENTATIVENESS)

    VALID = FMProperty('Satisfiable (valid)', 'A feature model is satisfiable (valid, not void) if it represents at least one configuration.', None)
    CORE_FEATURES = FMProperty('Core features', "Features that are part of all the configurations (aka 'common features').", None)  # Also 'Common features'
    DEAD_FEATURES = FMProperty('Dead features', 'Features that cannot appear in any configuration.', None)
    VARIANT_FEATURES = FMProperty('Variant features', 'Features that appear only in some configurations (i.e., features that are neither core nor dead).', None)  # Also 'Real optional features'
    UNIQUE_FEATURES = FMProperty('Unique features', 'Features that appear in exactly one configuration. The ratio is based on the total number of features.', VARIANT_FEATURES)
    PURE_OPTIONAL_FEATURES = FMProperty('Pure optional features', 'Feature with 0.5 (50%) probability of being selected in a valid configuration (i.e., their selection is unconstrained). The ratio is based on the total number of features.', VARIANT_FEATURES)
    FALSE_OPTIONAL_FEATURES = FMProperty('False-optional features', "Features included in all possible configurations although not being modelled as mandatory. The ratio is based on the total number of features.", CORE_FEATURES)
    CONFIGURATIONS = FMProperty('Configurations', 'Number of configurations represented by the feature model. If <= is shown, the number represents an upper estimation bound.', None)
    TOTAL_VARIABILITY = FMProperty('Total variability', 'The total variability measures the flexibility of the SPL considering all features.', None)
    PARTIAL_VARIABILITY = FMProperty('Partial variability', 'The partial variability measures the flexibility of the SPL considering only variant features.', None)
    HOMOGENEITY = FMProperty('Homogeneity', 'The homogeneity measures how similar are the configurations of the SPL.', None)
    PRODUCT_DISTRIBUTION = FMProperty('Configuration distribution', 'Number of configurations having a given number of features.', None)
    PD_MODE = FMProperty('Mode', 'Most frequently occurring number of features for a configuration.', PRODUCT_DISTRIBUTION)
    PD_MIN = FMProperty('Min', 'Number of features in the smallest configuration.', PRODUCT_DISTRIBUTION)
    PD_MAX = FMProperty('Max', 'Number of features in the largest configuration.', PRODUCT_DISTRIBUTION)
    PD_RANGE = FMProperty('Range', 'Range of number of features in configurations.', PRODUCT_DISTRIBUTION)
    PD_MEAN = FMProperty('Mean', 'Mean number of features occurring in configurations.', PRODUCT_DISTRIBUTION)
    PD_STD = FMProperty('Standard deviation', 'Standard deviation of number of features in configurations.', PRODUCT_DISTRIBUTION)
    PD_MEDIAN = FMProperty('Median', 'Median number of features in configurations.', PRODUCT_DISTRIBUTION)
    PD_MAD = FMProperty('Median absolute deviation', 'Median absolute deviation number of features in configurations.', PRODUCT_DISTRIBUTION)
    
    # ATOMIC_SETS = FMProperty('Atomic sets', '', None)  # Atomic sets need to be fixed in FLAMA.


def safe_value(value: Any) -> str:
    if isinstance(value, str):
        return value.replace('"', '')
    if isinstance(value, list):
        return [safe_value(v) for v in value if isinstance(v, str)]
    return value
