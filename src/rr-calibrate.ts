import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { type Manifest } from './types.ts';
import { type SvgCanvas } from './app/svg-canvas.ts';


@customElement('rr-calibrate')
export class RrCalibrate extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
    sl-split-panel {
      width: 100%;
      height: calc(100vh - var(--rr-main-header-height, 3em) - 10px); /* Default to 0 if not set */
    }
    sl-split-panel::part(divider) {
      background-color: var(--sl-color-neutral-200);
    }
    .split-view > div {
      background: lightgray;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      position: relative;
    }
    .image-container {
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      overflow: hidden;
      position: relative;
      background-color: white;
    }
    .svg-container {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .image-container svg,
    .svg-container svg {
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

  @property({ type: String })
  imageUrl: string | null = null;

  firstUpdated() {
    this._setupCanvasInteraction();
  }

  updated(changedProperties: Map<string | number | symbol, unknown>) {
    super.updated(changedProperties);
    if ((changedProperties.has('canvas') || changedProperties.has('imageUrl')) && this.canvas && this.imageUrl) {
      this._setupCanvasInteraction();
    }
  }

  private async _setupCanvasInteraction() {
    if (!this.canvas || !this.imageUrl) return;

    await this.canvas.initialize(this.imageUrl); // Initialize canvas with image

    const container1 = this.shadowRoot?.querySelector('.image-container[data-view="1"]') as HTMLElement;
    const container2 = this.shadowRoot?.querySelector('.image-container[data-view="2"]') as HTMLElement;

    if (container1) {
      container1.innerHTML = ''; // Clear container before creating view
      const view1Svg = this.canvas.createView(container1);
      // Attach click handler to the first view's SVG
      view1Svg.node.addEventListener('click', (e: MouseEvent) => {
        // This component doesn't have an activeToolCallback, so we'll just log for now
        console.log('Click on calibrate view 1:', e.clientX, e.clientY);
      });
    }
    if (container2) {
      container2.innerHTML = ''; // Clear container before creating view
      // Re-apply the original transform for the second view
      // this.canvas.createView(container2, 'perspective(10000px) rotateX(-15deg) rotateY(10deg) scale(2)');
      this.canvas.createView(container2, 'perspective(1000px) rotateX(-15deg) rotateY(10deg) scale(0.8');
    }

    // Add lines (these are added to the main canvas, and then copied to views by createView)
    // Only add lines if they don't already exist to prevent duplicates
    const lineManager = (this.canvas as any).lineManager;
    const existingLineCount = lineManager?.lines?.size || 0;
    
    if (existingLineCount === 0) {
      const currentImageDimensions = this.canvas.getDimensions();
      const imageSizeMatches = this.manifest?.imageWidth === currentImageDimensions.width &&
                               this.manifest?.imageHeight === currentImageDimensions.height;

      if (this.manifest?.calibrationLines && this.manifest.calibrationLines.length > 0 && imageSizeMatches) {
        this.manifest.calibrationLines.forEach(line => {
          this.canvas!.addLine(line.p1.x, line.p1.y, line.p2.x, line.p2.y, line.color);
        });
      } else {
        const { width, height } = currentImageDimensions;

        // Horizontal lines (light green - --sl-color-lime-300)
        let offset = 300;
        this.canvas.addLine(offset, offset, width - offset, offset, 'var(--sl-color-lime-300)');
        this.canvas.addLine(offset, height - offset, width - offset, height - offset, 'var(--sl-color-lime-300)');

        // Vertical lines (light blue - --sl-color-sky-300)
        offset = 200;
        this.canvas.addLine(offset, offset, offset, height - offset, 'var(--sl-color-sky-300)');
        this.canvas.addLine(width - offset, offset, width - offset, height - offset, 'var(--sl-color-sky-300)');

        // Diagonal line (light red/pinkish - --sl-color-pink-300)
        offset = 400;
        this.canvas.addLine(offset, offset, width - offset, height - offset, 'var(--sl-color-pink-300)');
      }
    }
  }

  render() {
    return html`
      <sl-split-panel class="split-view" vertical style="--divider-width: 10px;">
        <div slot="start" class="image-container" data-view="1">
          <!-- SVG will be rendered here by _setupCanvasInteraction -->
        </div>
        <div slot="end" class="image-container" data-view="2">
          <!-- SVG will be rendered here by _setupCanvasInteraction -->
        </div>
      </sl-split-panel>
    `;
  }

}
