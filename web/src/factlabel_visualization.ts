// Importante: Asegúrate de tener instalado @types/d3 y @types/bootstrap
declare const d3: any;
declare const bootstrap: any;

// CONSTANTS
const POINT_TO_PIXEL: number = 1.3281472327365;
const TITLE_FONT_FAMILY: string = "'Libre Franklin', sans-serif";
const TITLE_FONT_SIZE: string = "24pt";
const DESCRIPTION_FONT_FAMILY: string = "Helvetica";
const DESCRIPTION_FONT_SIZE: string = "8pt";
const PROPERTY_FONT_FAMILY: string = "Helvetica";
const PROPERTY_FONT_SIZE: string = "12pt";
const VALUES_FONT_FAMILY: string = "Helvetica";
const VALUES_FONT_SIZE: string = "10pt";
const COLLAPSEICON_FONT_SIZE: string = "8pt";
const PROPERTY_INDENTATION: number = 2;
const TOP_MARGING: number = 20;
const LEFT_MARGING: number = 5;
const MAIN_RULE_HEIGHT: number = 8 * POINT_TO_PIXEL;
const SECONDARY_RULE_HEIGHT: number = .5 * POINT_TO_PIXEL;
const MARGING_BETWEEN_PROPERTIES: number = 3;
const PROPERTIES_VALUES_SPACE: number = 20;
const PROPERTIES_RATIO_SPACE: number = 3;

const EXPANDED_ICON: string = '▾';
const COLLAPSED_ICON: string = '▸';
const HREF_ICON: string = '\uf0ac';

// INTERFACES
interface FMProperty {
    name: string;
    value: any;
    description?: string;
    level: string;
    parent?: string;
    size?: any;
    ratio?: number;
    stats?: {
        mean: number | null;
        median: number | null;
        min: number | null;
        max: number | null;
    };
}

interface FMData {
    metadata: FMProperty[];
    metrics: FMProperty[];
    analysis: FMProperty[];
}

// GLOBAL VARIABLES
let maxWidth: number;
let currentHeight: number;
let maxIndentationWidth: number;
let maxNameWidth: number;
let maxValueWidth: number;
let maxRatioWidth: number;
let PROPERTY_HEIGHT: number;
let x: any;
let yRule1: number;
let yMetrics: number;
let tooltip: any;
let contentDetail: any;
let VISIBLE_PROPERTIES: { [key: string]: boolean } = {};
let ALL_DATA: FMData;
let chart: any;

const IMPORTS: string[] = [
    'https://fonts.googleapis.com/css2?family=Libre+Franklin:wght@900',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/7.0.0/css/all.min.css'
];

function drawFMFactLabel(data: FMData): void {
    chart = d3.select(".chart");

    chart.selectAll('defs')
        .data(IMPORTS, (d: string) => d)
        .join("style")
        .attr('type', 'text/css')
        .text((d: string) => "@import url('" + d + "');");

    tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("text-align", "left")
        .style("padding", "10px 14px")
        .style("background", "rgba(26, 26, 26, 0.95)")
        .style("color", "#fff")
        .style("border", "none")
        .style("border-radius", "10px")
        .style("pointer-events", "none")
        .style("font-size", "0.85rem")
        .style("line-height", "1.4")
        .style("box-shadow", "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)")
        .style("backdrop-filter", "blur(4px)");

    contentDetail = d3.select("body").append("div")
        .attr("class", "contentDetail")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("text-align", "left")
        .style("padding", "0.1rem")
        .style("background", "#FFFFFF")
        .style("color", "#313639")
        .style("border", "1px solid #313639")
        .style("border-radius", "8px")
        .style("font-size", "0.8rem")
        .on("mouseout", function(this: any) {
            d3.select(this).transition().duration("50").style("opacity", 0);
        });

    ALL_DATA = data;
    
    // Inicializar visibilidad (Lógica original)
    data.metadata.forEach(p => VISIBLE_PROPERTIES[p.name] = true);
    data.metrics.forEach(p => VISIBLE_PROPERTIES[p.name] = true);
    data.analysis.forEach(p => VISIBLE_PROPERTIES[p.name] = true);

    PROPERTY_HEIGHT = textSize("Any text", PROPERTY_FONT_FAMILY, PROPERTY_FONT_SIZE, "bold").height;
    maxIndentationWidth = Math.max(calculateMaxIndentationWidth(data.metrics), calculateMaxIndentationWidth(data.analysis));
    maxNameWidth = Math.max(calculateMaxNameWidth(data.metrics), calculateMaxNameWidth(data.analysis));
    maxValueWidth = Math.max(calculateMaxValueWidth(data.metrics), calculateMaxValueWidth(data.analysis));
    maxRatioWidth = Math.max(calculateMaxRatioWidth(data.metrics), calculateMaxRatioWidth(data.analysis));
    
    maxWidth = maxIndentationWidth + maxNameWidth + PROPERTIES_VALUES_SPACE + maxValueWidth + PROPERTIES_RATIO_SPACE + maxRatioWidth + LEFT_MARGING;
    chart.attr("width", maxWidth);

    x = d3.scaleLinear().domain([0, maxWidth]).range([0, maxWidth]);

    // --- RENDERIZADO DE CABECERA (Tu lógica original de alturas variables) ---
    const nameVal = get_property(data, "Name")?.value || "Unknown";
    const titleSize = textSize(nameVal, TITLE_FONT_FAMILY, TITLE_FONT_SIZE);
    const yTitle = TOP_MARGING;
    const title = chart.append("g").attr("transform", `translate(0,${yTitle})`);
    title.append("text")
        .text(nameVal)
        .attr("x", x(maxWidth / 2))
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "central")
        .attr("font-family", TITLE_FONT_FAMILY)
        .attr("font-size", TITLE_FONT_SIZE)
        .attr("font-weight", "bold");

    const descVal = get_property(data, 'Description')?.value || "";
    const yDescription = yTitle + titleSize.height + 1;
    const indentationDescription = textSize("-".repeat(PROPERTY_INDENTATION), DESCRIPTION_FONT_FAMILY, DESCRIPTION_FONT_SIZE).width;
    const description = chart.append("g").attr("transform", `translate(0,${yDescription})`);
    description.append("text")
        .text(descVal)
        .attr("x", x(indentationDescription))
        .attr("font-family", DESCRIPTION_FONT_FAMILY)
        .attr("font-size", DESCRIPTION_FONT_SIZE)
        .call(wrap, maxWidth - indentationDescription)
        .attr("fill", "currentColor");
    const descriptionSize = (description.node() as SVGGraphicsElement).getBBox();

    let currentY = yDescription + descriptionSize.height + 1;

    // Metadatos (Tags, Author, etc.) con lógica de altura acumulada
    const metadataToRender = [
        { id: 'Tags', label: 'Tags:' },
        { id: 'Domain', label: 'Domain:' },
        { id: 'Author', label: 'Author:' },
        { id: 'Year', label: 'Year:' },
        { id: 'Language level', label: 'Language level:' }
    ];

    metadataToRender.forEach(m => {
        const prop = get_property(data, m.id);
        if (prop && prop.value !== null) {
            const g = chart.append("g").attr("transform", `translate(0,${currentY})`);
            addMetadata(g, m.label, prop.value);
            currentY += (g.node() as SVGGraphicsElement).getBBox().height;
        }
    });

    // Reference
    const refProp = get_property(data, 'Reference');
    if (refProp && refProp.value !== "") {
        const reference = chart.append("g").attr("transform", `translate(0,${currentY - MAIN_RULE_HEIGHT - 10})`);
        reference.append('a')
            .attr("href", refProp.value)
            .append("text")
            .attr("text-anchor", "end")
            .attr("x", maxWidth - 5)
            .attr("dy", ".35em")
            .attr("y", PROPERTY_HEIGHT / 2)
            .attr('font-family', 'FontAwesome')
            .attr('font-size', "12pt")
            .text(HREF_ICON)
            .attr("cursor", "pointer");
    }

    yRule1 = currentY;
    chart.append("g").attr("id", "rule1");
    drawRule("rule1", yRule1);

    yMetrics = yRule1 + MAIN_RULE_HEIGHT;
    chart.append("g").attr("id", "metrics").attr("transform", `translate(0,${yMetrics})`);
    
    chart.append("g").attr("id", "rule2");
    chart.append("g").attr("id", "analysis");
    chart.append("rect").attr("id", "border");

    // Eventos de los Checkboxes
    d3.select("#collapseZeroValues").on("change", () => collapseZeroValues(data));
    d3.select("#collapseSubProperties").on("change", () => collapseSubProperties(data));

    // Ejecutar el colapso inicial si está marcado
    const subPropsCheckbox = document.getElementById("collapseSubProperties") as HTMLInputElement;
    if (subPropsCheckbox && subPropsCheckbox.checked) {
        collapseSubProperties(data);
    } else {
        redrawLabel(data);
    }
}

function addMetadata(element: any, key: string, value: string): void {
    element.append("text")
        .text(key)
        .attr("x", x(PROPERTY_INDENTATION * 3))
        .attr("font-family", DESCRIPTION_FONT_FAMILY)
        .attr("font-size", DESCRIPTION_FONT_SIZE)
        .attr("font-weight", "bold");

    const keyWidth = textSize(key, DESCRIPTION_FONT_FAMILY, DESCRIPTION_FONT_SIZE).width;
    element.append("text")
        .text(value)
        .attr("x", x(6 * PROPERTY_INDENTATION + keyWidth))
        .attr("font-family", DESCRIPTION_FONT_FAMILY)
        .attr("font-size", DESCRIPTION_FONT_SIZE)
        .call(wrap, maxWidth - (6 * PROPERTY_INDENTATION + keyWidth));
}

// --- TODA LA LÓGICA DE ACTUALIZACIÓN Y REDRAW (RESTAURADA) ---

function redrawLabel(data: FMData): void {
    const visibleMetrics = data.metrics.filter(d => VISIBLE_PROPERTIES[d.name]);
    const visibleAnalysis = data.analysis.filter(d => VISIBLE_PROPERTIES[d.name]);

    updateProperties(visibleMetrics, "metrics");

    const yRule2 = yMetrics + (PROPERTY_HEIGHT * visibleMetrics.length);
    drawRule("rule2", yRule2);

    const yAnalysis = yRule2 + MAIN_RULE_HEIGHT;
    d3.select("#analysis").attr("transform", `translate(0,${yAnalysis})`);
    updateProperties(visibleAnalysis, "analysis");

    const maxHeight = yAnalysis + MARGING_BETWEEN_PROPERTIES + (PROPERTY_HEIGHT * visibleAnalysis.length);
    drawBorders(maxWidth, maxHeight);
    chart.attr("height", maxHeight);
}

function updateProperties(data: FMProperty[], id: string): void {
    d3.select("#" + id)
        .selectAll("g")
        .data(data, (d: FMProperty) => d.name) // Usamos d.name como clave
        .join(
            (enter: any) => {
                // Indentation & Group
                var property = enter.append("g")
                    .attr("id", (d: FMProperty) => d.name)
                    .attr("transform", (d: any, i: number) => "translate(0," + i * PROPERTY_HEIGHT + ")");

                property.append("rect")
                    .attr("id", "indentation")
                    .attr("x", x(0))
                    .attr("y", 0) // Ajustado a 0 para que coincida con el transform del grupo
                    .attr("width", (d: FMProperty) => get_indentation(d))
                    .attr("height", PROPERTY_HEIGHT)
                    .attr("fill", "white");

                var collapseIcon = property.append('text')
                    .attr("id", "collapseIcon")
                    .attr("x", (d: FMProperty) => get_indentation(d))
                    .attr("dy", ".35em")
                    .attr("y", PROPERTY_HEIGHT / 2)
                    .attr('font-family', 'FontAwesome')
                    .attr('font-size', COLLAPSEICON_FONT_SIZE)
                    .text((d: FMProperty) => hasChildrenProperties(d) && getChildrenProperties(data, d, false).length == 0 ? COLLAPSED_ICON : EXPANDED_ICON)
                    .attr("visibility", (d: FMProperty) => hasChildrenProperties(d) ? "visible" : "hidden")
                    .attr("cursor", "pointer")
                    .on("click", (_event: any, d: FMProperty) => { 
                        hasChildrenProperties(d) && getChildrenProperties(data, d, false).length == 0 ? expandProperty(ALL_DATA, d) : collapseProperty(ALL_DATA, d); 
                    });

                var collapseIconWidth = collapseIcon.node() === null ? 0 : (collapseIcon.node() as SVGGraphicsElement).getBBox().width;

                // Property name
                property.append("text")
                    .attr("id", "propertyName")
                    .attr("text-anchor", "start")
                    .attr("x", (d: FMProperty) => get_indentation(d) + collapseIconWidth + PROPERTY_INDENTATION)
                    .attr("y", PROPERTY_HEIGHT / 2)
                    .attr("dy", ".35em")
                    .attr("font-family", PROPERTY_FONT_FAMILY)
                    .attr("font-size", PROPERTY_FONT_SIZE)
                    .attr("font-weight", (d: FMProperty) => parseInt(d.level, 10) == 0 ? "bold" : "normal")
                    .attr("cursor", "pointer")
                    .text((d: FMProperty) => d.name)
                    .on("mouseover", function (this: any, event: MouseEvent, d: FMProperty) {
                        d3.select(this).transition().duration("50").attr("opacity", 0.85);
                        tooltip.transition().duration(50).style("opacity", 1);
                        tooltip.html(d.description || "")
                            .style("left", event.pageX + 10 + "px")
                            .style("top", event.pageY - 15 + "px");
                    })
                    .on("mouseout", function (this: any) {
                        d3.select(this).transition().duration("50").attr("opacity", 1);
                        tooltip.transition().duration("50").style("opacity", 0);
                    })
                    .on("click", (_event: any, d: FMProperty) => {
                        tooltip.transition().duration("50").style("opacity", 0);
                        showMetricModal(d);
                    });

                // Property value (size)
                property.append("text")
                    .attr("id", "value")
                    .attr("text-anchor", "end")
                    .attr("x", x(maxIndentationWidth + maxNameWidth + PROPERTIES_VALUES_SPACE + maxValueWidth))
                    .attr("y", PROPERTY_HEIGHT / 2)
                    .attr("dy", ".35em")
                    .attr("font-family", PROPERTY_FONT_FAMILY)
                    .attr("font-size", VALUES_FONT_SIZE)
                    .attr("font-weight", "bold")
                    .text((d: FMProperty) => get_value(d));

                // Property ratio
                property.append("text")
                    .attr("id", "ratio")
                    .attr("text-anchor", "end")
                    .attr("x", x(maxWidth - LEFT_MARGING))
                    .attr("y", PROPERTY_HEIGHT / 2)
                    .attr("dy", ".35em")
                    .attr("font-family", PROPERTY_FONT_FAMILY)
                    .attr("font-size", VALUES_FONT_SIZE)
                    .attr("font-weight", "bold")
                    .text((d: FMProperty) => get_ratio(d));

                return property;
            },
            (update: any) => {
                // RESTAURADO: Actualización de iconos y eventos en el re-render
                update.attr("transform", (_d: any, i: number) => "translate(0," + i * PROPERTY_HEIGHT + ")");
                
                update.select("#collapseIcon")
                    .text((d: FMProperty) => hasChildrenProperties(d) && getChildrenProperties(data, d, false).length == 0 ? COLLAPSED_ICON : EXPANDED_ICON)
                    .attr("visibility", (d: FMProperty) => hasChildrenProperties(d) ? "visible" : "hidden")
                    .on("click", (_event: any, d: FMProperty) => { 
                        hasChildrenProperties(d) && getChildrenProperties(data, d, false).length == 0 ? expandProperty(ALL_DATA, d) : collapseProperty(ALL_DATA, d); 
                    });
                
                return update;
            },
            (exit: any) => exit.remove()
        );
    drawSecondaryRules(data);
}

// RESTO DE HELPERS (Iguales pero con tipos)

function get_value(d: FMProperty): string {
    return (d.size === null || d.size === undefined) ? String(d.value) : String(d.size);
}

function get_ratio(d: FMProperty): string {
    return !d.ratio ? "" : "(" + Math.round((d.ratio + Number.EPSILON) * 100) + "%)";
}

function get_indentation(d: FMProperty): number {
    return textSize("-".repeat(1 + PROPERTY_INDENTATION * parseInt(d.level)), PROPERTY_FONT_FAMILY, PROPERTY_FONT_SIZE).width;
}

function get_property(data: FMData, propertyName: string): FMProperty | undefined {
    return [...data.metadata, ...data.metrics, ...data.analysis].find(p => p.name === propertyName);
}

function hasChildrenProperties(property: FMProperty): boolean {
    return [...ALL_DATA.metrics, ...ALL_DATA.analysis].some(p => p.parent === property.name);
}

function getChildrenProperties(data: FMProperty[], property: FMProperty, recursively: boolean): FMProperty[] {
    let children = data.filter(p => p.parent === property.name);
    if (recursively) {
        children.forEach(c => {
            children = [...children, ...getChildrenProperties(data, c, true)];
        });
    }
    return children;
}

// Colapsos
function collapseSubProperties(data: FMData): void {
    const isChecked = (d3.select("#collapseSubProperties").node() as HTMLInputElement).checked;
    [...data.metrics, ...data.analysis].forEach(p => {
        if (parseInt(p.level) > 0) VISIBLE_PROPERTIES[p.name] = !isChecked;
    });
    redrawLabel(data);
}

function collapseZeroValues(data: FMData): void {
    const isChecked = (d3.select("#collapseZeroValues").node() as HTMLInputElement).checked;
    if (isChecked) {
        [...data.metrics, ...data.analysis].forEach(p => {
            if (get_value(p) === "0") VISIBLE_PROPERTIES[p.name] = false;
        });
    } else {
        // Al desmarcar, solo restauramos los que no sean subpropiedades si el otro check está activo
        const subCheck = (d3.select("#collapseSubProperties").node() as HTMLInputElement).checked;
        [...data.metrics, ...data.analysis].forEach(p => {
            if (get_value(p) === "0") {
                VISIBLE_PROPERTIES[p.name] = subCheck ? parseInt(p.level) === 0 : true;
            }
        });
    }
    redrawLabel(data);
}

function collapseProperty(data: FMData, property: FMProperty): void {
    const children = getChildrenProperties([...data.metrics, ...data.analysis], property, true);
    children.forEach(c => VISIBLE_PROPERTIES[c.name] = false);
    redrawLabel(data);
}

function expandProperty(data: FMData, property: FMProperty): void {
    const children = getChildrenProperties([...data.metrics, ...data.analysis], property, false);
    children.forEach(c => VISIBLE_PROPERTIES[c.name] = true);
    redrawLabel(data);
}

// Dibujo de reglas y bordes
function drawRule(id: string, yPosition: number): void {
    const g = d3.select("#" + id).attr("transform", `translate(0,${yPosition})`);
    g.selectAll("rect").remove();
    g.append("rect")
        .attr("height", MAIN_RULE_HEIGHT)
        .attr("width", maxWidth);
}

function drawBorders(width: number, height: number): void {
    d3.select("#border")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", width)
        .attr("height", height)
        .style("stroke", "black")
        .style("fill", "none")
        .style("stroke-width", "3pt");
}

function drawSecondaryRules(data: FMProperty[]): void {
    const targets = ["Compound features", "Root feature", "Features in constraints", "Configurations"];
    targets.forEach(name => {
        if (data.some(p => p.name === name)) drawSecondaryRule(name);
    });
}

function drawSecondaryRule(propertyName: string): void {
    const property = d3.select(`g[id='${propertyName}']`);
    const nameNode = property.select("#propertyName");
    if (!nameNode.empty()) {
        const xPos = nameNode.attr("x");
        property.selectAll(".secondary-rule").remove();
        property.append("rect")
            .attr("class", "secondary-rule")
            .attr("x", xPos)
            .attr("y", 1)
            .attr("height", SECONDARY_RULE_HEIGHT)
            .attr("width", maxWidth - parseFloat(xPos));
    }
}

// TextSize y Wrap (Igual que antes pero robustos)
function textSize(text: string, fontFamily: string, fontSize: string, fontWeight: string = "normal"): { width: number, height: number } {
    const container = d3.select('body').append('svg').style("visibility", "hidden");
    const t = container.append('text')
        .text(text)
        .attr("font-family", fontFamily)
        .attr("font-size", fontSize)
        .attr("font-weight", fontWeight);
    const bbox = (t.node() as SVGGraphicsElement).getBBox();
    container.remove();
    return { width: bbox.width, height: bbox.height };
}

function wrap(text: any, width: number): void {
    text.each(function(this: any) {
        let textNode = d3.select(this),
            words = textNode.text().split(/\s+/).reverse(),
            word,
            line: string[] = [],
            lineNumber = 0,
            lineHeight = 1.1,
            xPos = textNode.attr("x"),
            yPos = textNode.attr("y") || 0,
            dy = parseFloat(textNode.attr("dy") || "0");

        let tspan = textNode.text(null).append("tspan").attr("x", xPos).attr("y", yPos).attr("dy", dy + "em");
        
        while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(" "));
            if ((tspan.node() as SVGTSpanElement).getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                tspan = textNode.append("tspan").attr("x", xPos).attr("y", yPos).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
            }
        }
    });
}

// Cálculos de anchos
function calculateMaxNameWidth(data: FMProperty[]): number {
    return data.length === 0 ? 0 : Math.max(...data.map(d => textSize(d.name, PROPERTY_FONT_FAMILY, PROPERTY_FONT_SIZE).width));
}
function calculateMaxValueWidth(data: FMProperty[]): number {
    return data.length === 0 ? 0 : Math.max(...data.map(d => textSize(get_value(d), VALUES_FONT_FAMILY, VALUES_FONT_SIZE).width));
}
function calculateMaxRatioWidth(data: FMProperty[]): number {
    return data.length === 0 ? 0 : Math.max(...data.map(d => textSize(get_ratio(d), VALUES_FONT_FAMILY, VALUES_FONT_SIZE).width));
}
function calculateMaxIndentationWidth(data: FMProperty[]): number {
    return data.length === 0 ? 0 : Math.max(...data.map(d => get_indentation(d)));
}

// Modal
function showMetricModal(metric: FMProperty): void {
    const modalTitle = document.getElementById("metricModalLabel");
    const modalBody = document.querySelector("#metricModal .modal-body");
    if (modalTitle) modalTitle.innerHTML = `<b>${metric.name} </b><br><small>${metric.description}</small>`;
    if (modalBody) {
        if (metric.stats) {
            modalBody.innerHTML = `
                <p><strong>Mean:</strong> ${metric.stats.mean ?? "N/A"}</p>
                <p><strong>Median:</strong> ${metric.stats.median ?? "N/A"}</p>
                <p><strong>Min:</strong> ${metric.stats.min ?? "N/A"}</p>
                <p><strong>Max:</strong> ${metric.stats.max ?? "N/A"}</p>`;
        } else {
            modalBody.innerHTML = Array.isArray(metric.value) ? metric.value.join(", ") : String(metric.value);
        }
    }
    const modalEl = document.getElementById("metricModal");
    if (modalEl) {
        const m = new bootstrap.Modal(modalEl);
        m.show();
    }
}

// Hacer global
(window as any).drawFMFactLabel = drawFMFactLabel;