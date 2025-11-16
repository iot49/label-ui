import { LitElement, html, css, svg } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { Manifest, manifestContext } from './app/manifest.ts';
import { computePerspectiveTransform, cssTansform, transformedBoundingBox } from './app/perspective_transform.ts';

// could not get render of transformed image to scale properly
const SHOW_SPLIT_PANEL = false;
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
      height: calc(100vh - var(--rr-main-header-height, 3em) - 10px);
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
    .split-view > div.scrollable {
      overflow: auto;
      align-items: flex-start;
      justify-content: flex-start;
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
    }
  `;

  @consume({ context: manifestContext, subscribe: true })
  @state()
  manifest!: Manifest;

  @property({ type: String })
  imageUrl: string | null = null;

  @query('#svg')
  svg!: SVGGElement;

  @query('#svg-transformed')
  svgTransformed!: SVGGElement;

  @query('#image')
  image!: SVGSVGElement;

  @query('#image-transformed')
  imageTransformed!: SVGSVGElement;

  private dragHandleId: string | null = null;

  render() {
    if (Object.keys(this.manifest?.markers.calibration || {}).length < 2) return html``;

    // Calculate the SVG viewBox to match image dimensions
    const imageWidth = this.manifest.camera.resolution.width;
    const imageHeight = this.manifest.camera.resolution.height;
    const viewBox = `0 0 ${imageWidth} ${imageHeight}`;

    if (!SHOW_SPLIT_PANEL) {
      return html`
        <svg
          id="svg"
          viewBox=${viewBox}
          @mousedown=${this.handleMouseDown}
          @mousemove=${this.handleMouseMove}
          @mouseup=${this.handleMouseUp}
          @mouseleave=${this.handleMouseLeave}
        >
          <defs>
            <symbol id="drag-handle">
              <!-- Visible dot -->
              <circle r="${10}" fill="coral" />
              <!-- Invisible larger interaction circle -->
              <circle r="${20}" fill="transparent" style="cursor: pointer;" />
            </symbol>
          </defs>

          <image id="image" href=${this.imageUrl} x="0" y="0" width=${imageWidth} height=${imageHeight}></image>
          ${this.rectTemplate()}
        </svg>
      `;
    }

    // Futile attempt to show transformed image

    const transformMatrix = computePerspectiveTransform(this.manifest);
    const cssMatrix3d = cssTansform(transformMatrix);

    // these both return same, regardless of transform
    if (this.image) console.log('image bbox', transformedBoundingBox(this.image));
    if (this.imageTransformed) console.log('image transformed bbox', transformedBoundingBox(this.imageTransformed));

    return html`
      <sl-split-panel class="split-view" vertical style="--divider-width: 10px;">
        <div slot="start" class="image-container">
          <svg
            id="svg"
            viewBox=${viewBox}
            @mousedown=${this.handleMouseDown}
            @mousemove=${this.handleMouseMove}
            @mouseup=${this.handleMouseUp}
            @mouseleave=${this.handleMouseLeave}
          >
            <defs>
              <symbol id="drag-handle">
                <!-- Visible dot -->
                <circle r="${10}" fill="coral" />
                <!-- Invisible larger interaction circle -->
                <circle r="${20}" fill="transparent" style="cursor: pointer;" />
              </symbol>
            </defs>

            <image id="image" href=${this.imageUrl} x="0" y="0" width=${imageWidth} height=${imageHeight}></image>
            ${this.rectTemplate()}
          </svg>
        </div>
        <div slot="end" class="image-container scrollable">
          <svg id="svg-transformed" viewBox=${viewBox} style="transform: ${cssMatrix3d};">
            <image id="image-transformed" href=${this.imageUrl} x="0" y="0" width=${imageWidth} height=${imageHeight}></image>
            ${this.rectTemplate(false)}
          </svg>
        </div>
      </sl-split-panel>
    `;
  }

  private rectTemplate(handles = true) {
    const markers = this.manifest.markers["calibration"];
    const rect0 = markers['rect-0'];
    const rect1 = markers['rect-1'];
    const rect2 = markers['rect-2'];
    const rect3 = markers['rect-3'];

    const points = `${rect0.x},${rect0.y} ${rect1.x},${rect1.y} ${rect3.x},${rect3.y} ${rect2.x},${rect2.y}`;

    return svg`
      <polygon
        points=${points}
        fill="none"
        stroke="coral"
        stroke-width="3"
        vector-effect="non-scaling-stroke"
      />
      ${
        handles
          ? svg`
            <use id="rect-0" href="#drag-handle" x=${rect0.x} y=${rect0.y} />
            <use id="rect-1" href="#drag-handle" x=${rect1.x} y=${rect1.y} />
            <use id="rect-2" href="#drag-handle" x=${rect2.x} y=${rect2.y} />
            <use id="rect-3" href="#drag-handle" x=${rect3.x} y=${rect3.y} />
          `
          : svg``
      }
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

  private handleMouseDown = (event: MouseEvent) => {
    const target = event.target as Element;
    if (!target || !target.id) {
      this.dragHandleId = null; // should already be null
      return;
    }
    this.dragHandleId = target.id;
  };

  private handleMouseMove = (event: MouseEvent) => {
    if (!this.dragHandleId) return;
    const screenCoords = this.toSVGPoint(event.clientX, event.clientY);
    this.manifest.setMarker("calibration", this.dragHandleId, screenCoords.x, screenCoords.y);
  };

  private handleMouseUp = () => {
    this.dragHandleId = null;
  };

  private handleMouseLeave = () => {
    this.dragHandleId = null;
  };
}

/*
    // Calculate transformed bounds for proper scrolling
    const corners = [
      [0, 0], [imageWidth, 0], [imageWidth, imageHeight], [0, imageHeight]
    ];
    
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    corners.forEach(([x, y]) => {
      // Apply perspective transform to corner points
      const w = data[6] * x + data[7] * y + 1;
      const transformedX = (data[0] * x + data[1] * y + data[2]) / w;
      const transformedY = (data[3] * x + data[4] * y + data[5]) / w;
      
      minX = Math.min(minX, transformedX);
      maxX = Math.max(maxX, transformedX);
      minY = Math.min(minY, transformedY);
      maxY = Math.max(maxY, transformedY);
    });
    
    const transformedWidth = maxX - minX;
    const transformedHeight = maxY - minY;
    const padding = Math.max(imageWidth, imageHeight) * 0.2; // 20% padding
    const wrapperWidth = transformedWidth + padding * 2;
    const wrapperHeight = transformedHeight + padding * 2;

    // Debug logging to diagnose transform issues
    console.log('Transform matrix data:', data);
    console.log('Transformed bounds:', { minX, maxX, minY, maxY, transformedWidth, transformedHeight });
    console.log('Wrapper size:', { wrapperWidth, wrapperHeight });
*/
