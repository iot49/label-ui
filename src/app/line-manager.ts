import { Svg, Line as SvgLine, Circle as SvgCircle } from '@svgdotjs/svg.js';
import { DRAG_HANDLE_VISUAL_RADIUS, DRAG_HANDLE_INTERACTION_RADIUS } from '../config';

export class LineManager {
  private svg: Svg;
  private lines: Set<SvgLine> = new Set();

  constructor(svg: Svg) {
    this.svg = svg;
  }

  addLine(x1: number, y1: number, x2: number, y2: number, color: string = '#000'): SvgLine {
    const { line, startHandle, endHandle, startInteraction, endInteraction } = this.renderLineWithHandles(this.svg, x1, y1, x2, y2, color);
    (line as any)._startHandle = startHandle;
    (line as any)._endHandle = endHandle;
    (line as any)._startInteraction = startInteraction;
    (line as any)._endInteraction = endInteraction;
    this.attachDragHandlers(this.svg, line, startHandle, endHandle, startInteraction, endInteraction);
    this.lines.add(line);
    return line;
  }

  renderLineWithHandles(targetSvg: Svg, x1: number, y1: number, x2: number, y2: number, color: string = '#000'): { line: SvgLine, startHandle: SvgCircle, endHandle: SvgCircle, startInteraction: SvgCircle, endInteraction: SvgCircle } {
    const line = targetSvg.line(x1, y1, x2, y2)
      .stroke({ color: color, width: 2 })
      .css('vector-effect', 'non-scaling-stroke');

    // Visual start handle
    const startHandle = targetSvg.circle(DRAG_HANDLE_VISUAL_RADIUS * 2)
      .center(x1, y1)
      .fill('#ff6b6b')
      .stroke({ color: '#fff', width: 2 })
      .css({ 'pointer-events': 'none', 'vector-effect': 'non-scaling-stroke' });

    // Invisible interaction area for start handle
    const startInteraction = targetSvg.circle(DRAG_HANDLE_INTERACTION_RADIUS * 2)
      .center(x1, y1)
      .fill('transparent')
      .css({ cursor: 'grab', 'vector-effect': 'non-scaling-stroke' });

    // Visual end handle
    const endHandle = targetSvg.circle(DRAG_HANDLE_VISUAL_RADIUS * 2)
      .center(x2, y2)
      .fill('#4ecdc4')
      .stroke({ color: '#fff', width: 2 })
      .css({ 'pointer-events': 'none', 'vector-effect': 'non-scaling-stroke' });

    // Invisible interaction area for end handle
    const endInteraction = targetSvg.circle(DRAG_HANDLE_INTERACTION_RADIUS * 2)
      .center(x2, y2)
      .fill('transparent')
      .css({ cursor: 'grab', 'vector-effect': 'non-scaling-stroke' });

    return { line, startHandle, endHandle, startInteraction, endInteraction };
  }

  removeLine(line: SvgLine): void {
    if (this.lines.delete(line)) {
      const startHandle = (line as any)._startHandle;
      const endHandle = (line as any)._endHandle;
      const startInteraction = (line as any)._startInteraction;
      const endInteraction = (line as any)._endInteraction;

      if (startHandle) startHandle.remove();
      if (endHandle) endHandle.remove();
      if (startInteraction) startInteraction.remove();
      if (endInteraction) endInteraction.remove();
      line.remove();
    }
  }

  // Made public for use by SvgCanvas.createView
  public attachDragHandlers(targetSvg: Svg, line: SvgLine, startHandle: SvgCircle, endHandle: SvgCircle, startInteraction: SvgCircle, endInteraction: SvgCircle): void {
    let isDragging = false;
    let dragEndpoint: 'start' | 'end' | null = null;

    const updateCursor = (state: 'grab' | 'grabbing', endpoint: 'start' | 'end') => {
      const interaction = endpoint === 'start' ? startInteraction : endInteraction;
      interaction.css({ cursor: state });
    };

    const handleMouseDown = (e: MouseEvent, endpoint: 'start' | 'end') => {
      isDragging = true;
      dragEndpoint = endpoint;
      updateCursor('grabbing', endpoint);
      e.preventDefault();
      e.stopPropagation();
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !dragEndpoint) return;

      const rect = targetSvg.node.getBoundingClientRect();
      const newX = ((e.clientX - rect.left) / rect.width) * parseFloat(targetSvg.viewbox().width.toString());
      const newY = ((e.clientY - rect.top) / rect.height) * parseFloat(targetSvg.viewbox().height.toString());

      if (dragEndpoint === 'start') {
        const x2 = parseFloat(line.attr('x2'));
        const y2 = parseFloat(line.attr('y2'));
        line.plot(newX, newY, x2, y2);
        startHandle.cx(newX).cy(newY);
        startInteraction.cx(newX).cy(newY);
      } else {
        const x1 = parseFloat(line.attr('x1'));
        const y1 = parseFloat(line.attr('y1'));
        line.plot(x1, y1, newX, newY);
        endHandle.cx(newX).cy(newY);
        endInteraction.cx(newX).cy(newY);
      }
      e.preventDefault();
    };

    const handleMouseUp = () => {
      if (isDragging) {
        isDragging = false;
        if (dragEndpoint) {
          updateCursor('grab', dragEndpoint);
        }
        dragEndpoint = null;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      }
    };

    startInteraction.on('mousedown', (e: Event) => handleMouseDown(e as MouseEvent, 'start'));
    endInteraction.on('mousedown', (e: Event) => handleMouseDown(e as MouseEvent, 'end'));
  }
}