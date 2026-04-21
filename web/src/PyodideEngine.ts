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
        
        return this.instance;
    }

    writeFile(name: string, data: Uint8Array) {
        this.instance.FS.writeFile(name, data);
    }

    readFile(name: string): string {
        return this.instance.FS.readFile(name, { encoding: "utf8" });
    }

    async run(code: string): Promise<any> {
        return await this.instance.runPythonAsync(code);
    }
}