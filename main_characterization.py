import sys
import pathlib
import logging
import argparse
from typing import Optional, Any

from flamapy.core.exceptions import FlamaException
from flamapy.metamodels.fm_metamodel.models import FeatureModel
from flamapy.metamodels.fm_metamodel.transformations import (
    UVLReader, 
    FeatureIDEReader,
    AFMReader,
    GlencoeReader,
    JSONReader
)

from fmfactlabel import FMCharacterization


def read_fm_file(filename: str) -> Optional[FeatureModel]:
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



def main(fm_filepath: str, metadata: dict[str, Any], light_fm: bool) -> None:
    path = pathlib.Path(fm_filepath)
    filename = path.stem
    dir = path.parent

    # Read the feature model
    fm = read_fm_file(fm_filepath)
    if fm is None:
        raise Exception('Feature model format not supported.')
    
    characterization = FMCharacterization(fm, light_fm)
    characterization.metadata.name = filename if metadata.get('name') is None else metadata.get('name')
    characterization.metadata.description = metadata.get('description')
    characterization.metadata.author = metadata.get('authors')
    characterization.metadata.year = metadata.get('year')
    characterization.metadata.tags = metadata.get('tags')
    characterization.metadata.reference = metadata.get('doi')
    characterization.metadata.domains = metadata.get('domain')
    
    print(characterization)
    output_filepath = str(dir / f'{filename}.json')
    characterization.to_json_file(output_filepath)
    

if __name__ == '__main__':
    sys.set_int_max_str_digits(0)
    logging.basicConfig(level=logging.ERROR)
    
    parser = argparse.ArgumentParser(description='FM Characterization.')
    parser.add_argument(metavar='path', dest='path', type=str, help='Input feature model.')
    parser.add_argument('-name', dest='name', type=str, required=False, help="Feature model's name.")
    parser.add_argument('-desc', dest='description', type=str, required=False, help="Feature model's description.")
    parser.add_argument('-tags', dest='tags', type=str, required=False, help="Feature model's tags")
    parser.add_argument('-authors', dest='authors', type=str, required=False, help="Feature model's authors")
    parser.add_argument('-year', dest='year', type=int, required=False, help="Feature model's year")
    parser.add_argument('-domain', dest='domain', type=str, required=False, help="Feature model's domain")
    parser.add_argument('-doi', dest='doi', type=str, required=False, help="Feature model's doi")
    parser.add_argument('-light', dest='light_fm', action='store_true', required=False, default=False, help='Exclude some analytical metrics (i.e., no BDD analysis)')
    args = parser.parse_args()

    metadata = {
        'name': args.name,
        'description': args.description,
        'tags': args.tags,
        'authors': args.authors,
        'year': args.year,
        'domain': args.domain,
        'doi': args.doi
    }
    main(args.path, metadata, light_fm=args.light_fm)
