import sys
import logging
import argparse
from typing import Any
import pathlib
import json

from fmfactlabel import DatasetCharacterization


def main(dataset_filepath: str, metadata: dict[str, Any], light_fm: bool) -> None:
    if dataset_filepath.startswith('http://') or dataset_filepath.startswith('https://'):
        characterization = DatasetCharacterization.from_url(dataset_filepath, light_fm)
    else:
        characterization = DatasetCharacterization.from_path(dataset_filepath, light_fm)
    
    name = pathlib.Path(dataset_filepath).stem
    characterization['metadata'][0]['value'] = metadata.get('name', name)
    if characterization['metadata'][0]['value'] is None:
        characterization['metadata'][0]['value'] = name
    characterization['metadata'][1]['value'] = metadata.get('description')
    characterization['metadata'][2]['value'] = metadata.get('authors')
    characterization['metadata'][3]['value'] = metadata.get('year')
    characterization['metadata'][4]['value'] = metadata.get('doi')
    characterization['metadata'][5]['value'] = metadata.get('tags')
    characterization['metadata'][6]['value'] = metadata.get('domain')
    
    print(characterization)
    output_filepath = str(f'{characterization["metadata"][0]["value"]}.json')
    with open(output_filepath, 'w', encoding='utf-8') as output_file:
            json.dump(characterization, output_file, indent=4, ensure_ascii=False)
    
    

if __name__ == '__main__':
    sys.set_int_max_str_digits(0)
    logging.basicConfig(level=logging.ERROR)
    
    parser = argparse.ArgumentParser(description='Dataset Characterization.')
    parser.add_argument(metavar='path', dest='path', type=str, help='Input dataset filepath or URL.')
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
