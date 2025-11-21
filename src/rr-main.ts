import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { provide } from '@lit/context';
import { saveAs } from 'file-saver';
import { Manifest, manifestContext } from './app/manifest.ts';
import JSZip from 'jszip';

/*
Set up "page" & delegate to the appropriate component based on state:
- header with title
- toolbar with buttons for upload, calibrate, save, and tools
- main area with either rr-calibrate or rr-label based on active tool

Provides context Manifest
*/

@customElement('rr-main')
export class RrMain extends LitElement {
  @provide({ context: manifestContext })
  @state()
  private _manifest: Manifest = new Manifest();

  get manifest(): Manifest {
    return this._manifest;
  }

  set manifest(newManifest: Manifest) {
    // Use a setter to reattach event listener to new manifest instance
    if (this._manifest) this._manifest.removeEventListener('rr-manifest-changed', this._handleManifestDataChanged);
    this._manifest = newManifest;
    this._manifest.addEventListener('rr-manifest-changed', this._handleManifestDataChanged);
  }

  @state()
  imageUrl: string | undefined = undefined;

  @state()
  activeTool: string | null = null;

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
      justify-content: space-between;
      padding: 0 1em;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      font-weight: bold;
      font-size: 2em;
    }

    .right-align {
      display: flex;
      align-items: center;
      gap: 0.5em;
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

    .header-text {
      color: var(--sl-color-neutral-0);
      font-family: var(--sl-font-sans);
      font-size: var(--sl-font-size-medium);
      font-weight: var(--sl-font-weight-normal);
      line-height: var(--sl-line-height-normal);
      display: inline-flex;
      align-items: center;
      height: var(--sl-input-height-medium);
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    // Ensure the initial manifest has the event listener attached
    this._manifest.addEventListener('rr-manifest-changed', this._handleManifestDataChanged);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    // Event listener cleanup is handled automatically via the manifest setter
    if (this._manifest) {
      this._manifest.removeEventListener('rr-manifest-changed', this._handleManifestDataChanged);
    }
  }

  private _handleManifestDataChanged = (event: Event) => {
    // Update the provided context data with the new data from the event
    this.manifest = new Manifest((event as CustomEvent).detail);
  };

  private _fileToolsTemplate() {
    return html`
      <div class="toolbar-group">
        ${this._renderToolButton('Upload Image', 'folder2-open', 'open', false)}
        ${this._renderToolButton('Calibrate Image', 'fullscreen', 'calibrate', this.imageUrl === undefined)}
        ${this._renderToolButton('Save Image', 'floppy', 'save', this.imageUrl === undefined)}
      </div>
    `;
  }

  private _labelToolsTemplate() {
    const disabled = this.imageUrl === undefined || this.manifest.layout.size.width === undefined || this.manifest.layout.size.height === undefined;
    return html` <div class="toolbar-group">
      ${this._renderToolButton('Detect Occupancy', 'question-circle', 'detector', disabled)}
      ${this._renderToolButton('Label as Track', 'sign-railroad', 'track', disabled)}
      ${this._renderToolButton('Label as Train Car', 'truck-front', 'train', disabled)}
      ${this._renderToolButton('Label as Train Front/Back', 'arrow-bar-right', 'train-end', disabled)}
      ${this._renderToolButton('Label as Train Coupling', 'arrows-collapse-vertical', 'coupling', disabled)}
      ${this._renderToolButton('Delete Label', 'trash3', 'delete', disabled)}
    </div>`;
  }

  private _headerTemplate() {
    return html`
      <div class="left-align">Rail49</div>
      <div class="right-align">
        <span class="header-text"> ${this.manifest.layout.name} </span>
        <span class="header-text"> ${this.manifest.layout.scale} </span>
        ${this.manifest.layout.size.width && this.manifest.layout.size.height
          ? html`<span class="header-text"> ${this.manifest.layout.size.width} x ${this.manifest.layout.size.height} mm </span>`
          : html``}
        <sl-icon-button
          name="gear"
          label="Settings"
          style="font-size: 1.5rem; color: var(--sl-color-neutral-0)"
          @click=${this._handleSettingsClick}
          ?disabled=${this.imageUrl === undefined}
        ></sl-icon-button>
      </div>
    `;
  }

  render() {
    return html`
      <header>
        <slot name="title">${this._headerTemplate()}</slot>
      </header>
      <div class="container">
        <nav>${this._fileToolsTemplate()} ${this._labelToolsTemplate()}</nav>
        <main>
          ${this.imageUrl
            ? this.activeTool && this.activeTool !== 'calibrate'
              ? html`<rr-label .imageUrl=${this.imageUrl} .activeTool=${this.activeTool}></rr-label>`
              : html`<rr-calibrate .imageUrl=${this.imageUrl}></rr-calibrate>`
            : html`<p>&nbsp;&nbsp;&nbsp;Please upload an image or open a <em>.r49</em> file.</p>`}
        </main>
      </div>
      ${this._settingsDialogTemplate()}
    `;
  }

  private _renderToolButton(toolTip: string, name: string, id: string, disabled: boolean) {
    return html`
      <sl-tooltip content=${toolTip}>
        <sl-icon-button
          name=${name}
          style="font-size: 2em; color: white;"
          @click=${() => this._handleToolClick(id)}
          ?disabled=${disabled}
          class=${this.activeTool === id ? 'active-tool' : ''}
        ></sl-icon-button>
      </sl-tooltip>
    `;
  }

  private async _handleToolClick(toolId: string) {
    switch (toolId) {
      case 'open': {
        this.activeTool = null; // Clear active tool when uploading new image
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.r49, image/jpeg, image/png';
        input.onchange = this._handleChooseFile.bind(this);
        input.click();
        break;
      }
      case 'save': {
        if (!this.imageUrl) return;

        const zip = new JSZip();
        // create image file
        const mimeType = this.imageUrl.split(';')[0].split(':')[1]; // Gets "image/jpeg"
        const extension = mimeType.split('/')[1]; // Gets "jpeg"
        const imageName = `image.${extension}`;
        zip.file(imageName, this.imageUrl.split(',')[1], { base64: true });

        // create manifest.json
        zip.file('manifest.json', this.manifest.toJSON());

        // save .r49
        const content = await zip.generateAsync({ type: 'blob' });
        const filename = `${this.manifest.layout.name}.r49`;
        saveAs(content, filename);
        break;
      }
      default: {
        this.activeTool = toolId;
        break;
      }
    }
  }

  private _load_r49(file: File) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const zip = await JSZip.loadAsync(e.target?.result as ArrayBuffer);
      let imageDataUrl: Promise<string> | undefined;
      let manifestFileContent: Promise<string> | undefined;

      // read image and manifest ...
      zip.forEach((relativePath, zipEntry) => {
        if (relativePath.startsWith('image.')) {
          // Extract extension from filename (e.g., "image.jpeg" -> "jpeg")
          const extension = relativePath.split('.').slice(1).join('.');
          imageDataUrl = zipEntry.async('base64').then((data) => {
            const mimeType = `image/${extension}`;
            return `data:${mimeType};base64,${data}`;
          });
        } else if (relativePath === 'manifest.json') {
          manifestFileContent = zipEntry.async('string');
        }
      });

      // update imageUrl & manifest
      if (imageDataUrl && manifestFileContent) {
        this.imageUrl = await imageDataUrl;
        this.manifest = Manifest.fromJSON(await manifestFileContent);
      } else {
        console.error('Invalid .r49 file: missing image or manifest.json');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  private _load_imgfile(file: File) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      // when labeleing, frequently multiple images with identical dimensions are loaded
      // hence we keep existing values (that still may apply) in manifest, updating only those that clearly need change

      // labels do not apply to different image (modification is not responsive, but name change below is)
      this.manifest.markers["detector"] = {};
      this.manifest.markers["label"] = {};

      // layout name defaults to file name
      const name = file.name.substring(0, file.name.lastIndexOf('.'));
      this.manifest.setLayout({ ...this.manifest.layout, name });
      this.imageUrl = e.target?.result as string;

      // Create an Image object to get actual dimensions
      const img = new Image();
      img.onload = () => {
        this.manifest.setImageDimensions(img.width, img.height);
      };
      img.src = this.imageUrl;
    };
    reader.readAsDataURL(file);
  }

  private _handleChooseFile(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      file.name.endsWith('.r49') ? this._load_r49(file) : this._load_imgfile(file);
      // Activate calibrate tool visually
      this.activeTool = 'calibrate';
    }
  }

  private _handleSettingsClick() {
    const dialog = this.shadowRoot?.querySelector('sl-dialog') as any;
    if (dialog) {
      dialog.show();
    }
  }

  private _settingsDialogTemplate() {
    return html`
      <sl-dialog label="Layout">
        <rr-settings></rr-settings>
      </sl-dialog>
    `;
  }
}
