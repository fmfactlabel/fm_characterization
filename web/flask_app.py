import os
import sys
import json
import logging
import pathlib
import tempfile
import threading
import time

import flask


from fmfactlabel import FMCharacterization
from fmfactlabel.fm_utils import read_fm_file


STATIC_DIR = '../web'
TIMEOUT_TEMPFILES = 3600  # 1 hour


app = flask.Flask(__name__,
                  static_url_path='',
                  static_folder=STATIC_DIR,
                  template_folder=STATIC_DIR)


@app.route('/', methods=['GET', 'POST'])
def index():
    data = {}
    name = None
    description = None
    author = None
    year = None
    keywords = None
    reference = None
    domain = None
    if flask.request.method == 'GET':
        return flask.render_template('index_flask.html', data=data)

    if flask.request.method == 'POST':
        light_fact_label = 'lightFactLabel' in flask.request.form
        logging.warning(f'light_fact_label: {light_fact_label}')
        fm_file = flask.request.files['inputFM']
        
        filename = fm_file.filename
        fm_file.save(filename)

        if flask.request.form['inputName']:
            name = flask.request.form['inputName']
        if flask.request.form['inputDescription']:
            description = flask.request.form['inputDescription']
            description = description.replace(os.linesep, ' ')
        if flask.request.form['inputAuthor']:
            author = flask.request.form['inputAuthor']
        if flask.request.form['inputReference']:
            reference = flask.request.form['inputReference']
        if flask.request.form['inputKeywords']:
            keywords = flask.request.form['inputKeywords']
        if flask.request.form['inputDomain']:
            domain = flask.request.form['inputDomain']
        if flask.request.form['inputYear']:
            year = flask.request.form['inputYear']

        try:
            characterization = FMCharacterization.from_path(filename)
        except Exception as e:
            data['file_error'] = 'Feature model format not supported or invalid syntax.'
            return flask.render_template('index_flask.html', data=data)
        finally:
            file_path = pathlib.Path(filename)
            if file_path.exists() and file_path.name == fm_file.filename:
                file_path.unlink()

        if name is not None:
            characterization.metadata.name = name
        name = characterization.metadata.name
        characterization.metadata.author = author
        characterization.metadata.year = year
        characterization.metadata.tags = keywords
        characterization.metadata.reference = reference
        characterization.metadata.domains = domain
        data['FM_NAME'] = name
        data['JSON_CHARACTERIZATION'] = characterization.to_json()
        data['TXT_CHARACTERIZATION'] = str(characterization)

        # Write the characterization to a JSON file
        json_filename = f'{name}.json'
        temp_dir = pathlib.Path(tempfile.gettempdir())
        temp_path = temp_dir / json_filename
        characterization.to_json_file(temp_path)
        delete_file_later(temp_path)
        # Write the characterization to a text file
        txt_filename = f'{name}.txt'
        temp_dir = pathlib.Path(tempfile.gettempdir())
        temp_path = temp_dir / txt_filename
        with open(temp_path, 'w', encoding='utf-8') as file_txt:
            file_txt.write(str(characterization))
        delete_file_later(temp_path)

        return flask.jsonify(data=data)


@app.route('/uploadJSON', methods=['GET', 'POST'])
def uploadJSON():   
    data = {}
    if flask.request.method == 'GET':
        return flask.render_template('index_flask.html', data=data)

    if flask.request.method == 'POST':
        json_file = flask.request.files['inputJSON']
        filename = json_file.filename
        json_file.save(filename)
        try:
            # Read the json
            json_characterization = json.load(open(filename))
            if json_characterization is None:
                data['file_error'] = 'JSON format not supported.'
                return flask.render_template('index_flask.html', data=data)
            
            name = next((item['value'] for item in json_characterization["metadata"] if item["name"] == "Name"), None)
            data['FM_NAME'] = name
            data['JSON_CHARACTERIZATION'] = json_characterization
            txt_characterization = FMCharacterization.json_to_text(json_characterization)
            data['TXT_CHARACTERIZATION'] = str(txt_characterization)

            # Write the characterization to a JSON file
            json_filename = f'{name}.json'
            temp_dir = pathlib.Path(tempfile.gettempdir())
            temp_path = temp_dir / json_filename
            with open(temp_path, 'w', encoding='utf-8') as file_json:
                json.dump(json_characterization, file_json, indent=4)
            delete_file_later(temp_path)
            # Write the characterization to a text file
            txt_filename = f'{name}.txt'
            temp_dir = pathlib.Path(tempfile.gettempdir())
            temp_path = temp_dir / txt_filename
            txt_characterization = FMCharacterization.json_to_text(json_characterization)
            with open(temp_path, 'w', encoding='utf-8') as file_txt:
                file_txt.write(txt_characterization)
            delete_file_later(temp_path)
        except Exception as e:
            raise e

        file_path = pathlib.Path(filename)
        if file_path.exists() and file_path.name == json_file.filename:
            file_path.unlink()
    
        return flask.jsonify(data=data)

@app.route('/fromURL', methods=['POST'])
def fromURL():
    data = {}
    request_data = flask.request.get_json()
    url = request_data.get('url')
    if url is None:
        return flask.jsonify({'error': 'URL not provided.'}), 400
    try:
        characterization = FMCharacterization.from_url(url)
        data['FM_NAME'] = characterization.metadata.name
        data['JSON_CHARACTERIZATION'] = characterization.to_json()
        data['TXT_CHARACTERIZATION'] = str(characterization)

        # Write the characterization to a JSON file
        json_filename = f'{characterization.metadata.name}.json'
        temp_dir = pathlib.Path(tempfile.gettempdir())
        temp_path = temp_dir / json_filename
        characterization.to_json_file(temp_path)
        delete_file_later(temp_path)

        # Write the characterization to a text file
        txt_filename = f'{characterization.metadata.name}.txt'
        temp_path = temp_dir / txt_filename
        with open(temp_path, 'w', encoding='utf-8') as file_txt:
            file_txt.write(str(characterization))
        delete_file_later(temp_path)
        return flask.jsonify(data=data)
    except Exception as e:
        logging.error(f"Error processing URL {url}: {e}")
        return flask.jsonify({'error': str(e)}), 500


def delete_file_later(path: str, delay: int = TIMEOUT_TEMPFILES):
    """Delete the given file after `delay` seconds using pathlib.Path."""
    path = pathlib.Path(path)

    def delayed_delete():
        time.sleep(delay)
        try:
            if path.exists():
                path.unlink()
        except Exception as e:
            logging.warning(f'Could not delete file {path}: {e}')
            pass
    threading.Thread(target=delayed_delete, daemon=True).start()


if __name__ == '__main__':
    sys.set_int_max_str_digits(0)
    #logging.basicConfig(filename='app.log', level=logging.INFO)

    app.run(host='0.0.0.0', debug=True)
