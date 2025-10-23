import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { saveAs } from 'file-saver';
import { SCALE } from './config.ts';
import { type Manifest, type CanvasConfig, type SerializableSymbol, type SerializableLine } from './types.ts';
import { SvgCanvas } from './app/svg-canvas.ts';
import JSZip from 'jszip';
import { TOOL_SYMBOLS } from './app/tool-symbols.ts';


@customElement('rr-main')
export class RrMain extends LitElement {
  @state()
  manifest: Manifest = { scale: SCALE, referenceLength: 1000 };

  @state()
  labelCanvas: SvgCanvas | null = null;

  @state()
  calibrateCanvas: SvgCanvas | null = null;

  @state()
  image: string | undefined = undefined;

  @state()
  activeTool: string | null = null;

  // Collections for symbols and lines
  private _currentSymbols: SerializableSymbol[] = [];
  private _currentLines: SerializableLine[] = [];

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100vh;
      font-family: sans-serif;

    }

    header {
      height: var(--rr-main-header-height);
      background-color: var(--sl-color-primary-600);
      color: var(--sl-color-neutral-0);
      display: flex;
      align-items: center;
      padding: 0 1em;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      font-weight: bold;
      font-size: 2em;
    }

    .container {
      display: flex;
      flex-grow: 1;
    }

    nav {
      width: 60px; /* Adjust as needed for toolbar width */
      background-color: var(--sl-color-success-800);
      padding: 1em;
      box-shadow: 2px 0 4px rgba(0, 0, 0, 0.1);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start; /* Align toolbar items to the top */
      gap: 1em; /* Space between groups */
    }

    .toolbar-group {
      display: flex;
      flex-direction: column;
      gap: 0.5em; /* Space between buttons in a group */
      padding: 0.5em;
      border-radius: var(--sl-border-radius-medium);
      background-color: var(--sl-color-success-700); /* Slightly darker background for grouping */
    }

    .active-tool {
      border: 2px solid var(--sl-color-warning-500); /* Highlight active tool */
      border-radius: var(--sl-border-radius-medium);
    }

    main {
      flex-grow: 1;
      padding: 0;
    }
  `;

  render() {
    return html`
      <header>
        <slot name="title">Main</slot>
      </header>
      <div class="container">
        <nav>
          <div class="toolbar-group">
            <sl-tooltip content="Upload Image">
              <sl-icon-button
                name="upload"
                label="Upload"
                style="font-size: 2em; color: white;"
                @click=${this._handleUploadClick}
                ?disabled=${false}
              ></sl-icon-button>
            </sl-tooltip>
            <sl-tooltip content="Calibrate Image">
              <sl-icon-button
                name="fullscreen"
                label="Calibrate"
                style="font-size: 2em; color: white;"
                @click=${this._activateCalibrateTool}
                ?disabled=${this.image === undefined}
                class=${this.activeTool === 'calibrate' ? 'active-tool' : ''}
              ></sl-icon-button>
            </sl-tooltip>
            <sl-tooltip content="Save Image">
              <sl-icon-button
                name="save"
                label="Save"
                style="font-size: 2em; color: white;"
                @click=${this._handleSaveClick}
                ?disabled=${this.image === undefined}
              ></sl-icon-button>
            </sl-tooltip>
          </div>

          <div class="toolbar-group">
            <sl-tooltip content="Predict">
              <sl-icon-button
                name="question-circle"
                label="Predict"
                style="font-size: 2em; color: white;"
                @click=${() => this._activateLabelingTool('predict')}
                ?disabled=${this.image === undefined}
                class=${this.activeTool === 'predict' ? 'active-tool' : ''}
              ></sl-icon-button>
            </sl-tooltip>
            <sl-tooltip content="Track">
              <sl-icon-button
                name="sign-railroad"
                label="Track"
                style="font-size: 2em; color: white;"
                @click=${() => this._activateLabelingTool('track')}
                ?disabled=${this.image === undefined}
                class=${this.activeTool === 'track' ? 'active-tool' : ''}
              ></sl-icon-button>
            </sl-tooltip>
            <sl-tooltip content="Train">
              <sl-icon-button
                name="truck-front"
                label="Car"
                style="font-size: 2em; color: white;"
                @click=${() => this._activateLabelingTool('train')}
                ?disabled=${this.image === undefined}
                class=${this.activeTool === 'train' ? 'active-tool' : ''}
              ></sl-icon-button>
            </sl-tooltip>
            <sl-tooltip content="Train Front/Back">
              <sl-icon-button
                name="arrow-bar-right"
                label="Train Front/End"
                style="font-size: 2em; color: white;"
                @click=${() => this._activateLabelingTool('train-end')}
                ?disabled=${this.image === undefined}
                class=${this.activeTool === 'train-end' ? 'active-tool' : ''}
              ></sl-icon-button>
            </sl-tooltip>
            <sl-tooltip content="Train Coupling">
              <sl-icon-button
                name="arrows-collapse-vertical"
                label="Coupling"
                style="font-size: 2em; color: white;"
                @click=${() => this._activateLabelingTool('coupling')}
                ?disabled=${this.image === undefined}
                class=${this.activeTool === 'coupling' ? 'active-tool' : ''}
              ></sl-icon-button>
            </sl-tooltip>
          </div>
        </nav>
        <main>
          ${this.image
            ? this.activeTool && this.activeTool !== 'calibrate'
              ? html`<rr-label
                  .activeTool=${this.activeTool}
                  .manifest=${this.manifest}
                  .canvas=${this.labelCanvas}
                ></rr-label>`
              : html`<rr-calibrate
                  .imageUrl=${this.image}
                  .manifest=${this.manifest}
                  .canvas=${this.calibrateCanvas}
                ></rr-calibrate>`
            : html`<p>Please upload an image to begin.</p>`}
        </main>
      </div>
    `;
  }

  private _activateLabelingTool(tool: string) {
    this.activeTool = tool;
    console.log(`Activated labeling tool: ${tool}`);
  }

  private _activateCalibrateTool() {
    this.activeTool = 'calibrate';
    console.log('Activated calibrate tool');
  }

  private async _initializeCanvas(imageUrl: string) {
    // Clean up existing canvases
    if (this.labelCanvas) {
      this.labelCanvas.destroy();
    }
    if (this.calibrateCanvas) {
      this.calibrateCanvas.destroy();
    }
    
    // Create new canvas instances with specific configurations
    const labelConfig: CanvasConfig = { enableSymbols: true, enableLines: false };
    this.labelCanvas = new SvgCanvas(imageUrl, labelConfig);
    await this.labelCanvas.initialize(imageUrl);
    this.labelCanvas.initializeSymbols(Object.values(TOOL_SYMBOLS));

    const calibrateConfig: CanvasConfig = { enableSymbols: false, enableLines: true };
    this.calibrateCanvas = new SvgCanvas(imageUrl, calibrateConfig);
    await this.calibrateCanvas.initialize(imageUrl);
  }

  private _handleUploadClick() {
    this.activeTool = null; // Clear active tool when uploading new image
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg, image/png, .r49';
    input.onchange = this._handleChooseFile.bind(this);
    input.click();
  }

  private async _handleSaveClick() {
    if (!this.image) {
      return;
    }

    const zip = new JSZip();
    const imageName = `image.${this.image.split(';')[0].split('/')[1]}`; // Extract extension from DataURL
    zip.file(imageName, this.image.split(',')[1], { base64: true });

    // Collect symbols and lines from their respective canvases
    if (this.labelCanvas) {
      this._currentSymbols = this.labelCanvas.getSymbolUses().map(use => ({
        id: (use.attr('href') || use.attr('xlink:href')).replace('#', ''),
        x: parseFloat(use.attr('data-original-x')),
        y: parseFloat(use.attr('data-original-y')),
      }));
    }
    if (this.calibrateCanvas) {
      this._currentLines = this.calibrateCanvas.getLines().map(line => ({
        p1: { x: parseFloat(line.attr('x1')), y: parseFloat(line.attr('y1')) },
        p2: { x: parseFloat(line.attr('x2')), y: parseFloat(line.attr('y2')) },
        color: line.attr('stroke'),
      }));
    }

    // Update manifest with collected symbols and lines
    this.manifest = {
      ...this.manifest,
      symbols: this._currentSymbols,
      calibrationLines: this._currentLines,
    };

    console.log('Preparing manifest for saving:', this.manifest);
    console.log('Current Symbols:', this._currentSymbols);
    console.log('Current Lines:', this._currentLines);

    zip.file('manifest.json', JSON.stringify(this.manifest, null, 2));

    const content = await zip.generateAsync({ type: 'blob' });
    // TODO: use name of uploaded file if available
    saveAs(content, 'railroad.r49');
  }

  private _handleChooseFile(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      if (file.name.endsWith('.r49')) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const zip = await JSZip.loadAsync(e.target?.result as ArrayBuffer);
          let imageDataUrl: Promise<string> | undefined;
          let manifestFileContent: Promise<string> | undefined;

          zip.forEach((relativePath, zipEntry) => {
            if (relativePath.startsWith('image.')) {
              // Assuming the image file starts with 'image.'
              imageDataUrl = zipEntry.async('base64').then((data) => {
                const mimeType = `image/${relativePath.split('.')[1]}`;
                return `data:${mimeType};base64,${data}`;
              });
            } else if (relativePath === 'manifest.json') {
              manifestFileContent = zipEntry.async('string');
            }
          });

          if (imageDataUrl && manifestFileContent) {
            this.image = await imageDataUrl;
            const loadedManifest = JSON.parse(await manifestFileContent);
            this.manifest = { ...this.manifest, ...loadedManifest }; // Update manifest

            await this._initializeCanvas(this.image);

            // Add symbols to labelCanvas
            if (this.labelCanvas && loadedManifest.symbols) {
              loadedManifest.symbols.forEach((s: SerializableSymbol) => {
                this.labelCanvas!.addUse(s.id, s.x, s.y);
              });
            }

            // Add lines to calibrateCanvas
            if (this.calibrateCanvas && loadedManifest.calibrationLines) {
              loadedManifest.calibrationLines.forEach((l: SerializableLine) => {
                this.calibrateCanvas!.addLine(l.p1.x, l.p1.y, l.p2.x, l.p2.y, l.color);
              });
            }

            this.activeTool = 'calibrate';
          } else {
            console.error('Invalid .r49 file: missing image or manifest.json');
            // Optionally, show an error message to the user
          }
        };
        reader.readAsArrayBuffer(file);
      } else {
        const reader = new FileReader();
        reader.onload = async (e) => {
          this.image = e.target?.result as string;
          await this._initializeCanvas(this.image);
          this.activeTool = 'calibrate'; // Activate calibrate tool visually
        };
        reader.readAsDataURL(file);
      }
    }
  }
}
