import { SVG, Svg, Element as SvgElement, Symbol as SvgSymbol, Use as SvgUse, Line as SvgLine } from '@svgdotjs/svg.js';
import { BackgroundManager } from './background-manager';
import { SymbolManager } from './symbol-manager';
import { LineManager } from './line-manager';
import { SymbolRenderer } from './symbol-renderer';
import { SYMBOL_FIXED_SIZE_MM, DRAG_HANDLE_VISUAL_RADIUS, DRAG_HANDLE_INTERACTION_RADIUS } from '../config';

export class SvgCanvas { // Renamed from CanvasBase to SvgCanvas to replace the old file
  private svg: Svg;
  private backgroundManager: BackgroundManager;
  private symbolManager: SymbolManager;
  private lineManager: LineManager;
  private mainSymbolRenderer: SymbolRenderer; // Renamed for clarity
  private activeToolCallback: ((symbolId: string, x: number, y: number) => void) | undefined; // Declare the missing property

  private viewSymbolRenderers: Set<SymbolRenderer> = new Set(); // Track view renderers

  constructor(imageUrl?: string) {
    this.svg = SVG().size('100%', '100%');
    this.svg.attr('preserveAspectRatio', 'xMidYMid meet');

    this.backgroundManager = new BackgroundManager(this.svg);
    this.symbolManager = new SymbolManager(this.svg);
    this.lineManager = new LineManager(this.svg);
    this.mainSymbolRenderer = new SymbolRenderer(this.svg, SYMBOL_FIXED_SIZE_MM); // Initialize main renderer

    if (imageUrl) {
      this.backgroundManager.loadBackgroundImage(imageUrl);
    }
  }

  get svgElement(): SVGElement {
    return this.svg.node;
  }

  async initialize(imageUrl?: string): Promise<void> {
    if (imageUrl) {
      await this.backgroundManager.loadBackgroundImage(imageUrl);
    }
    this.mainSymbolRenderer.updateSymbolSizes(); // Update main renderer
  }

  initializeSymbols(symbols: { id: string; createContent: (symbol: SvgSymbol) => void }[]): void {
    symbols.forEach(symbolConfig => {
      this.addSymbol(symbolConfig.id, symbolConfig.createContent);
    });
  }

  addSymbol(id: string, createSymbolContent: (symbol: SvgSymbol) => void): SvgSymbol {
    return this.symbolManager.addSymbol(id, createSymbolContent);
  }

  addUse(symbolId: string, x: number, y: number): SvgUse {
    const use = this.symbolManager.addUse(symbolId, x, y);
    this.mainSymbolRenderer.updateSymbolSizes(); // Update main renderer
    this.viewSymbolRenderers.forEach(renderer => renderer.updateSymbolSizes()); // Update all view renderers
    if (this.activeToolCallback) {
      this.activeToolCallback(symbolId, x, y); // Invoke the active tool callback
    }
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

  getDimensions(): { width: number; height: number } {
    return this.backgroundManager.getDimensions();
  }

  getViewbox(): { x: number; y: number; width: number; height: number } {
    const viewBox = this.svg.viewbox();
    return { x: viewBox.x, y: viewBox.y, width: viewBox.width, height: viewBox.height };
  }

  // Re-introducing createView for components that need separate SVG instances
  createView(container: HTMLElement, transform?: string): Svg {
    const viewSvg = SVG().addTo(container).size('100%', '100%');
    const { width, height } = this.backgroundManager.getDimensions();
    viewSvg.viewbox(0, 0, width, height);
    viewSvg.attr('preserveAspectRatio', 'xMidYMid meet');

    // Copy background image
    const imageUrl = this.backgroundManager['backgroundImage']?.attr('href');
    if (imageUrl) {
      viewSvg.image(imageUrl).move(0, 0);
    }

    // Copy symbols (defs)
    this.symbolManager['symbols'].forEach(symbol => {
      const viewDefs = viewSvg.defs();
      const symbolClone = viewDefs.symbol().id(symbol.id());
      symbol.children().forEach(child => {
        symbolClone.add(child.clone());
      });
    });

    // Copy uses
    this.symbolManager['uses'].forEach(use => {
      const symbolId = (use.attr('href') || use.attr('xlink:href') || '').replace('#', '');
      const x = parseFloat(use.attr('x') || '0');
      const y = parseFloat(use.attr('y') || '0');
      const useClone = viewSvg.use(symbolId).move(x, y);
      useClone.addClass('symbol-instance');
      useClone.attr({ 'data-original-x': x, 'data-original-y': y });

      // Recreate drag handles for cloned symbols in the new view context
      const dragHandle = (use as any)._dragHandle;
      const dragInteraction = (use as any)._dragInteraction;
      if (dragHandle && dragInteraction) {
        const clonedDragHandle = viewSvg.circle(DRAG_HANDLE_VISUAL_RADIUS * 2)
          .center(x, y)
          .fill('rgba(255, 255, 255, 0.9)')
          .stroke({ color: '#666', width: 1 })
          .css({ 'pointer-events': 'none', 'vector-effect': 'non-scaling-stroke' });

        const clonedDragInteraction = viewSvg.circle(DRAG_HANDLE_INTERACTION_RADIUS * 2)
          .center(x, y)
          .fill('transparent')
          .css({ cursor: 'grab', 'vector-effect': 'non-scaling-stroke' });

        // Attach drag handlers to the cloned handles in the new view context
        this.symbolManager['attachDragHandlers'](useClone, clonedDragHandle, clonedDragInteraction, 0, 0);
      }
    });

    // Copy lines with handles
    this.lineManager['lines'].forEach(line => {
      const x1 = parseFloat(line.attr('x1'));
      const y1 = parseFloat(line.attr('y1'));
      const x2 = parseFloat(line.attr('x2'));
      const y2 = parseFloat(line.attr('y2'));
      const color = line.attr('stroke');
      const { line: clonedLine, startHandle: clonedStartHandle, endHandle: clonedEndHandle, startInteraction: clonedStartInteraction, endInteraction: clonedEndInteraction } = this.lineManager.renderLineWithHandles(viewSvg, x1, y1, x2, y2, color);
      // Attach drag handlers to the cloned handles in the new view context
      this.lineManager['attachDragHandlers'](viewSvg, clonedLine, clonedStartHandle, clonedEndHandle, clonedStartInteraction, clonedEndInteraction); // Pass viewSvg
    });

    if (transform) {
      viewSvg.css('transform', transform);
    }

    // Create and track a SymbolRenderer for this new viewSvg
    const viewRenderer = new SymbolRenderer(viewSvg, SYMBOL_FIXED_SIZE_MM);
    viewRenderer.updateSymbolSizes();
    this.viewSymbolRenderers.add(viewRenderer);

    return viewSvg;
  }

  destroy(): void {
    this.mainSymbolRenderer.destroy();
    this.viewSymbolRenderers.forEach(renderer => renderer.destroy());
    this.viewSymbolRenderers.clear();
    this.svg.clear();
    this.svg.remove();
  }
}