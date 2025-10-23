import { Svg, Symbol as SvgSymbol, Use as SvgUse, Defs as SvgDefs, Circle as SvgCircle } from '@svgdotjs/svg.js';
import { DRAG_HANDLE_VISUAL_RADIUS, DRAG_HANDLE_INTERACTION_RADIUS } from '../config';

export class SymbolManager {
  private svg: Svg;
  private defs: SvgDefs;
  private symbols: Map<string, SvgSymbol> = new Map();
  private uses: Set<SvgUse> = new Set();

  constructor(svg: Svg) {
    this.svg = svg;
    this.defs = svg.defs();
  }

  addSymbol(id: string, createSymbolContent: (symbol: SvgSymbol) => void): SvgSymbol {
    if (this.symbols.has(id)) {
      console.log(`Symbol ${id} already exists, returning existing`);
      return this.symbols.get(id)!;
    }

    const symbol = this.defs.symbol().id(id);
    createSymbolContent(symbol);
    this.symbols.set(id, symbol);
    return symbol;
  }

  addUse(symbolId: string, x: number, y: number): SvgUse {
    if (!this.symbols.has(symbolId)) {
      throw new Error(`Symbol with id '${symbolId}' not found. Call addSymbol first.`);
    }

    const use = this.svg.use(this.symbols.get(symbolId)!)
      .move(x, y)
      .addClass('symbol-instance') // Tag for SymbolRenderer
      .attr({ 'data-original-x': x, 'data-original-y': y }); // Store original center


    // Visual drag handle
    const dragHandle = this.svg.circle(DRAG_HANDLE_VISUAL_RADIUS * 2)
      .center(x, y)
      .fill('rgba(255, 255, 255, 0.9)')
      .stroke({ color: '#666', width: 1 })
      .css({ 'pointer-events': 'none', 'vector-effect': 'non-scaling-stroke' });

    // Invisible interaction area for drag handle
    const dragInteraction = this.svg.circle(DRAG_HANDLE_INTERACTION_RADIUS * 2)
      .center(x, y)
      .fill('transparent')
      .css({ cursor: 'grab', 'vector-effect': 'non-scaling-stroke' });

    (use as any)._dragHandle = dragHandle; // Attach visual handle to use element
    (use as any)._dragInteraction = dragInteraction; // Attach interaction handle to use element

    this.uses.add(use);
    this.attachDragHandlers(use, dragHandle, dragInteraction, 0, 0);
    return use;
  }

  removeUse(use: SvgUse): void {
    if (this.uses.delete(use)) {
      const dragHandle = (use as any)._dragHandle;
      const dragInteraction = (use as any)._dragInteraction;
      if (dragHandle) {
        dragHandle.remove();
      }
      if (dragInteraction) {
        dragInteraction.remove();
      }
      use.remove();
    }
  }

  private attachDragHandlers(use: SvgUse, dragHandle: SvgCircle, dragInteraction: SvgCircle, offsetX: number, offsetY: number): void {
    let isDragging = false;
    let startX: number, startY: number;
    let startElX: number, startElY: number;
    let svgPoint: SVGPoint;
    let ctm: DOMMatrix | null;

    const updateCursor = (state: 'grab' | 'grabbing') => {
      dragInteraction.css({ cursor: state });
    };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      updateCursor('grabbing');

      // Get the SVG's screen transformation matrix
      ctm = this.svg.node.getScreenCTM();
      if (!ctm) {
        console.error("Could not get SVG's screenCTM.");
        isDragging = false;
        return;
      }

      // Create an SVGPoint for coordinate transformations
      svgPoint = this.svg.node.createSVGPoint();
      svgPoint.x = e.clientX;
      svgPoint.y = e.clientY;

      // Transform screen coordinates to SVG coordinates
      const transformedStartPoint = svgPoint.matrixTransform(ctm.inverse());
      startX = transformedStartPoint.x;
      startY = transformedStartPoint.y;

      startElX = parseFloat(use.attr('data-original-x'));
      startElY = parseFloat(use.attr('data-original-y'));
      e.preventDefault();
      e.stopPropagation();
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging || !ctm || !svgPoint) return;

      // Update SVGPoint with current mouse coordinates
      svgPoint.x = e.clientX;
      svgPoint.y = e.clientY;

      // Transform current screen coordinates to SVG coordinates
      const transformedCurrentPoint = svgPoint.matrixTransform(ctm.inverse());

      const dx = transformedCurrentPoint.x - startX;
      const dy = transformedCurrentPoint.y - startY;

      const newX = startElX + dx;
      const newY = startElY + dy;

      use.center(newX, newY); // Use center for positioning the symbol
      use.attr({ 'data-original-x': newX, 'data-original-y': newY });
      dragHandle.center(newX, newY); // Center drag handles directly on the symbol's center
      dragInteraction.center(newX, newY); // Center drag handles directly on the symbol's center
    };

    const onMouseUp = () => {
      isDragging = false;
      updateCursor('grab');
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      ctm = null; // Clear CTM
    };

    dragInteraction.on('mousedown', (e: Event) => onMouseDown(e as MouseEvent));
    dragInteraction.on('click', (e: Event) => { // Prevent click events on drag handles
      e.preventDefault();
      e.stopPropagation();
    });
  }
}