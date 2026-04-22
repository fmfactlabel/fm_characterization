import { PYTHON_CODE } from './PythonScripts.js'; // Asegúrate de importar la constante

// Declaración para que TS no se queje de la librería externa
declare const loadPyodide: any;

export class PyodideEngine {
    private instance: any;

    async initialize(onProgress: (p: number, msg: string) => void): Promise<any> {
        onProgress(10, "Cargando núcleo de Pyodide...");
        this.instance = await loadPyodide();
        
        onProgress(30, "Cargando Micropip...");
        await this.instance.loadPackage(["micropip", "python-sat"]);

        onProgress(50, "Instalando ecosistema FlamaPy...");
        await this.instance.runPythonAsync(`
            import micropip
            await micropip.install([
                "flamapy/ply-3.11-py2.py3-none-any.whl",
                "flamapy/uvlparser-2.0.1-py3-none-any.whl",
                "flamapy/afmparser-1.0.3-py3-none-any.whl",
                "flamapy/antlr4_python3_runtime-4.13.1-py3-none-any.whl",
                "flamapy/flamapy-2.1.0.dev0-py3-none-any.whl",
                "flamapy/flamapy_fw-2.1.0.dev0-py3-none-any.whl",
                "flamapy/flamapy_fm-2.1.0.dev0-py3-none-any.whl",
                "flamapy/flamapy_sat-2.1.0.dev0-py3-none-any.whl",
                "flamapy/flamapy_bdd-2.1.0.dev0-py3-none-any.whl",
                "flamapy/dd-0.5.7-py3-none-any.whl",
                "flamapy/astutils-0.0.6-py3-none-any.whl",
                "flamapy/fmfactlabel-1.8.0-py3-none-any.whl"
            ], deps=False)
        `);
        
        onProgress(100, "Motor listo");
        return this.instance;
    }

    writeFile(name: string, data: Uint8Array) {
        this.instance.FS.writeFile(name, data);
    }

    readFile(name: string): string {
        return this.instance.FS.readFile(name, { encoding: "utf8" });
    }

    /**
     * Procesa un archivo FM (UVL, AFM, etc)
     */
    async processFM(
        fileName: string, 
        name: string | null, 
        isLight: boolean, 
        desc: string, 
        onProgress?: (p: number, msg: string) => void
    ): Promise<string> {
        if (onProgress) {
            (self as any).py_progress_callback = (p: number, msg: string) => onProgress(p, msg);
        }

        // Preparamos los argumentos para el script de Python
        const pyName = name ? `"""${name}"""` : "None";
        const pyDesc = `"""${desc}"""`;
        
        const pyCode = PYTHON_CODE.PROCESS_FM(fileName, pyName, isLight, pyDesc);
        return await this.instance.runPythonAsync(pyCode);
    }

    /**
     * Procesa un JSON ya generado
     */
    async processJSON(fileName: string, onProgress?: (p: number, msg: string) => void): Promise<string> {
        if (onProgress) {
            (self as any).py_progress_callback = (p: number, msg: string) => onProgress(p, msg);
        }

        const pyCode = PYTHON_CODE.PROCESS_JSON(fileName);
        return await this.instance.runPythonAsync(pyCode);
    }

    /**
     * Procesa un modelo desde una URL directamente en el navegador
     */
    async processFromURL(url: string, onProgress: (p: number, msg: string) => void): Promise<string> {
        // Registramos el callback en el scope global (self) para que Python lo vea
        (self as any).py_progress_callback = (p: number, msg: string) => {
            onProgress(p, msg);
        };

        const pythonScript = PYTHON_CODE.PROCESS_URL(url);
        
        try {
            return await this.instance.runPythonAsync(pythonScript);
        } catch (error) {
            console.error("Error executing PROCESS_URL script:", error);
            throw error;
        }
    }

    async run(code: string, onProgress?: (p: number, msg: string) => void): Promise<any> {
        if (onProgress) {
            (self as any).py_progress_callback = (p: number, msg: string) => {
                onProgress(p, msg);
            };
        }
        return await this.instance.runPythonAsync(code);
    }
}