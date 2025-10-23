import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { type SvgCanvas } from './app/svg-canvas.ts';
import { type Manifest } from './types.ts';
import { getSymbolForTool } from './app/tool-symbols.ts';
import { Use as SvgUse } from '@svgdotjs/svg.js'; // Import SvgUse for type hinting


@customElement('rr-label')
export class RrLabel extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
    .canvas-container {
      width: 100%;
      height: calc(100vh - var(--rr-main-header-height, 3em) - 3px);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      position: relative;
      background-color: white;
    }
    .canvas-container svg {
      max-width: 100%;
      max-height: 100%;
      width: auto;
      height: auto;
      display: block;
      object-fit: contain;
    }
  `;


  @property({ attribute: false })
  manifest!: Manifest;

  @property({ attribute: false })
  canvas: SvgCanvas | null = null;

  @property({ attribute: false })
  activeTool: string | null = null;

  private _eventListeners: { type: string, listener: (e: any) => void }[] = [];

  render() {
    return html`
      <div class="canvas-container">
        ${this.canvas ? this.canvas.svgElement : html`<p>No canvas available for labeling.</p>`}
      </div>
    `;
  }

  updated(changedProperties: Map<string | number | symbol, unknown>) {
    super.updated(changedProperties);
    if (changedProperties.has('canvas') && this.canvas) {
      this._setupCanvasInteraction();
    }
  }

  // BUG: after dragging a symbol, the drag handle "moves" from the center (correct) to the upper-left corner (wrong).
  // I noticed a few places where an offset is applied, I've removed those but may have missed some. Or there could be another cause.
  private _setupCanvasInteraction() {
    if (!this.canvas || !this.canvas.svgElement) return;

    this._removeEventListeners(); // Clean up previous listeners

    const container = this.shadowRoot?.querySelector('.canvas-container');
    if (container && !container.contains(this.canvas.svgElement)) {
      container.innerHTML = '';
      container.appendChild(this.canvas.svgElement);
    }

    let isDragging = false;
    let dragStartTime = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = false;
      dragStartTime = Date.now();
    };

    const onMouseMove = () => {
      if (Date.now() - dragStartTime > 100) { // 100ms threshold
        isDragging = true;
      }
    };

    const onMouseUp = () => {
      setTimeout(() => { isDragging = false; }, 10);
    };

    const onClick = (e: MouseEvent) => {
      if (isDragging) {
        console.log('[RrLabel] Click ignored - was dragging');
        return;
      }

      const target = e.target as Element;
      if (target && (target.tagName === 'circle' || target.classList.contains('symbol-instance'))) {
        return;
      }

      const rect = this.canvas!.svgElement.getBoundingClientRect();
      const viewBox = this.canvas!.getViewbox();
      const svgX = ((e.clientX - rect.left) / rect.width) * viewBox.width;
      const svgY = ((e.clientY - rect.top) / rect.height) * viewBox.height;

      console.log('[RrLabel] SVG click coordinates:', { svgX, svgY, activeTool: this.activeTool });

      if (this.activeTool) {
        const symbolConfig = getSymbolForTool(this.activeTool);
        if (symbolConfig) {
          this.canvas!.addUse(symbolConfig.id, svgX, svgY);
          this.requestUpdate();
        }
      }
    };

    this._eventListeners = [
      { type: 'mousedown', listener: onMouseDown },
      { type: 'mousemove', listener: onMouseMove },
      { type: 'mouseup', listener: onMouseUp },
      { type: 'click', listener: onClick },
    ];

    this._eventListeners.forEach(({ type, listener }) => {
      this.canvas!.svgElement.addEventListener(type, listener);
    });
  }

  private _removeEventListeners() {
    if (this.canvas && this.canvas.svgElement) {
      this._eventListeners.forEach(({ type, listener }) => {
        this.canvas!.svgElement.removeEventListener(type, listener);
      });
    }
    this._eventListeners = [];
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._removeEventListeners();
    // The canvas is now managed by rr-main, so we don't destroy it here.
    // if (this.canvas) {
    //   this.canvas.destroy();
    // }
  }
}