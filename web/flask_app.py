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
    
    light_fact_label = 'lightFactLabel' in flask.request.form
    fm_file = flask.request.files.get('inputFM')
    filename = fm_file.filename
    fm_file.save(filename)

    form_data = {
        'name': flask.request.form.get('inputName'),
        'description': flask.request.form.get('inputDescription', '').replace(os.linesep, ' '),
        'author': flask.request.form.get('inputAuthor'),
        'reference': flask.request.form.get('inputReference'),
        'keywords': flask.request.form.get('inputKeywords'),
        'domain': flask.request.form.get('inputDomain'),
        'year': flask.request.form.get('inputYear')
    }
    form_data = {k: v if v else None for k, v in form_data.items()}

    # Pasamos la lógica de creación como una función lambda
    return process_characterization_stream(
        fetch_coro_func=lambda on_p: FMCharacterization.from_path_async(filename, light_fact_label, on_progress=on_p),
        form_data=form_data,
        cleanup_path=filename
    )


@app.route('/uploadJSON', methods=['POST'])
def uploadJSON():
    json_file = flask.request.files.get('inputCharacterization')
    filename = json_file.filename
    json_file.save(filename)

    # Definimos la función que cargará el JSON y lo "disfrazará" de objeto caracterización
    async def load_json_as_char(on_prog):
        on_prog(20, "Reading JSON file...")
        with open(filename, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        on_prog(50, "Parsing data...")
        # Creamos un objeto 'dummy' que se comporte como FMCharacterization
        # para que la función maestra pueda usar sus métodos.
        class JSONWrapper:
            def __init__(self, d):
                self.data = d
                # Extraemos el nombre para la metadata
                name_val = next((i['value'] for i in d["metadata"] if i["name"] == "Name"), "Unnamed")
                self.metadata = type('Obj', (object,), {'name': name_val})()
            
            def to_json(self): return self.data
            def to_json_file(self, path): 
                with open(path, 'w', encoding='utf-8') as f: json.dump(self.data, f, indent=4)
            def __str__(self): return FMCharacterization.json_to_text(self.data)
            
        return JSONWrapper(data)

    # Llamamos a la misma función unificada
    return process_characterization_stream(
        fetch_coro_func=load_json_as_char,
        cleanup_path=filename
    )
    

@app.route('/fromURL', methods=['POST'])
def fromURL():
    url = flask.request.get_json().get('url')
    if not url:
        return flask.jsonify({'error': 'URL not provided.'}), 400

    return process_characterization_stream(
        fetch_coro_func=lambda on_p: FMCharacterization.from_url_async(url, on_progress=on_p)
    )


def process_characterization_stream(fetch_coro_func, form_data=None, cleanup_path=None):
    """
    Función unificada para procesar la caracterización y devolver una Response SSE.
    :param fetch_coro_func: Función que recibe (on_prog) y devuelve la corrutina de FMCharacterization.
    :param form_data: Diccionario con metadatos extra para sobreescribir.
    :param cleanup_path: Ruta de archivo local que debe borrarse al finalizar.
    """
    progreso_q = queue.Queue()

    def background_task():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            def on_prog(p, m, d=None):
                progreso_q.put({'type': 'progress', 'p': p, 'm': str(m), 'd': str(d) if d else ''})

            # 1. Obtener la caracterización (aquí se ejecuta la corrutina pasada)
            char = loop.run_until_complete(fetch_coro_func(on_prog))
            
            # 2. Aplicar Metadatos del formulario si existen
            if form_data:
                if form_data.get('name'): char.metadata.name = form_data['name']
                char.metadata.author = form_data.get('author')
                char.metadata.description = form_data.get('description')
                char.metadata.year = form_data.get('year')
                char.metadata.tags = form_data.get('keywords')
                char.metadata.reference = form_data.get('reference')
                char.metadata.domains = form_data.get('domain')

            name = char.metadata.name
            txt_content = str(char)

            # 3. Preparar archivos temporales
            temp_dir = pathlib.Path(tempfile.gettempdir())
            
            json_path = temp_dir / f"{name}.json"
            char.to_json_file(str(json_path))
            delete_file_later(json_path)

            txt_path = temp_dir / f"{name}.txt"
            with open(txt_path, 'w', encoding='utf-8') as f:
                f.write(txt_content)
            delete_file_later(txt_path)

            # 4. Enviar resultado final
            final_data = {
                'FM_NAME': name,
                'JSON_CHARACTERIZATION': char.to_json(),
                'TXT_CHARACTERIZATION': txt_content
            }
            progreso_q.put({'type': 'final', 'data': final_data})

        except Exception as e:
            progreso_q.put({'type': 'error', 'msg': str(e)})
        finally:
            if cleanup_path:
                p_file = pathlib.Path(cleanup_path)
                if p_file.exists(): p_file.unlink()
            progreso_q.put(None)

    threading.Thread(target=background_task).start()

    def generate():
        while True:
            item = progreso_q.get()
            if item is None: break
            yield f"data: {json.dumps(item)}\n\n"

    return flask.Response(generate(), mimetype='text/event-stream')


def delete_file_later(path: str, delay: int = TIMEOUT_TEMPFILES) -> None:
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
