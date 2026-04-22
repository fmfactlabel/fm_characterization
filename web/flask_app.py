import os
import sys
import json
import logging
import pathlib
import tempfile
import threading
import time
import asyncio
import queue

import flask
from flask_cors import CORS

from fmfactlabel import FMCharacterization
from fmfactlabel.fm_utils import read_fm_file


STATIC_DIR = '../web'
TIMEOUT_TEMPFILES = 3600  # 1 hour


app = flask.Flask(__name__,
                  static_url_path='',
                  static_folder=STATIC_DIR,
                  template_folder=STATIC_DIR)
CORS(app)

@app.route('/', methods=['GET', 'POST'])
def index():
    if flask.request.method == 'GET':
        return flask.render_template('index.html', data={})
    if flask.request.method == 'POST':
        light_fact_label = 'lightFactLabel' in flask.request.form
        fm_file = flask.request.files.get('inputFM')
        filename = fm_file.filename
        fm_file.save(filename)

        form_data = {
            'name': flask.request.form.get('inputName', None),
            'description': flask.request.form.get('inputDescription', '').replace(os.linesep, ' '),
            'author': flask.request.form.get('inputAuthor', None),
            'reference': flask.request.form.get('inputReference', None),
            'keywords': flask.request.form.get('inputKeywords', None),
            'domain': flask.request.form.get('inputDomain', None),
            'year': flask.request.form.get('inputYear', None)
        }

        progreso_q = queue.Queue()

        def background_task():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                def on_prog(p, m):
                    # Aseguramos que m sea siempre string para evitar errores de tipo
                    progreso_q.put({'type': 'progress', 'p': p, 'm': str(m)})

                # 1. EJECUCIÓN ASÍNCRONA (Asegúrate que from_path use await internamente)
                char = loop.run_until_complete(
                    FMCharacterization.from_path(filename, light_fact_label, on_progress=on_prog)
                )
                
                # 2. Metadatos
                if form_data['name']: char.metadata.name = form_data['name']
                name = char.metadata.name
                char.metadata.author = form_data['author'] if form_data['author'] else None
                char.metadata.description = form_data['description'] if form_data['description'] else None
                char.metadata.year = form_data['year'] if form_data['year'] else None
                char.metadata.tags = form_data['keywords'] if form_data['keywords'] else None
                char.metadata.reference = form_data['reference'] if form_data['reference'] else None
                char.metadata.domains = form_data['domain'] if form_data['domain'] else None

                # 3. Preparar data final
                txt_content = str(char) # Guardamos el string aquí para reusarlo
                final_data = {
                    'FM_NAME': name,
                    'JSON_CHARACTERIZATION': char.to_json(),
                    'TXT_CHARACTERIZATION': txt_content
                }

                # 4. Lógica de archivos temporales CORREGIDA
                temp_dir = pathlib.Path(tempfile.gettempdir())
                
                # Archivo JSON
                json_path = temp_dir / f"{name}.json"
                char.to_json_file(str(json_path))
                delete_file_later(json_path)

                # Archivo TXT (Corregido el error de f.write(str))
                txt_path = temp_dir / f"{name}.txt"
                with open(txt_path, 'w', encoding='utf-8') as f:
                    f.write(txt_content) # <--- Ahora pasamos el texto, no el tipo 'str'
                delete_file_later(txt_path)

                # 5. Enviamos el éxito
                progreso_q.put({'type': 'final', 'data': final_data})

            except Exception as e:
                # Importante: str(e) para que JSON pueda serializarlo
                progreso_q.put({'type': 'error', 'msg': str(e)})
            finally:
                p_file = pathlib.Path(filename)
                if p_file.exists(): p_file.unlink()
                progreso_q.put(None)

        # Lanzar el hilo
        threading.Thread(target=background_task).start()

        # Generador para Flask
        def generate():
            while True:
                item = progreso_q.get()
                if item is None: break
                yield f"data: {json.dumps(item)}\n\n"

        return flask.Response(generate(), mimetype='text/event-stream')


@app.route('/uploadJSON', methods=['GET', 'POST'])
def uploadJSON():   
    data = {}
    if flask.request.method == 'GET':
        return flask.render_template('index.html', data=data)

    if flask.request.method == 'POST':
        json_file = flask.request.files.get('inputCharacterization')
        filename = json_file.filename
        json_file.save(filename)
        try:
            # Read the json
            json_characterization = json.load(open(filename))
            if json_characterization is None:
                data['file_error'] = 'JSON format not supported.'
                return flask.render_template('index.html', data=data)
            
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
