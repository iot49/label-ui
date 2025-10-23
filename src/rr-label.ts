import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { type SvgCanvas } from './app/svg-canvas.ts';
import { type Manifest } from './types.ts';
import { getSymbolForTool } from './app/tool-symbols.ts';

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
  manifest: Manifest | null = null;

  @property({ attribute: false })
  canvas: SvgCanvas | null = null;

  @property({ attribute: false })
  activeTool: string | null = null;

  render() {
    return html`
      <div class="canvas-container">
        ${this.canvas ? this.canvas.svgElement : html`<p>No canvas available for labeling.</p>`}
      </div>
    `;
  }

  firstUpdated() {
    this._setupCanvasInteraction();
  }

  updated(changedProperties: Map<string | number | symbol, unknown>) {
    super.updated(changedProperties);
    if (changedProperties.has('canvas') && this.canvas) {
      this._setupCanvasInteraction();
    }
  }

  private _setupCanvasInteraction() {
    if (!this.canvas || !this.canvas.svgElement) return;

    // Ensure the SVG element is attached to the DOM before attaching event listeners
    const container = this.shadowRoot?.querySelector('.canvas-container');
    if (container && !container.contains(this.canvas.svgElement)) {
      container.innerHTML = ''; // Clear previous content
      container.appendChild(this.canvas.svgElement);
    }

    // Attach click listener to the SVG element
    this.canvas.svgElement.addEventListener('click', (e: MouseEvent) => {
      const target = e.target as Element;
      if (target && (target.tagName === 'circle' || target.classList.contains('symbol-instance'))) {
        return; // Don't trigger if clicking on a handle or symbol itself
      }

      const rect = this.canvas!.svgElement.getBoundingClientRect();
      // BUG: fix typescript error
      const viewBox = this.canvas!.getViewbox();

      const svgX = ((e.clientX - rect.left) / rect.width) * viewBox.width;
      const svgY = ((e.clientY - rect.top) / rect.height) * viewBox.height;

      console.log('[RrLabel] SVG click coordinates:', { svgX, svgY, activeTool: this.activeTool });

      if (this.activeTool) {
        const symbolConfig = getSymbolForTool(this.activeTool);
        if (symbolConfig) {
          this.canvas!.addUse(symbolConfig.id, svgX, svgY);
          this.requestUpdate(); // Force re-render of rr-label
        }
      }
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.canvas) {
      this.canvas.destroy();
    }
  }
}