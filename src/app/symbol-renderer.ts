import { Svg } from '@svgdotjs/svg.js';

export class SymbolRenderer {
  private svg: Svg;
  private symbolSizeMM: number;
  private resizeObserver: ResizeObserver;

  constructor(svg: Svg, symbolSizeMM: number) {
    this.svg = svg;
    this.symbolSizeMM = symbolSizeMM;
    this.resizeObserver = new ResizeObserver(() => this.updateSymbolSizes());
    this.resizeObserver.observe(this.svg.node); // Observe the SVG element itself
    window.addEventListener('load', this.updateSymbolSizes.bind(this));
    window.addEventListener('resize', this.updateSymbolSizes.bind(this));
  }

  private getPPI(): number {
    const div = document.createElement("div");
    div.style.width = "1in";
    document.body.appendChild(div);
    const ppi = div.offsetWidth;
    document.body.removeChild(div);
    return ppi;
  }

  updateSymbolSizes(): void {
    const ppi = this.getPPI();
    if (ppi === 0) return; // Abort if element not visible

    const sizePX = (this.symbolSizeMM / 25.4) * ppi;
    const elements = this.svg.find('.symbol-instance');

    elements.forEach(el => {
      const originalCenterX = parseFloat(el.attr('data-original-x'));
      const originalCenterY = parseFloat(el.attr('data-original-y'));

      const svgElement = this.svg.node;
      const viewBox = svgElement.getAttribute('viewBox')?.split(' ').map(Number);

      if (!viewBox || viewBox.length !== 4) {
        console.warn('SVG viewBox not found or invalid for element:', el);
        return;
      }

      const viewBoxWidth = viewBox[2];
      const viewBoxHeight = viewBox[3];

      const svgRect = svgElement.getBoundingClientRect();
      const currentSvgWidth = svgRect.width;
      const currentSvgHeight = svgRect.height;

      if (currentSvgWidth === 0 || currentSvgHeight === 0) {
        // SVG is not rendered or has no dimensions, skip update
        return;
      }

      const scaleX = currentSvgWidth / viewBoxWidth;
      const scaleY = currentSvgHeight / viewBoxHeight;

      const symbolWidthInSvgUnits = sizePX / scaleX;
      const symbolHeightInSvgUnits = sizePX / scaleY;

      el.attr({
        width: symbolWidthInSvgUnits,
        height: symbolHeightInSvgUnits,
        x: originalCenterX - symbolWidthInSvgUnits / 2,
        y: originalCenterY - symbolHeightInSvgUnits / 2
      });
    });
  }

  destroy(): void {
    this.resizeObserver.disconnect();
    window.removeEventListener('load', this.updateSymbolSizes.bind(this));
    window.removeEventListener('resize', this.updateSymbolSizes.bind(this));
  }
}