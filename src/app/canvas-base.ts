import { SVG, Svg, Element as SvgElement, Symbol as SvgSymbol, Use as SvgUse, Line as SvgLine } from '@svgdotjs/svg.js';
import { BackgroundManager } from './background-manager';
import { SymbolManager } from './symbol-manager';
import { LineManager } from './line-manager';
import { SymbolRenderer } from './symbol-renderer';
import { SYMBOL_FIXED_SIZE_MM } from '../config';

export class CanvasBase {
  private svg: Svg;
  private container: HTMLElement;
  private backgroundManager: BackgroundManager;
  private symbolManager: SymbolManager;
  private lineManager: LineManager;
  private symbolRenderer: SymbolRenderer;
  private activeToolCallback?: (symbolId: string, x: number, y: number) => void;

  constructor(container: HTMLElement, imageUrl?: string) {
    this.container = container;
    this.container.innerHTML = ''; // Clear container

    this.svg = SVG().addTo(container).size('100%', '100%');

    this.backgroundManager = new BackgroundManager(this.svg);
    this.symbolManager = new SymbolManager(this.svg);
    this.lineManager = new LineManager(this.svg);
    this.symbolRenderer = new SymbolRenderer(this.svg, SYMBOL_FIXED_SIZE_MM);

    if (imageUrl) {
      this.backgroundManager.loadBackgroundImage(imageUrl);
    }

    this.attachCanvasClickHandler();
  }

  addSymbol(id: string, createSymbolContent: (symbol: SvgSymbol) => void): SvgSymbol {
    return this.symbolManager.addSymbol(id, createSymbolContent);
  }

  addUse(symbolId: string, x: number, y: number): SvgUse {
    const use = this.symbolManager.addUse(symbolId, x, y);
    this.symbolRenderer.updateSymbolSizes(); // Update immediately after adding
    return use;
  }

  addLine(x1: number, y1: number, x2: number, y2: number, color?: string): SvgLine {
    return this.lineManager.addLine(x1, y1, x2, y2, color);
  }

  remove(element: SvgElement): void {
    if (element instanceof SvgLine) {
      this.lineManager.removeLine(element);
    } else if (element instanceof SvgUse) {
      this.symbolManager.removeUse(element);
    } else {
      element.remove();
    }
  }

  setActiveToolCallback(callback: (symbolId: string, x: number, y: number) => void): void {
    this.activeToolCallback = callback;
  }

  private attachCanvasClickHandler(): void {
    this.svg.node.addEventListener('click', (e: MouseEvent) => {
      if (this.activeToolCallback) {
        const target = e.target as Element;
        if (target && (target.tagName === 'circle' || target.classList.contains('symbol-instance'))) {
          return; // Don't trigger if clicking on a handle or symbol itself
        }

        const rect = this.svg.node.getBoundingClientRect();
        const viewBox = this.svg.viewbox();

        const svgX = ((e.clientX - rect.left) / rect.width) * parseFloat(viewBox.width.toString());
        const svgY = ((e.clientY - rect.top) / rect.height) * parseFloat(viewBox.height.toString());

        this.activeToolCallback('', svgX, svgY);
      }
    });
  }

  destroy(): void {
    this.symbolRenderer.destroy();
    this.svg.clear();
    this.svg.remove();
    this.container.innerHTML = '';
  }
}