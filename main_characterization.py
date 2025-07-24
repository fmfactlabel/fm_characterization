import sys
import logging
import argparse
from typing import Any

from fmfactlabel import FMCharacterization


def main(fm_filepath: str, metadata: dict[str, Any], light_fm: bool) -> None:
    if fm_filepath.startswith('http://') or fm_filepath.startswith('https://'):
        characterization = FMCharacterization.from_url(fm_filepath, light_fm)
    else:
        characterization = FMCharacterization.from_path(fm_filepath, light_fm)
    
    characterization.metadata.description = metadata.get('description')
    characterization.metadata.author = metadata.get('authors')
    characterization.metadata.year = metadata.get('year')
    characterization.metadata.tags = metadata.get('tags')
    characterization.metadata.reference = metadata.get('doi')
    characterization.metadata.domains = metadata.get('domain')
    
    print(characterization)
    output_filepath = str(f'{characterization.metadata.name}.json')
    characterization.to_json_file(output_filepath)
    

if __name__ == '__main__':
    sys.set_int_max_str_digits(0)
    logging.basicConfig(level=logging.ERROR)
    
    parser = argparse.ArgumentParser(description='FM Characterization.')
    parser.add_argument(metavar='path', dest='path', type=str, help='Input feature model filepath or URL.')
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
