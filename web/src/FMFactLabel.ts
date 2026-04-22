declare const d3: any;
declare const bootstrap: any;
declare const saveAs: (data: Blob | string, filename?: string, options?: any) => void;

declare global {
    interface Window {
        SVGtoPDF: (doc: any, svg: SVGElement, x: number, y: number, options: any) => void;
        PDFDocument: any;
    }
}


// INTERFACES
interface FMProperty {
    name: string;
    value: any;
    description?: string;
    level: number;
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

interface FMFactLabelOptions {
    zeroValuesSelector?: string;        // Optional selector for the zero values checkbox
    subPropertiesSelector?: string;     // Optional selector for subproperties
    zebraStripingSelector?: string;     // Optional selector for zebra striping
    showRatioBarSelector?: string;      // Optional selector for showing ratio bars
    showPercentagesSelector?: string;   // Optional selector for showing percentages
    metricsSelectorContainer?: string;  // Optional selector for the metrics selectors
}

export class FMFactLabel {
    // CONSTANTS
    private readonly POINT_TO_PIXEL = 1.3281472327365;
    private readonly TITLE_FONT_FAMILY = "'Libre Franklin', sans-serif";
    private readonly TITLE_FONT_SIZE = "26pt";
    private readonly DESCRIPTION_FONT_FAMILY = "Helvetica";
    private readonly DESCRIPTION_FONT_SIZE = "8pt";
    private readonly PROPERTY_FONT_FAMILY = "Helvetica";
    private readonly PROPERTY_FONT_SIZE = "12pt";
    private readonly VALUES_FONT_FAMILY = "Helvetica";
    private readonly VALUES_FONT_SIZE = "10pt";
    private readonly COLLAPSEICON_FONT_SIZE = "8pt";
    private readonly PROPERTY_INDENTATION = 2;
    private readonly TOP_MARGING = 20;
    private readonly LEFT_MARGING = 5;
    private readonly MAIN_RULE_HEIGHT = 8 * 1.3281472327365;
    private readonly SECONDARY_RULE_HEIGHT = .5 * 1.3281472327365;
    private readonly MARGING_BETWEEN_PROPERTIES = 3;
    private readonly PROPERTIES_VALUES_SPACE = 20;
    private readonly PROPERTIES_RATIO_SPACE = 3;
    private readonly EXPANDED_ICON = '▾';
    private readonly COLLAPSED_ICON = '▸';
    private readonly HREF_ICON = '\uf0ac';
    private readonly IMPORTS = [
        'https://fonts.googleapis.com/css2?family=Libre+Franklin:wght@900',
        'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/7.0.0/css/all.min.css'
    ];
    private readonly XMLNS = "http://www.w3.org/2000/xmlns/";
    private readonly XLINKNS = "http://www.w3.org/1999/xlink";
    private readonly SVGNS = "http://www.w3.org/2000/svg";
    
    // Define el orden y los nombres exactos una sola vez
    private readonly METADATA_KEYS = [
        { id: 'Description', label: 'Description' },
        { id: 'Tags', label: 'Tags' },
        { id: 'Domain', label: 'Domain' },
        { id: 'Author', label: 'Author' },
        { id: 'Year', label: 'Year' },
        { id: 'Language level', label: 'Language level' },
        { id: 'Reference', label: 'Reference' }
    ];

    private readonly MODERN_COLORS = {
        textMain: "#1a1a1a",
        accent: "#2e59d9",
        barBg: "#f0f2f5"
    };

    // VARIABLES
    private chart: any;
    private tooltip: any;
    private allData: FMData;
    private visibleProperties: { [key: string]: boolean } = {};
    private maxWidth: number = 0;
    private propertyHeight: number = 0;
    private maxIndentationWidth: number = 0;
    private maxNameWidth: number = 0;
    private maxValueWidth: number = 0;
    private maxRatioWidth: number = 0;
    private x: any;
    private yRule1: number = 0;
    private yMetrics: number = 0;
    private showZebra: boolean = false;
    private showRatioBar: boolean = false;
    private showPercentages: boolean = true;

    constructor(selector: string, data: FMData, options: FMFactLabelOptions = {}) {
        this.allData = data;
        this.chart = d3.select(selector);
        
        // Initialize visibility (Only primary properties visible by default)
        [...data.metadata, ...data.metrics, ...data.analysis].forEach(p => {
            this.visibleProperties[p.name] = (p.level === 0);
        });

        this.initStyles();
        this.initTooltip();
        this.calculateDimensions();
        this.renderStaticStructure();

        this.setupSelectors(options);  // Selectors configuration

        // Configure selectors for checkboxes if provided
        if (options.zeroValuesSelector) {
            d3.select(options.zeroValuesSelector).property("checked", false);  // Ensure the checkbox is unchecked by default
            d3.select(options.zeroValuesSelector).on("change", (e: any) => {
                this.toggleZeroValues(e.target.checked);
            });
        }

        if (options.subPropertiesSelector) {
            d3.select(options.subPropertiesSelector).property("checked", true);  // Ensure the checkbox is checked by default
            d3.select(options.subPropertiesSelector).on("change", (e: any) => {
                this.toggleSubProperties(e.target.checked);
            });
        }

        this.draw();
    }

    private setupSelectors(options: FMFactLabelOptions): void {
        if (options.zeroValuesSelector) {
            d3.select(options.zeroValuesSelector).property("checked", false);  // Ensure the checkbox is unchecked by default
            d3.select(options.zeroValuesSelector).on("change", (e: any) => this.toggleZeroValues(e.target.checked));
        }
        if (options.subPropertiesSelector) {
            d3.select(options.subPropertiesSelector).property("checked", true);  // Ensure the checkbox is checked by default
            d3.select(options.subPropertiesSelector).on("change", (e: any) => this.toggleSubProperties(e.target.checked));
        }
        // Nuevos Selectores
        if (options.zebraStripingSelector) {
            d3.select(options.zebraStripingSelector).property("checked", false);  // Ensure the checkbox is unchecked by default
            d3.select(options.zebraStripingSelector).on("change", (e: any) => {
                this.showZebra = e.target.checked;
                this.draw();
            });
        }
        if (options.showRatioBarSelector) {
            d3.select(options.showRatioBarSelector).property("checked", false);  // Ensure the checkbox is unchecked by default
            d3.select(options.showRatioBarSelector).on("change", (e: any) => {
                this.showRatioBar = e.target.checked;
                this.draw();
            });
        }
        if (options.showPercentagesSelector) {
            d3.select(options.showPercentagesSelector).property("checked", true);  // Ensure the checkbox is checked by default
            d3.select(options.showPercentagesSelector).on("change", (e: any) => {
                this.showPercentages = e.target.checked;
                this.draw();
            });
        }

        if (options.metricsSelectorContainer) {
            this.generateMetricsSelector(options.metricsSelectorContainer);
            this.generateMetricsSelector(options.metricsSelectorContainer);
        }
    }

    private initStyles(): void {
        this.chart.selectAll('defs')
            .data(this.IMPORTS, (d: string) => d)
            .join("style")
            .attr('type', 'text/css')
            .text((d: string) => "@import url('" + d + "');");
    }

    private initTooltip(): void {
        this.tooltip = d3.select("body").select(".fm-facts-tooltip");
        if (this.tooltip.empty()) {
            this.tooltip = d3.select("body").append("div")
                .attr("class", "fm-facts-tooltip")
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
                .style("box-shadow", "0 20px 25px -5px rgba(0, 0, 0, 0.2)")
                .style("backdrop-filter", "blur(4px)")
                .style("z-index", "9999");
        }
    }

    private calculateDimensions(): void {
        const data = this.allData;
        this.propertyHeight = this.textSize("Any text", this.PROPERTY_FONT_FAMILY, this.PROPERTY_FONT_SIZE, "bold").height;
        this.maxIndentationWidth = Math.max(this.calculateMaxIndentationWidth(data.metrics), this.calculateMaxIndentationWidth(data.analysis));
        this.maxNameWidth = Math.max(this.calculateMaxNameWidth(data.metrics), this.calculateMaxNameWidth(data.analysis));
        this.maxValueWidth = Math.max(this.calculateMaxValueWidth(data.metrics), this.calculateMaxValueWidth(data.analysis));
        
        const ratioSpaceNeeded = (this.showRatioBar || this.showPercentages);
        this.maxRatioWidth = ratioSpaceNeeded ? Math.max(this.calculateMaxRatioWidth(data.metrics), this.calculateMaxRatioWidth(data.analysis)) : 0;
        
        this.maxWidth = this.maxIndentationWidth + this.maxNameWidth + this.PROPERTIES_VALUES_SPACE + this.maxValueWidth + (ratioSpaceNeeded ? (this.PROPERTIES_RATIO_SPACE + this.maxRatioWidth) : 0) + this.LEFT_MARGING;
        this.chart.attr("width", this.maxWidth);
        this.x = d3.scaleLinear().domain([0, this.maxWidth]).range([0, this.maxWidth]);
    }

    private renderStaticStructure(): void {
        const data = this.allData;
        
        // Título
        const title = this.chart.append("g").attr("transform", `translate(0,${this.TOP_MARGING})`);
        
        title.append("text")
            .text(this.getProperty("Name")?.value || "Unknown")
            .attr("x", this.x(this.maxWidth / 2))
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "central")
            .style("font-family", this.TITLE_FONT_FAMILY)
            .style("font-size", this.TITLE_FONT_SIZE)
            .style("font-weight", "900")
            .style("fill", "#000");

        this.METADATA_KEYS.forEach(m => {
            this.chart.append("g")
                .attr("id", m.id.replace(/\s+/g, '-'))
                .attr("class", "dynamic-metadata-item");
        });

        this.chart.append("g").attr("id", "rule1");
        this.chart.append("g").attr("id", "metrics").attr("transform", `translate(0,${this.yMetrics})`);
        this.chart.append("g").attr("id", "rule2");
        this.chart.append("g").attr("id", "analysis");
        this.chart.append("rect").attr("id", "border");
    }

    private addMetadata(element: any, key: string, value: string): void {
        element.append("text")
            .text(key)
            .attr("x", this.x(this.PROPERTY_INDENTATION * 3))
            .attr("font-family", this.DESCRIPTION_FONT_FAMILY)
            .attr("font-size", this.DESCRIPTION_FONT_SIZE)
            .attr("font-weight", "bold");

        const keyWidth = this.textSize(key, this.DESCRIPTION_FONT_FAMILY, this.DESCRIPTION_FONT_SIZE).width;
        element.append("text")
            .text(value)
            .attr("x", this.x(6 * this.PROPERTY_INDENTATION + keyWidth))
            .attr("font-family", this.DESCRIPTION_FONT_FAMILY)
            .attr("font-size", this.DESCRIPTION_FONT_SIZE)
            .call(this.wrap.bind(this), this.maxWidth - (6 * this.PROPERTY_INDENTATION + keyWidth));
    }

    public draw(): void {
        this.calculateDimensions();

        const nameVal = this.getProperty("Name")?.value || "Unknown";
        const titleSize = this.textSize(nameVal, this.TITLE_FONT_FAMILY, this.TITLE_FONT_SIZE);
        this.chart.select("#main-title").attr("x", this.x(this.maxWidth / 2));

        // Layout dinámico de cabecera
        let currentY = this.TOP_MARGING + titleSize.height; // + 5;

        this.METADATA_KEYS.forEach(m => {
            const prop = this.getProperty(m.id);
            const safeId = m.id.replace(/\s+/g, '-');
            const group = this.chart.select(`#${safeId}`);
            const isVisible = this.visibleProperties[m.id] !== false && prop && prop.value;

            group.selectAll("*").remove();

            if (isVisible) {
                group.style("display", "inline");

                if (m.id === 'Description') {
                    group.attr("transform", `translate(0,${currentY})`);
                    const indent = this.textSize("-".repeat(this.PROPERTY_INDENTATION), this.DESCRIPTION_FONT_FAMILY, this.DESCRIPTION_FONT_SIZE).width;
                    group.append("text")
                        .text(prop.value)
                        .attr("x", this.x(indent))
                        .attr("font-family", this.DESCRIPTION_FONT_FAMILY)
                        .attr("font-size", this.DESCRIPTION_FONT_SIZE)
                        .call(this.wrap.bind(this), this.maxWidth - indent);
                    
                    currentY += (group.node() as SVGGraphicsElement).getBBox().height; // +2

                } else if (m.id === 'Reference') {
                    // CASO ESPECIAL: Icono a la derecha
                    // No sumamos currentY aquí para que quede alineado con el final de la sección
                    // o lo posicionamos un poco antes de la regla
                    group.attr("transform", `translate(0,${currentY - 15})`);
                    group.append('a')
                        .attr("href", prop.value)
                        .attr("target", "_blank")
                        .append("text")
                        .attr("text-anchor", "end")
                        .attr("x", this.maxWidth - 5)
                        .attr('font-family', 'FontAwesome')
                        .attr('font-size', "12pt")
                        .text(this.HREF_ICON)
                        .attr("cursor", "pointer");
                    
                    // Opcional: Si quieres que la regla respete el espacio del icono:
                    //currentY += 15; 

                } else {
                    // Metadatos estándar
                    group.attr("transform", `translate(0,${currentY})`);
                    this.addMetadata(group, m.label + ":", prop.value);
                    currentY += (group.node() as SVGGraphicsElement).getBBox().height + 2;
                }
            } else {
                group.style("display", "none");
            }
        });
        // 4. Posicionar Regla 1 y Métricas
        this.yRule1 = currentY - 5; // + 5;
        this.drawRule("rule1", this.yRule1);

        this.yMetrics = this.yRule1 + this.MAIN_RULE_HEIGHT;
        const visibleMetrics = this.allData.metrics.filter(d => this.visibleProperties[d.name]);
        this.chart.select("#metrics").attr("transform", `translate(0,${this.yMetrics})`);
        this.updateProperties(visibleMetrics, "metrics");

        // 5. Posicionar Regla 2 y Análisis
        const yRule2 = this.yMetrics + (this.propertyHeight * visibleMetrics.length);
        this.drawRule("rule2", yRule2);

        const visibleAnalysis = this.allData.analysis.filter(d => this.visibleProperties[d.name]);
        const yAnalysis = yRule2 + this.MAIN_RULE_HEIGHT;
        this.chart.select("#analysis").attr("transform", `translate(0,${yAnalysis})`);
        this.updateProperties(visibleAnalysis, "analysis");

        // 6. Ajuste Final de Bordes y Altura del SVG
        const maxHeight = yAnalysis + (this.propertyHeight * visibleAnalysis.length) + 10;
        this.drawBorders(this.maxWidth, maxHeight);
        this.chart.attr("height", maxHeight);
        
        this.syncMetricsSelector();
    }

    private updateProperties(data: FMProperty[], containerId: string): void {
        const self = this;
        const container = this.chart.select("#" + containerId);

        container.selectAll("g.property-row")
            .data(data, (d: FMProperty) => d.name)
            .join(
                (enter: any) => {
                    const g = enter.append("g").attr("class", "property-row");
                    g.append("rect").attr("class", "bg-row"); 
                    g.append("rect").attr("class", "ratio-bar-bg");
                    g.append("rect").attr("class", "ratio-bar-fill");
                    g.append("text").attr("class", "collapse-icon");
                    g.append("text").attr("class", "prop-name");
                    g.append("text").attr("class", "prop-value");
                    g.append("text").attr("class", "prop-ratio");
                    return g;
                }
            )
            .each(function(this: any, d: FMProperty, i: number) {
                const row = d3.select(this);
                row.attr("transform", `translate(0,${i * self.propertyHeight})`);

                // Zebra striping
                row.select(".bg-row")
                    .attr("x", 0)
                    .attr("y", 0)
                    .attr("width", self.maxWidth)
                    .attr("height", self.propertyHeight)
                    .style("fill", self.showZebra && i % 2 !== 0 ? "#f3f4f6" : "rgba(0,0,0,0)") // Usar rgba transparente es más seguro
                    .style("pointer-events", "all"); // Para que el hover funcione en toda la fila
                    
                // Ratio Bars (Micro-viz)
                const showBar = self.showRatioBar && d.ratio !== undefined;
                const barWidth = self.maxRatioWidth;
                const barX = self.maxWidth - self.maxRatioWidth - self.LEFT_MARGING;

                row.select(".ratio-bar-bg")
                    .attr("x", barX)
                    .attr("y", 4)
                    .attr("width", barWidth)
                    .attr("height", self.propertyHeight - 8)
                    .attr("fill", self.MODERN_COLORS.barBg)
                    .attr("rx", 2)
                    .style("visibility", showBar ? "visible" : "hidden");

                row.select(".ratio-bar-fill")
                    .attr("x", barX)
                    .attr("y", 4)
                    .attr("width", barWidth * (d.ratio || 0))
                    .attr("height", self.propertyHeight - 8)
                    .attr("fill", self.MODERN_COLORS.accent)
                    .attr("opacity", 0.4)
                    .attr("rx", 2)
                    .style("visibility", showBar ? "visible" : "hidden");


                // Fondo indentación
                row.select(".indent-rect")
                    .attr("width", self.getIndentation(d))
                    .attr("height", self.propertyHeight);

                // Icono Colapso
                const children = self.getChildrenProperties(data, d, false);
                const isCollapsed = self.hasChildrenProperties(d) && !children.some(c => self.visibleProperties[c.name]);

                const icon = row.select(".collapse-icon")
                    .attr("x", self.getIndentation(d))
                    .attr("dy", ".35em")
                    .attr("y", self.propertyHeight / 2)
                    .attr('font-family', 'FontAwesome')
                    .attr('font-size', self.COLLAPSEICON_FONT_SIZE)
                    .text(isCollapsed ? self.COLLAPSED_ICON : self.EXPANDED_ICON)
                    .attr("visibility", self.hasChildrenProperties(d) ? "visible" : "hidden")
                    .on("click", () => isCollapsed ? self.expandProperty(d) : self.collapseProperty(d));

                const iconW = (icon.node() as SVGGraphicsElement)?.getBBox().width || 0;

                // Nombre Propiedad
                row.select(".prop-name")
                    .attr("x", self.getIndentation(d) + iconW + self.PROPERTY_INDENTATION)
                    .attr("y", self.propertyHeight / 2)
                    .attr("dy", ".35em")
                    .attr("font-family", self.PROPERTY_FONT_FAMILY)
                    .attr("font-size", self.PROPERTY_FONT_SIZE)
                    .attr("font-weight", d.level === 0 ? "bold" : "normal")
                    .text(d.name)
                    .on("mouseover", (event: MouseEvent) => {
                        self.tooltip.transition().duration(50).style("opacity", 1);
                        self.tooltip.html(d.description || "")
                            .style("left", event.pageX + 10 + "px")
                            .style("top", event.pageY - 15 + "px");
                    })
                    .on("mouseout", () => self.tooltip.transition().duration(50).style("opacity", 0))
                    .on("click", () => self.showMetricModal(d));

                // Valor
                row.select(".prop-value")
                    .attr("text-anchor", "end")
                    .attr("x", self.x(self.maxIndentationWidth + self.maxNameWidth + self.PROPERTIES_VALUES_SPACE + self.maxValueWidth))
                    .attr("y", self.propertyHeight / 2)
                    .attr("dy", ".35em")
                    .attr("font-family", self.PROPERTY_FONT_FAMILY)
                    .attr("font-size", self.VALUES_FONT_SIZE)
                    .attr("font-weight", "bold")
                    .text(self.getValue(d));

                // Ratio
                row.select(".prop-ratio")
                    .attr("text-anchor", "end")
                    .attr("x", self.x(self.maxWidth - self.LEFT_MARGING))
                    .attr("y", self.propertyHeight / 2)
                    .attr("dy", ".35em")
                    .attr("font-family", self.PROPERTY_FONT_FAMILY)
                    .attr("font-size", self.VALUES_FONT_SIZE)
                    .attr("font-weight", "bold")
                    .style("visibility", self.showPercentages ? "visible" : "hidden")
                    .text(self.getRatio(d));
            });

        this.drawSecondaryRules(data, containerId);
    }

    // --- MÉTODOS DE COLAPSO ---
    private collapseProperty(property: FMProperty): void {
        const children = this.getChildrenProperties([...this.allData.metrics, ...this.allData.analysis], property, true);
        children.forEach(c => this.visibleProperties[c.name] = false);
        this.draw();
    }

    private expandProperty(property: FMProperty): void {
        const children = this.getChildrenProperties([...this.allData.metrics, ...this.allData.analysis], property, false);
        children.forEach(c => this.visibleProperties[c.name] = true);
        this.draw();
    }

    public toggleZeroValues(isChecked: boolean): void {
        const all = [...this.allData.metrics, ...this.allData.analysis];
        all.forEach(p => {
            if (this.getValue(p) === "0") this.visibleProperties[p.name] = !isChecked;
        });
        this.draw();
    }

    public toggleSubProperties(isChecked: boolean): void {
        const all = [...this.allData.metrics, ...this.allData.analysis];
        all.forEach(p => {
            if (p.level > 0) this.visibleProperties[p.name] = !isChecked;
        });
        this.draw();
    }

    // --- HELPERS ---
    private getProperty(name: string): FMProperty | undefined {
        return [...this.allData.metadata, ...this.allData.metrics, ...this.allData.analysis].find(p => p.name === name);
    }

    private getValue(d: FMProperty): string {
        return (d.size === null || d.size === undefined) ? String(d.value) : String(d.size);
    }

    private getRatio(d: FMProperty): string {
        return d.ratio ? `(${Math.round((d.ratio + Number.EPSILON) * 100)}%)` : "";
    }

    private getIndentation(d: FMProperty): number {
        return this.textSize("-".repeat(1 + this.PROPERTY_INDENTATION * d.level), this.PROPERTY_FONT_FAMILY, this.PROPERTY_FONT_SIZE).width;
    }

    private hasChildrenProperties(prop: FMProperty): boolean {
        return [...this.allData.metrics, ...this.allData.analysis].some(p => p.parent === prop.name);
    }

    private getChildrenProperties(data: FMProperty[], prop: FMProperty, recursive: boolean): FMProperty[] {
        let children = data.filter(p => p.parent === prop.name);
        if (recursive) {
            children.forEach(c => {
                children = [...children, ...this.getChildrenProperties(data, c, true)];
            });
        }
        return children;
    }

    private drawRule(id: string, y: number): void {
        const g = this.chart.select("#" + id).attr("transform", `translate(0,${y})`);
        g.selectAll("rect").remove();
        g.append("rect").attr("height", this.MAIN_RULE_HEIGHT).attr("width", this.maxWidth);
    }

    private drawSecondaryRules(data: FMProperty[], containerId: string): void {
        const targets = ["Compound features", "Root feature", "Features in constraints", "Configurations"];
        const container = this.chart.select("#" + containerId);
        targets.forEach(name => {
            const row = container.selectAll("g.property-row").filter((d: any) => d.name === name);
            if (!row.empty()) {
                row.selectAll(".secondary-rule").remove();
                const xPos = parseFloat(row.select(".prop-name").attr("x"));
                row.append("rect")
                    .attr("class", "secondary-rule")
                    .attr("x", xPos)
                    .attr("y", 1)
                    .attr("height", this.SECONDARY_RULE_HEIGHT)
                    .attr("width", this.maxWidth - xPos);
            }
        });
    }

    private drawBorders(w: number, h: number): void {
        this.chart.select("#border")
            .attr("x", 0).attr("y", 0).attr("width", w).attr("height", h)
            .style("stroke", "black").style("fill", "none").style("stroke-width", "3pt");
    }

    private textSize(text: string, family: string, size: string, weight: string = "normal"): { width: number, height: number } {
        const container = d3.select('body').append('svg').style("visibility", "hidden").style("position", "absolute");
        const t = container.append('text').text(text).attr("font-family", family).attr("font-size", size).attr("font-weight", weight);
        const bbox = (t.node() as SVGGraphicsElement).getBBox();
        container.remove();
        return { width: bbox.width, height: bbox.height };
    }

    private wrap(text: any, width: number): void {
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

    private calculateMaxNameWidth(d: FMProperty[]): number { return d.length ? Math.max(...d.map(i => this.textSize(i.name, this.PROPERTY_FONT_FAMILY, this.PROPERTY_FONT_SIZE).width)) : 0; }
    private calculateMaxValueWidth(d: FMProperty[]): number { return d.length ? Math.max(...d.map(i => this.textSize(this.getValue(i), this.VALUES_FONT_FAMILY, this.VALUES_FONT_SIZE).width)) : 0; }
    private calculateMaxRatioWidth(d: FMProperty[]): number { return d.length ? Math.max(...d.map(i => this.textSize(this.getRatio(i), this.VALUES_FONT_FAMILY, this.VALUES_FONT_SIZE).width)) : 0; }
    private calculateMaxIndentationWidth(d: FMProperty[]): number { return d.length ? Math.max(...d.map(i => this.getIndentation(i))) : 0; }

    private showMetricModal(metric: FMProperty): void {
        const modalTitle = document.getElementById("metricModalLabel");
        const modalBody = document.querySelector("#metricModal .modal-body");
        if (modalTitle) modalTitle.innerHTML = `<b>${metric.name} </b><br><small>${metric.description || ''}</small>`;
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

    /**
     * Genera dinámicamente los toggles de visibilidad para cada métrica.
     * @param containerSelector Selector del contenedor donde se insertarán los toggles.
     */
    private generateMetricsSelector(containerSelector: string): void {
        const container = document.querySelector(containerSelector) as HTMLDivElement;
        if (!container) return;

        container.innerHTML = "";

        // 1. Crear el buscador (Input)
        const searchWrapper = document.createElement("div");
        searchWrapper.className = "px-1 mb-3";
        searchWrapper.innerHTML = `
            <div class="input-group input-group-sm">
                <span class="input-group-text bg-white border-end-0"><i class="fa-solid fa-magnifying-glass text-muted"></i></span>
                <input type="text" class="form-control border-start-0 ps-0" id="metricSearch" placeholder="Search metrics...">
            </div>
        `;
        container.appendChild(searchWrapper);

        // 2. Botones Bulk (All/None)
        const bulkActions = document.createElement("div");
        bulkActions.className = "mb-2 border-bottom pb-2 d-flex justify-content-between px-1";
        bulkActions.innerHTML = `
            <button type="button" class="btn btn-sm btn-link p-0 text-decoration-none" id="btnSelectAll">Select All</button>
            <button type="button" class="btn btn-sm btn-link p-0 text-decoration-none text-danger" id="btnSelectNone">Select None</button>
        `;
        container.appendChild(bulkActions);

        // Contenedor interno para los items (para filtrar fácil)
        const listContainer = document.createElement("div");
        listContainer.id = "metricListItems";
        container.appendChild(listContainer);

        const metadataProperties: FMProperty[] = this.METADATA_KEYS.map(m => ({
            name: m.id, // Usamos el ID como nombre para el selector
            value: "",
            level: 0
        } as FMProperty));
        const allProperties: FMProperty[] = [...metadataProperties, ...this.allData.metrics, ...this.allData.analysis];

        allProperties.forEach((prop: FMProperty) => {
            const wrapper = document.createElement("div");
            wrapper.className = "form-check form-switch mb-2 metric-item text-nowrap d-flex align-items-center";
            wrapper.setAttribute("data-name", prop.name.toLowerCase()); // Para el buscador

            const safeId = `toggle-${prop.name.replace(/\s+/g, '-')}`;
            wrapper.innerHTML = `
                <input class="form-check-input metric-toggle flex-shrink-0" type="checkbox" id="${safeId}" data-metric="${prop.name}" 
                    ${this.visibleProperties[prop.name] !== false ? 'checked' : ''}>
                <label class="form-check-label small ps-2 pe-3" for="${safeId}" style="cursor: pointer; flex-grow: 1;">
                    ${prop.name}
                </label>
            `;

            wrapper.querySelector('input')?.addEventListener('change', (e: Event) => {
                this.visibleProperties[prop.name] = (e.target as HTMLInputElement).checked;
                this.draw();
            });

            listContainer.appendChild(wrapper);
        });

        // --- LÓGICA DEL BUSCADOR ---
        const searchInput = searchWrapper.querySelector("#metricSearch") as HTMLInputElement;
        searchInput.addEventListener("input", (e) => {
            const term = (e.target as HTMLInputElement).value.toLowerCase().trim();
            const items = listContainer.querySelectorAll(".metric-item");
            
            items.forEach(item => {
                const name = item.getAttribute("data-name") || "";
                (item as HTMLElement).style.setProperty("display", name.includes(term) ? "flex" : "none", "important");            });
        });

        // Eventos Bulk
        container.querySelector("#btnSelectAll")?.addEventListener("click", () => this.bulkToggleMetrics(true));
        container.querySelector("#btnSelectNone")?.addEventListener("click", () => this.bulkToggleMetrics(false));
    }

    /**
     * Función auxiliar para activar/desactivar todo de golpe
     * @param state 
     */
    private bulkToggleMetrics(state: boolean): void {
        const all = [...this.METADATA_KEYS.map(m => ({ name: m.id })), ...this.allData.metrics, ...this.allData.analysis];
        all.forEach(prop => {
            this.visibleProperties[prop.name] = state;
            const safeId = `toggle-${prop.name.replace(/\s+/g, '-')}`;
            const input = document.getElementById(safeId) as HTMLInputElement;
            if (input) input.checked = state;
        });
        this.draw();
    }

    private syncMetricsSelector(): void {
        // Buscamos todos los toggles dentro del contenedor del selector
        const toggles = document.querySelectorAll('.metric-toggle') as NodeListOf<HTMLInputElement>;
        
        toggles.forEach(input => {
            // Obtenemos el nombre de la métrica desde el atributo que guardamos al crearla
            const metricName = input.getAttribute('data-metric');
            if (metricName && this.visibleProperties[metricName] !== undefined) {
                // Sincronizamos el check con la realidad de la clase
                input.checked = this.visibleProperties[metricName];
            }
        });
    }

    public async export(format: 'svg' | 'png' | 'pdf', engine?: any): Promise<void> {
        const svgElement = this.chart.node() as SVGSVGElement;
        const fmName = window.FM_NAME || "model";

        // 1. Preparar el SVG (Ocultar iconos de colapso)
        this.chart.selectAll(".collapse-icon").attr("visibility", "hidden");
        const originalHeight = this.adjustSVGSize(svgElement);

        try {
            switch (format) {
                case 'svg':
                    const svgBlob = this.serializeToSVG(svgElement);
                    saveAs(svgBlob, `${fmName}.svg`);
                    break;
                case 'png':
                    const pngBlob = await this.rasterize(svgElement);
                    saveAs(pngBlob, `${fmName}.png`);
                    break;
                case 'pdf':
                    await this.generatePDF(svgElement, fmName);
                    break;
            }
        } catch (error) {
            console.error(`Error exporting to ${format}:`, error);
        } finally {
            // 2. Restaurar estado visual
            if (originalHeight) this.restoreSVGSize(svgElement, originalHeight);
            this.chart.selectAll(".collapse-icon").attr("visibility", "visible");
        }
    }

    public downloadSource(format: 'json' | 'txt', engine?: any): void {
        const fmName = window.FM_NAME || "model";
        let data: string = "";

        try {
            if (format === 'json') {
                if (window.JSON_CHARACTERIZATION) {
                    data = JSON.stringify(window.JSON_CHARACTERIZATION, null, 4);
                } else if (engine) {
                    data = engine.getFS().readFile(`${fmName}.json`, { encoding: "utf8" });
                }
                saveAs(new Blob([data], { type: "application/json" }), `${fmName}.json`);
            } else {
                if (window.TXT_CHARACTERIZATION) {
                    data = window.TXT_CHARACTERIZATION;
                } else if (engine) {
                    data = engine.getFS().readFile(`${fmName}.txt`, { encoding: "utf8" });
                }
                saveAs(new Blob([data], { type: "text/plain" }), `${fmName}.txt`);
            }
        } catch (e) {
            console.error(`Error downloading ${format}:`, e);
        }
    }

    private serializeToSVG(svg: SVGElement): Blob {
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
        clonedSvg.setAttributeNS(this.XMLNS, "xmlns", this.SVGNS);
        clonedSvg.setAttributeNS(this.XMLNS, "xmlns:xlink", this.XLINKNS);
        const serializer = new XMLSerializer();
        const string = serializer.serializeToString(clonedSvg);
        return new Blob([string], { type: "image/svg+xml" });
    }

    private async rasterize(svg: SVGElement): Promise<Blob> {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onerror = (e) => reject(e);
            image.onload = () => {
                const rect = svg.getBoundingClientRect();
                const context = this.context2d(rect.width, rect.height);
                if (context) {
                    context.drawImage(image, 0, 0, rect.width, rect.height);
                    context.canvas.toBlob((blob) => {
                        if (blob) resolve(blob);
                        else reject(new Error("Canvas toBlob failed"));
                    }, 'image/png');
                }
            };
            const serializedSVG = this.serializeToSVG(svg);
            image.src = URL.createObjectURL(serializedSVG);
        });
    }

    /**
     * Crea un contexto de canvas 2D ajustado al DPI del dispositivo.
     */
    private context2d(width: number, height: number, dpi?: number): CanvasRenderingContext2D | null {
        if (dpi == null) dpi = window.devicePixelRatio;
        const canvas = document.createElement("canvas");
        canvas.width = width * dpi;
        canvas.height = height * dpi;
        canvas.style.width = width + "px";
        const context = canvas.getContext("2d");
        if (context) context.scale(dpi, dpi);
        return context;
    }

    /**
     * Ajusta el tamaño del SVG al contenido real antes de exportar.
     */
    private adjustSVGSize(svgElement: SVGSVGElement): string | null {
        const originalHeight = svgElement.getAttribute("height");
        // Ocultamos iconos de colapso específicos si existen
        this.chart.selectAll("#collapseIcon").attr("visibility", "hidden");
        
        const bbox = svgElement.getBBox();
        svgElement.setAttribute("height", bbox.height.toString());
        return originalHeight;
    }

    /**
     * Restaura el tamaño original del SVG tras la exportación.
     */
    private restoreSVGSize(svgElement: SVGSVGElement, originalHeight: string): void {
        svgElement.setAttribute("height", originalHeight);
    }

    /**
     * Convierte un Blob a DataURL de forma asíncrona.
     */
    private readBlobAsDataURL(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error("Error reading the blob"));
            reader.readAsDataURL(blob);
        });
    }

    private async generatePDF(svgElement: SVGSVGElement, fmName: string): Promise<void> {
        const bbox = svgElement.getBBox();
        const svgWidth = bbox.width;
        const svgHeight = bbox.height;

        const doc = new window.PDFDocument({ 
            size: [svgWidth, svgHeight],
            margin: 0 
        });

        const chunks: Uint8Array[] = [];
        const stream = doc.pipe({
            write: (chunk: Uint8Array) => chunks.push(chunk),
            end: () => {
                const pdfBlob = new Blob(chunks as any[], { type: 'application/pdf' });
                saveAs(pdfBlob, `${fmName}.pdf`);
            },
            // Mantenemos los stubs necesarios para el stream
            on: () => {}, once: () => {}, emit: () => {},
        });

        window.SVGtoPDF(doc, svgElement, 0, 0, {
            width: svgWidth,
            height: svgHeight,
            preserveAspectRatio: 'xMidYMid meet'
        });
        doc.end();
    }

}

