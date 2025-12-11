import { LitElement, html, css, svg } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { Manifest, manifestContext, type MarkerCategory } from './app/manifest.ts';
import { MARKER_SIZE_PX } from './config.ts';

@customElement('rr-label')
export class RrLabel extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }

    svg {
      max-width: 100%;
      max-height: 100%;
      width: auto;
      height: auto;
      display: block;
      object-fit: contain;
    }

    symbol {
      overflow: visible;
      stroke-width: 0.3;
      cursor: pointer;
    }
  `;

  @consume({ context: manifestContext, subscribe: true })
  @state()
  manifest!: Manifest;

  @property({ type: String })
  imageUrl: string | null = null;

  @property({ type: Number })
  imageIndex: number = -1;

  private dragHandle: { id: string, category: MarkerCategory } | null = null;

  @property({ attribute: false })
  activeTool: string | null = null;

  @state()
  symbolSize: number = 48; // default, updated by resize observer

  private resizeObserver: ResizeObserver | null = null;

  @query('#svg')
  svg!: SVGGElement;

  firstUpdated() {
    this.resizeObserver = new ResizeObserver(() => {
      this.updateSymbolSize();
    });
    this.resizeObserver.observe(this);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  private updateSymbolSize() {
    if (!this.manifest || !this.manifest.camera) return;

    const width = this.offsetWidth;
    if (width === 0) return; // not visible yet

    const imageWidth = this.manifest.camera.resolution.width;
    // The SVG viewBox width matches imageWidth.
    // So the number of SVG units per screen pixel is imageWidth / screenWidth.
    const scale = imageWidth / width;

    this.symbolSize = MARKER_SIZE_PX * scale;
  }

  // When image loads or manifest changes, we might need to recalculate if resolution changed
  updated(changedProperties: Map<string, any>) {
    if (changedProperties.has('manifest') || changedProperties.has('imageUrl')) {
      this.updateSymbolSize();
    }
  }

  render() {
    // Calculate the SVG viewBox to match image dimensions
    const imageWidth = this.manifest.camera.resolution.width;
    const imageHeight = this.manifest.camera.resolution.height;
    const viewBox = `0 0 ${imageWidth} ${imageHeight}`;

    return html`
      <svg id="svg" viewBox=${viewBox} @mousedown=${this.handleMouseDown} @mousemove=${this.handleMouseMove} @click=${this.handleClick}>
        ${this.getSvgDefs(this.symbolSize)}
        <image id="image" href=${this.imageUrl} x="0" y="0" width=${imageWidth} height=${imageHeight}></image>
        ${this.markerTemplate("label")}
        ${this.imageIndex === 0 ? this.rectTemplate() : svg``}
      </svg>
    `;
  }


  private markerTemplate(category: MarkerCategory) {
    if (!this.manifest.images[this.imageIndex]) return svg``;
    const markers = this.manifest.images[this.imageIndex].labels || {};
    return svg`
      ${Object.entries(markers).map(([markerId, marker]) => {
      // marker.type is 'track', 'train', etc.
      return svg`<use id=${markerId} class=${category} href="#${marker.type}" x=${marker.x} y=${marker.y}></use>`;
    })}
    `;
  }

  private rectTemplate(handles = true) {
    if (Object.keys(this.manifest.calibration || {}).length < 4) return svg``;

    const bounds = this.manifest.calibration;
    const rect0 = bounds['rect-0'];
    const rect1 = bounds['rect-1'];
    const rect2 = bounds['rect-2'];
    const rect3 = bounds['rect-3'];

    const points = `${rect0.x},${rect0.y} ${rect1.x},${rect1.y} ${rect3.x},${rect3.y} ${rect2.x},${rect2.y}`;

    return svg`
      <polygon
        points=${points}
        fill="none"
        stroke="coral"
        stroke-width="3"
        vector-effect="non-scaling-stroke"
        style="pointer-events: none;" 
      />
      ${handles
        ? svg`
            <use id="rect-0" class="calibration" href="#drag-handle" x=${rect0.x} y=${rect0.y} />
            <use id="rect-1" class="calibration" href="#drag-handle" x=${rect1.x} y=${rect1.y} />
            <use id="rect-2" class="calibration" href="#drag-handle" x=${rect2.x} y=${rect2.y} />
            <use id="rect-3" class="calibration" href="#drag-handle" x=${rect3.x} y=${rect3.y} />
          `
        : svg``
      }
    `;
  }
  private getSvgDefs(symbolSize: number) {
    return svg`
      <defs>
       <symbol id="other" width=${symbolSize} height=${symbolSize} viewBox="8 8 24 24" stroke="yellow">
          <rect width="16" height="16" rx="3" ry="3" fill="white" fill-opacity="0.6" stroke="none" style="cursor: pointer;" />
          <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
          <path d="M5.255 5.786a.237.237 0 0 0 .241.247h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286m1.557 5.763c0 .533.425.927 1.01.927.609 0 1.028-.394 1.028-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94"/>
        </symbol>
        <symbol id="track" width=${symbolSize} height=${symbolSize} viewBox="8 8 24 24" stroke="yellow">
          <rect width="16" height="16" rx="3" ry="3" fill="white" fill-opacity="0.6" stroke="none" style="cursor: pointer;" />
          <path
            d="M11.303 6.584h1.064c.592 0 .936.334.936.844a.79.79 0 0 1-.485.748l.536 1.074h-.59l-.467-.994h-.473v.994h-.521zm.521.414v.861h.46c.292 0 .474-.14.474-.421 0-.286-.188-.44-.467-.44zm-8.771-.414h1.064c.592 0 .936.334.936.844 0 .39-.242.654-.485.748l.536 1.074h-.59l-.467-.994h-.473v.994h-.521zm.521.414v.861h.46c.292 0 .474-.14.474-.421 0-.286-.188-.44-.467-.44z"
          />
          <path
            d="M6.95.435c.58-.58 1.52-.58 2.1 0l6.515 6.516c.58.58.58 1.519 0 2.098L9.05 15.565c-.58.58-1.519.58-2.098 0L.435 9.05a1.48 1.48 0 0 1 0-2.098zm1.4.7a.495.495 0 0 0-.7 0L4.923 3.861 8 6.939l3.078-3.077L8.35 1.134Zm3.788 3.788L9.061 8l3.077 3.078 2.728-2.728a.495.495 0 0 0 0-.7zm-1.06 7.215L8 9.061l-3.077 3.077 2.727 2.728a.495.495 0 0 0 .7 0zm-7.216-1.06L6.939 8 3.862 4.923 1.134 7.65a.495.495 0 0 0 0 .7z"
          />
        </symbol>
        <symbol id="train" width=${symbolSize} height=${symbolSize} viewBox="8 8 24 24" stroke="red">
          <rect width="16" height="16" rx="3" ry="3" fill="white" fill-opacity="0.6" stroke="none" style="cursor: pointer;" />
          <path
            d="M5 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0m8 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0m-6-1a1 1 0 1 0 0 2h2a1 1 0 1 0 0-2zM4 2a1 1 0 0 0-1 1v3.9c0 .625.562 1.092 1.17.994C5.075 7.747 6.792 7.5 8 7.5s2.925.247 3.83.394A1.008 1.008 0 0 0 13 6.9V3a1 1 0 0 0-1-1zm0 1h8v3.9q0 .002 0 0l-.002.004-.005.002h-.004C11.088 6.761 9.299 6.5 8 6.5s-3.088.26-3.99.406h-.003l-.005-.002L4 6.9q0 .002 0 0z"
          />
          <path
            d="M1 2.5A2.5 2.5 0 0 1 3.5 0h9A2.5 2.5 0 0 1 15 2.5v9c0 .818-.393 1.544-1 2v2a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5V14H5v1.5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-2a2.5 2.5 0 0 1-1-2zM3.5 1A1.5 1.5 0 0 0 2 2.5v9A1.5 1.5 0 0 0 3.5 13h9a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 12.5 1z"
          />
        </symbol>
        <symbol id="train-end" width=${symbolSize} height=${symbolSize} viewBox="8 8 24 24" stroke="cyan">
          <rect width="16" height="16" rx="3" ry="3" fill="white" fill-opacity="0.6" stroke="none" style="cursor: pointer;" />
          <path
            fill-rule="evenodd"
            d="M6 8a.5.5 0 0 0 .5.5h5.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L12.293 7.5H6.5A.5.5 0 0 0 6 8m-2.5 7a.5.5 0 0 1-.5-.5v-13a.5.5 0 0 1 1 0v13a.5.5 0 0 1-.5.5"
          />
        </symbol>
        <symbol id="coupling" width=${symbolSize} height=${symbolSize} viewBox="8 8 24 24" stroke="lightgreen">
          <rect width="16" height="16" rx="3" ry="3" fill="white" fill-opacity="0.6" stroke="none" style="cursor: pointer;" />
          <path
            d="M8 15a.5.5 0 0 1-.5-.5v-13a.5.5 0 0 1 1 0v13a.5.5 0 0 1-.5.5M0 8a.5.5 0 0 1 .5-.5h3.793L3.146 6.354a.5.5 0 1 1 .708-.708l2 2a.5.5 0 0 1 0 .708l-2 2a.5.5 0 0 1-.708-.708L4.293 8.5H.5A.5.5 0 0 1 0 8m11.707.5 1.147 1.146a.5.5 0 0 1-.708.708l-2-2a.5.5 0 0 1 0-.708l2-2a.5.5 0 0 1 .708.708L11.707 7.5H15.5a.5.5 0 0 1 0 1z"
          />
        </symbol>
        <symbol id="drag-handle">
          <!-- Visible dot -->
          <circle r="${10}" fill="coral" />
          <!-- Invisible larger interaction circle -->
          <circle r="${20}" fill="transparent" style="cursor: pointer;" />
        </symbol>
      </defs>
    `;
  }


  private toSVGPoint(x: number, y: number) {
    const p = new DOMPoint(x, y);
    const ctm = this.svg.getScreenCTM();
    if (!ctm) {
      throw new Error('Unable to get screen CTM from SVG element');
    }
    return p.matrixTransform(ctm.inverse());
  }

  private handleClick = (event: MouseEvent) => {
    // do not create label after dragging
    if (this.dragHandle === null) {
      // create a new marker
      const tool = this.activeTool;
      // Cannot create with delete tool or calibrate tool. 
      // Calibrate tool is effectively "move only" for calibration handles.
      if (!tool || tool === 'delete') return;

      const category: MarkerCategory = 'label';
      const id = crypto.randomUUID();

      const screenCoords = this.toSVGPoint(event.clientX, event.clientY);
      this.manifest.setMarker(category, id, screenCoords.x, screenCoords.y, tool, this.imageIndex);
    } else {
      // finished dragging
      this.dragHandle = null;
    }
  };

  private handleMouseDown = (event: MouseEvent) => {
    const target = event.target as Element;
    if (!target || !target.id) return;

    const classList = target.classList;

    if (this.activeTool === 'delete') {
      if (classList.contains('label')) {
        this.manifest.deleteMarker('label', target.id, this.imageIndex);
      }
    } else {
      if (classList.contains('label')) {
        this.dragHandle = { id: target.id, category: 'label' };
      } else if (classList.contains('calibration')) {
        this.dragHandle = { id: target.id, category: 'calibration' };
      }
    }
  };

  private handleMouseMove = (event: MouseEvent) => {
    if (!this.dragHandle) return;
    const screenCoords = this.toSVGPoint(event.clientX, event.clientY);

    if (this.dragHandle.category === 'calibration') {
      this.manifest.setMarker('calibration', this.dragHandle.id, screenCoords.x, screenCoords.y);
    } else {
      // Preserving the type is tricky here since we don't have it locally easily 
      // unless we look it up, but setMarker merges so type should be preserved if passed undefined
      // However, setMarker signature currently expects type. Let's look it up.
      let type = 'track';
      if (this.manifest.images[this.imageIndex] && this.manifest.images[this.imageIndex].labels[this.dragHandle.id]) {
        type = this.manifest.images[this.imageIndex].labels[this.dragHandle.id].type;
      }

      this.manifest.setMarker(this.dragHandle.category, this.dragHandle.id, screenCoords.x, screenCoords.y, type, this.imageIndex);
    }
  };
}

