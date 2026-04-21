// 1. DECLARACIONES DE LIBRERÍAS EXTERNAS
declare const saveAs: (data: Blob | string, filename?: string, options?: any) => void;
declare const d3: any;
declare const pyodideInstance: any;

// 2. EXTENSIÓN DE WINDOW (Sin borrar el original)
declare global {
    interface Window {
        FM_NAME: string;
        TXT_CHARACTERIZATION: string | null;
        JSON_CHARACTERIZATION: any | null;
        PDFDocument: any;
        SVGtoPDF: (doc: any, svg: SVGElement, x: number, y: number, options: any) => void;
        drawFMFactLabel: (data: any) => void;
    }
}

// 3. FUNCIONES GLOBALES
declare function filterData(data: any): any;
declare function redrawLabel(data: any): void;
declare const ALL_DATA: any;

// 2. TIPADO DE FUNCIONES DE UTILIDAD
const setupSaveButton = (
    buttonId: string, 
    chartSelector: string, 
    serializeFunction: (svg: SVGElement) => Promise<Blob> | Blob, 
    extension: string
): void => {
    d3.select(buttonId).on('click', async function(this: any, event: MouseEvent) {
        event.preventDefault();
        const chart = d3.select(chartSelector);
        chart.selectAll("#collapseIcon").attr("visibility", "hidden");
        
        const svgElement = chart.node() as SVGSVGElement;
        const originalHeight = adjustSVGSize(svgElement);

        const fm_name = window.FM_NAME;
        try {
            const blob = await serializeFunction(svgElement);
            saveAs(blob, fm_name + extension);
        } catch (error) {
            console.error(`An error occurred while saving the ${extension.toUpperCase()}:`, error);
        } finally {
            if (originalHeight) restoreSVGSize(svgElement, originalHeight);
            const newData = filterData(ALL_DATA);
            redrawLabel(newData);
        }
    });
};

// 3. CONFIGURACIÓN DE BOTONES (SVG y PNG)
setupSaveButton('#saveSVG', '#FMFactLabelChart', serializeToSVG, '.svg');
setupSaveButton('#saveSVGLandscape', '#FMFactLabelChartLandscape', serializeToSVG, '.svg');
setupSaveButton('#saveSVGDataSet', '#FMFactLabelDataSetChart', serializeToSVG, '.svg');
setupSaveButton('#saveSVGDataSetLandscape', '#FMFactLabelDataSetChartLandscape', serializeToSVG, '.svg');

setupSaveButton('#savePNG', '#FMFactLabelChart', rasterize, '.png');
setupSaveButton('#savePNGLandscape', '#FMFactLabelChartLandscape', rasterize, '.png');
setupSaveButton('#savePNGDataSet', '#FMFactLabelDataSetChart', rasterize, '.png');
setupSaveButton('#savePNGDataSetLandscape', '#FMFactLabelDataSetChartLandscape', rasterize, '.png');

// 4. CONFIGURACIÓN BOTÓN PDF
const setupPDFSaveButton = (buttonId: string, chartSelector: string): void => {
    d3.select(buttonId).on('click', async function(this: any, event: MouseEvent) {
        event.preventDefault();
        const chart = d3.select(chartSelector);
        chart.selectAll("#collapseIcon").attr("visibility", "hidden");
        
        const svgElement = chart.node() as SVGSVGElement;
        const originalHeight = adjustSVGSize(svgElement);

        try {
            const bbox = svgElement.getBBox();
            const svgWidth = bbox.width;
            const svgHeight = bbox.height;

            const blob = serializeToSVG(svgElement); // serializeToSVG devuelve Blob sincrónico
            const imgData = await readBlobAsDataURL(blob);

            const fm_name = window.FM_NAME;
            const doc = new window.PDFDocument({ 
                size: [svgWidth, svgHeight] 
            });

            const chunks: Uint8Array[] = [];
            const stream = doc.pipe({
              write: (chunk: Uint8Array) => chunks.push(chunk),
              end: () => {
                const pdfBlob = new Blob(chunks as BlobPart[], { type: 'application/octet-stream' });
                const blobUrl = URL.createObjectURL(pdfBlob);
                const downloadLink = document.createElement("a");
                downloadLink.href = blobUrl;
                downloadLink.download = `${fm_name}.pdf`;
                downloadLink.click();
                URL.revokeObjectURL(blobUrl);
              },
              on: () => {},
              once: () => {},
              emit: () => {},
            });

            window.SVGtoPDF(doc, svgElement, 0, 0, {
              width: svgWidth,
              height: svgHeight
            });
            doc.end();
        } catch (error) {
            console.error("An error occurred while saving the PDF:", error);
        } finally {
            if (originalHeight) restoreSVGSize(svgElement, originalHeight);
            const newData = filterData(ALL_DATA);
            redrawLabel(newData);
        }
    });
};

setupPDFSaveButton('#savePDF', '#FMFactLabelChart');
setupPDFSaveButton('#savePDFLandscape', '#FMFactLabelChartLandscape');
setupPDFSaveButton('#savePDFDataSet', '#FMFactLabelDataSetChart');
setupPDFSaveButton('#savePDFDataSetLandscape', '#FMFactLabelDataSetChartLandscape');

// 5. BOTONES DE TEXTO Y JSON
d3.select('#saveTXT').on('click', () => {
    const fm_name = window.FM_NAME;
    let fileData: string;
    if (window.TXT_CHARACTERIZATION != null) {
        fileData = window.TXT_CHARACTERIZATION;
    } else {
        fileData = pyodideInstance.FS.readFile(fm_name + ".txt", { encoding: "utf8" });
    }
    const blob = new Blob([fileData], { type: "text/plain" });
    saveAs(blob, fm_name + ".txt");
});

d3.select('#saveJSON').on('click', () => {
    const fm_name = window.FM_NAME;
    let fileData: any;
    if (window.JSON_CHARACTERIZATION != null) {
        fileData = window.JSON_CHARACTERIZATION;
    } else {
        const jsonString = pyodideInstance.FS.readFile(fm_name + ".json", { encoding: "utf8" });
        fileData = JSON.parse(jsonString);
    }
    const jsonStr = JSON.stringify(fileData, null, 4);
    const blob = new Blob([jsonStr], { type: "application/json" });
    saveAs(blob, fm_name + ".json");
});

// 6. SERIALIZACIÓN Y AUXILIARES
const xmlns = "http://www.w3.org/2000/xmlns/";
const xlinkns = "http://www.w3.org/1999/xlink";
const svgns = "http://www.w3.org/2000/svg";

function serializeToSVG(svg: SVGElement): Blob {
    const clonedSvg = svg.cloneNode(true) as SVGElement;
    const fragment = window.location.href + "#";
    const walker = document.createTreeWalker(clonedSvg, NodeFilter.SHOW_ELEMENT);
    
    while (walker.nextNode()) {
        const node = walker.currentNode as Element;
        for (const attr of Array.from(node.attributes)) {
            if (attr.value.includes(fragment)) {
                attr.value = attr.value.replace(fragment, "#");
            }
        }
    }
    clonedSvg.setAttributeNS(xmlns, "xmlns", svgns);
    clonedSvg.setAttributeNS(xmlns, "xmlns:xlink", xlinkns);
    const serializer = new XMLSerializer();
    const string = serializer.serializeToString(clonedSvg);
    return new Blob([string], { type: "image/svg+xml" });
}

function rasterize(svg: SVGElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onerror = (e) => reject(e);
        image.onload = () => {
            const rect = svg.getBoundingClientRect();
            const context = context2d(rect.width, rect.height);
            if (context) {
                context.drawImage(image, 0, 0, rect.width, rect.height);
                context.canvas.toBlob((blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error("Canvas toBlob failed"));
                }, 'image/png');
            }
        };
        const serializedSVG = serializeToSVG(svg);
        image.src = URL.createObjectURL(serializedSVG);
    });
}

function context2d(width: number, height: number, dpi?: number): CanvasRenderingContext2D | null {
    if (dpi == null) dpi = devicePixelRatio;
    const canvas = document.createElement("canvas");
    canvas.width = width * dpi;
    canvas.height = height * dpi;
    canvas.style.width = width + "px";
    const context = canvas.getContext("2d");
    if (context) context.scale(dpi, dpi);
    return context;
}

const adjustSVGSize = (svgElement: SVGSVGElement): string | null => {
    const originalHeight = svgElement.getAttribute("height");
    d3.select(".chart").selectAll("#collapseIcon").attr("visibility", "hidden");
    const bbox = svgElement.getBBox();
    svgElement.setAttribute("height", bbox.height.toString());
    return originalHeight;
};

const restoreSVGSize = (svgElement: SVGSVGElement, originalHeight: string): void => {
    svgElement.setAttribute("height", originalHeight);
};

const readBlobAsDataURL = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Error reading the blob"));
        reader.readAsDataURL(blob);
    });
};