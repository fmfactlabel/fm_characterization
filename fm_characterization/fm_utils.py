from typing import Collection, Optional

from flamapy.metamodels.fm_metamodel.models import FeatureModel
from flamapy.metamodels.fm_metamodel.transformations import (
    UVLReader, 
    FeatureIDEReader, 
    GlencoeReader
)


def int_to_scientific_notation(n: int, precision: int = 2) -> str:
    """Convert a large int into scientific notation.
    
    It is required for large numbers that Python cannot convert to float,
    solving the error `OverflowError: int too large to convert to float`.
    """
    str_n = str(n)
    decimal = str_n[1:precision+1]
    exponent = str(len(str_n) - 1)
    return str_n[0] + '.' + decimal + 'e' + exponent


def get_nof_configuration_as_str(nof_configurations: int, aproximation: bool, nof_cross_tree_constraints: int) -> str:
    return f"{'≤ ' if aproximation and nof_cross_tree_constraints > 0 else ''}{int_to_scientific_notation(nof_configurations) if nof_configurations > 1e6 else nof_configurations}"


def get_ratio(collection1: Collection, collection2: Collection, precision: int = 2) -> float:
    return 0.0 if not collection2 else round(len(collection1) / len(collection2), precision)


def get_percentage_str(value: int | float, precision: int = 4) -> str:
        if value == 0:
            return str(value)
        percentage = value * 100
        format_percentage = '{:.pe}'
        format_percentage = format_percentage.replace('p', str(precision))
        percentage_value = round(percentage, precision)
        return str(percentage_value) if percentage_value > 0 else format_percentage.format(percentage)


def read_fm_file(filename: str) -> Optional[FeatureModel]:
    try:
        if filename.endswith(".uvl"):
            return UVLReader(filename).transform()
        elif filename.endswith(".xml") or filename.endswith(".fide"):
            return FeatureIDEReader(filename).transform()
        elif filename.endswith("gfm.json"):
            return GlencoeReader(filename).transform()
    except Exception as e:
        print(e)
        pass
    try:
        return UVLReader(filename).transform()
    except Exception as e:
        print(e)
        pass
    try:
        return FeatureIDEReader(filename).transform()
    except Exception as e:
        print(e)
        pass
    try:
        return GlencoeReader(filename).transform()
    except Exception as e:
        print(e)
        pass
    return None