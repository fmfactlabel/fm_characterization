// import { get_property } from './fm_fact_label.js';

const setupSaveButton = (buttonId, chartSelector, serializeFunction, extension) => {
    d3.select(buttonId).on('click', async function(event) {
        event.preventDefault();
        let chart = d3.select(chartSelector);
        chart.selectAll("#collapseIcon").attr("visibility", "hidden");
        const svgElement = chart.node();
        const originalHeight = adjustSVGSize(svgElement);

        const jsonString = pyodideInstance.FS.readFile("fm_characterization.json", { encoding: "utf8" });
        const fmData = JSON.parse(jsonString);
        try {
            const blob = await serializeFunction(svgElement);
            const data = typeof fmData !== 'undefined' ? fmData : fmDataSetData;
            const name = get_property(data, 'Name').value;
            saveAs(blob, name + extension);
        } catch (error) {
            console.error(`An error occurred while saving the ${extension.toUpperCase()}:`, error);
        } finally {
            restoreSVGSize(svgElement, originalHeight);
            newData = filterData(ALL_DATA);
            redrawLabel(newData);
        }
    });
};

setupSaveButton('#saveSVG', '#FMFactLabelChart', serializeToSVG, '.svg');
setupSaveButton('#saveSVGLandscape', '#FMFactLabelChartLandscape', serializeToSVG, '.svg');
setupSaveButton('#saveSVGDataSet', '#FMFactLabelDataSetChart', serializeToSVG, '.svg');
setupSaveButton('#saveSVGDataSetLandscape', '#FMFactLabelDataSetChartLandscape', serializeToSVG, '.svg');

setupSaveButton('#savePNG', '#FMFactLabelChart', rasterize, '.png');
setupSaveButton('#savePNGLandscape', '#FMFactLabelChartLandscape', rasterize, '.png');
setupSaveButton('#savePNGDataSet', '#FMFactLabelDataSetChart', rasterize, '.png');
setupSaveButton('#savePNGDataSetLandscape', '#FMFactLabelDataSetChartLandscape', rasterize, '.png');

const setupPDFSaveButton = (buttonId, chartSelector) => {
    d3.select(buttonId).on('click', async function(event) {
        event.preventDefault();
        let chart = d3.select(chartSelector);
        chart.selectAll("#collapseIcon").attr("visibility", "hidden");
        const svgElement = chart.node();
        const originalHeight = adjustSVGSize(svgElement);

        try {
            const bbox = svgElement.getBBox(); // Obtén el tamaño del SVG
            const svgWidth = bbox.width;
            const svgHeight = bbox.height;

            const blob = await serializeToSVG(svgElement);
            const imgData = await readBlobAsDataURL(blob);

            const jsonString = pyodideInstance.FS.readFile("fm_characterization.json", { encoding: "utf8" });
            const fmData = JSON.parse(jsonString);
            const data = typeof fmData !== 'undefined' ? fmData : fmDataSetData;
            const name = get_property(data, 'Name').value;

            const svg = svgElement;
            const doc = new window.PDFDocument({ 
                size: [svgWidth, svgHeight]  // Ajusta el tamaño del PDF al tamaño del SVG
            });
            const chunks = [];
            const stream = doc.pipe({
              // writable stream implementation
              write: (chunk) => chunks.push(chunk),
              end: () => {
                const pdfBlob = new Blob(chunks, {
                  type: 'application/octet-stream',
                });
                const blobUrl = URL.createObjectURL(pdfBlob);

                // Crear un enlace de descarga
                const downloadLink = document.createElement("a");
                downloadLink.href = blobUrl;

                // Asignar un nombre al archivo PDF descargado
                downloadLink.download = `${name}.pdf`;

                // Simular clic para descargar el archivo
                downloadLink.click();

                // Limpiar el objeto URL
                URL.revokeObjectURL(blobUrl);
              },
              // readable stream stub implementation
              on: (event, action) => {},
              once: (...args) => {},
              emit: (...args) => {},
            });

            // Pasar las coordenadas correctas para ajustar el SVG en el PDF
            window.SVGtoPDF(doc, svg, 0, 0, {
              width: svgWidth,
              height: svgHeight
            });
            doc.end();
        } catch (error) {
            console.error("An error occurred while saving the PDF:", error);
        } finally {
            restoreSVGSize(svgElement, originalHeight);
            newData = filterData(ALL_DATA);
            redrawLabel(newData);
        }
    });
};

setupPDFSaveButton('#savePDF', '#FMFactLabelChart');
setupPDFSaveButton('#savePDFLandscape', '#FMFactLabelChartLandscape');
setupPDFSaveButton('#savePDFDataSet', '#FMFactLabelDataSetChart');
setupPDFSaveButton('#savePDFDataSetLandscape', '#FMFactLabelDataSetChartLandscape');

/**
 * Set-up the save TXT button.
 */
d3.select('#saveTXT').on('click', function () {
    const jsonString = pyodideInstance.FS.readFile("fm_characterization.json", { encoding: "utf8" });
    const fmData = JSON.parse(jsonString);
    const data = typeof fmData !== 'undefined' ? fmData : fmDataSetData;
    var blob;

    if (typeof fmData !== 'undefined') {
        blob = new Blob([fmCharacterizationStr], { type: "text/plain" });
    } else {
        blob = new Blob([fmDatasetCharacterizationStr], { type: "text/plain" });
    }

    saveAs(blob, get_property(data, 'Name').value + ".txt");
});

/**
 * Set-up the save JSON button.
 */
d3.select('#saveJSON').on('click', function () {
    const jsonString = pyodideInstance.FS.readFile("fm_characterization.json", { encoding: "utf8" });
    const fmData = JSON.parse(jsonString);
    var blob = new Blob([jsonString], { type: "application/json" });
    saveAs(blob, get_property(fmData, 'Name').value + ".json");
});

/**
 * Generic code to download a file available on the server.
 * (Not used actually.)
 */
function downloadUsingAnchorElement() {
    const anchor = document.createElement("a");
    anchor.href = IMG_URL;
    anchor.download = FILE_NAME;
    
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
}

/**
 * Third-party code:
 * - For saving SVG and PNG: https://observablehq.com/@mbostock/saving-svg
 * - FileSaver (for saving files on the client-side): https://github.com/eligrey/FileSaver.js/
 */

const xmlns = "http://www.w3.org/2000/xmlns/";
const xlinkns = "http://www.w3.org/1999/xlink";
const svgns = "http://www.w3.org/2000/svg";

function serializeToSVG(svg) {
    svg = svg.cloneNode(true);
    const fragment = window.location.href + "#";
    const walker = document.createTreeWalker(svg, NodeFilter.SHOW_ELEMENT);
    while (walker.nextNode()) {
        for (const attr of walker.currentNode.attributes) {
            if (attr.value.includes(fragment)) {
                attr.value = attr.value.replace(fragment, "#");
            }
        }
    }
    svg.setAttributeNS(xmlns, "xmlns", svgns);
    svg.setAttributeNS(xmlns, "xmlns:xlink", xlinkns);
    const serializer = new XMLSerializer();
    const string = serializer.serializeToString(svg);
    return new Blob([string], { type: "image/svg+xml" });
}

function rasterize(svg) {
    let resolve, reject;
    const promise = new Promise((y, n) => (resolve = y, reject = n));
    const image = new Image();
    image.onerror = (e) => {
        console.error("Image onerror event:", e);
        reject(e);
    };
    image.onload = () => {
        const rect = svg.getBoundingClientRect();
        const context = context2d(rect.width, rect.height);
        context.drawImage(image, 0, 0, rect.width, rect.height);
        context.canvas.toBlob((blob) => {
            resolve(blob);
        }, 'image/png');
    };
    const serializedSVG = serializeToSVG(svg);
    image.src = URL.createObjectURL(serializedSVG);
    return promise;
}

function context2d(width, height, dpi) {
    if (dpi == null) dpi = devicePixelRatio;
    const canvas = document.createElement("canvas");
    canvas.width = width * dpi;
    canvas.height = height * dpi;
    canvas.style.width = width + "px";
    const context = canvas.getContext("2d");
    context.scale(dpi, dpi);
    return context;
}

const adjustSVGSize = (svgElement) => {
    const originalHeight = svgElement.getAttribute("height");

    d3.select(".chart").selectAll("#collapseIcon").attr("visibility", "hidden");

    const bbox = svgElement.getBBox();
    svgElement.setAttribute("height", bbox.height);

    return originalHeight;
};

const restoreSVGSize = (svgElement, originalHeight) => {
    svgElement.setAttribute("height", originalHeight);
};

const readBlobAsDataURL = (blob) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Error reading the blob"));
        reader.readAsDataURL(blob);
    });
};

