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
  imageUrls: string[] = [];

  @state()
  currentImageIndex: number = -1;

  get imageUrl(): string | undefined {
    if (this.currentImageIndex >= 0 && this.currentImageIndex < this.imageUrls.length) {
      return this.imageUrls[this.currentImageIndex];
    }
    return undefined;
  }

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

    /* Thumbnail bar styles */
    .thumbnails {
      height: 70px;
      display: flex;
      align-items: center;
      padding: 0 0.5em;
      gap: 0.5em;
      overflow-x: auto;
      background-color: var(--sl-color-neutral-100);
      border-bottom: 1px solid var(--sl-color-neutral-200);
      flex-shrink: 0;
    }

    .thumbnail-wrapper {
      position: relative;
      display: inline-block;
    }

    .thumbnail {
      width: 60px;
      height: 60px;
      border: 2px solid transparent;
      border-radius: 4px;
      cursor: pointer;
      object-fit: contain;
      background-color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .thumbnail.active {
      border-color: var(--sl-color-primary-600);
    }

    .delete-btn {
      position: absolute;
      top: -5px;
      right: -5px;
      width: 20px;
      height: 20px;
      background-color: var(--sl-color-danger-600);
      color: white;
      border-radius: 50%;
      display: none; /* Hidden by default */
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 12px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }

    .thumbnail-wrapper:hover .delete-btn {
      display: flex; /* Show on hover */
    }

    .add-image-btn {
      width: 60px;
      height: 60px;
      border: 2px dashed var(--sl-color-neutral-400);
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: var(--sl-color-neutral-400);
      font-size: 2em;
    }

    .add-image-btn:hover {
      border-color: var(--sl-color-primary-600);
      color: var(--sl-color-primary-600);
    }

    /* Update main layout to accommodate thumbnail bar */
    .main-content {
      display: flex;
      flex-direction: column;
      flex-grow: 1;
      overflow: hidden;
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
        ${this._renderToolButton('Save Image', 'floppy', 'save', this.imageUrl === undefined)}
      </div>
    `;
  }

  private _thumbnailBarTemplate() {
    return html`
      <div class="thumbnails">
        ${this.imageUrls.map(
      (url, index) => html`
          <div class="thumbnail-wrapper">
            <img
              src="${url}"
              class="thumbnail ${index === this.currentImageIndex ? 'active' : ''}"
              @click=${() => {
          this.currentImageIndex = index;
        }}
            />
            <div class="delete-btn" @click=${(e: Event) => this._handleDeleteImage(e, index)}>
              <sl-icon name="x-lg"></sl-icon>
            </div>
          </div>
          `
    )}
        
        <div class="add-image-btn" @click=${this._handleAddImageClick}>
          <sl-icon name="plus-lg"></sl-icon>
        </div>
      </div>
    `;
  }

  private _labelToolsTemplate() {
    const disabled = this.imageUrl === undefined || this.manifest.layout.size.width === undefined || this.manifest.layout.size.height === undefined;
    return html` <div class="toolbar-group">
      ${this._renderToolButton('Label as Other', 'question-circle', 'other', disabled)}
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
        ? html`
              <span class="header-text">${this.manifest.layout.size.width} x ${this.manifest.layout.size.height} mm</span>
              <span class="header-text">${this.manifest.dots_per_track} dpt</span>`
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
        <div class="main-content">
          ${this._thumbnailBarTemplate()}
          <main>
            ${this.imageUrl
        ? this.activeTool && this.activeTool !== 'calibrate'
          ? html`<rr-label .imageUrl=${this.imageUrl} .imageIndex=${this.currentImageIndex} .activeTool=${this.activeTool}></rr-label>`
          : html`<rr-label .imageUrl=${this.imageUrl} .imageIndex=${this.currentImageIndex} .activeTool=${this.activeTool}></rr-label>`
        : html`<p>&nbsp;&nbsp;&nbsp;Please upload an image or open a <em>.r49</em> file.</p>`}
          </main>
        </div>
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
        input.accept = '.r49,application/zip,.zip';
        input.onchange = this._handleChooseFile.bind(this);
        input.click();
        break;
      }
      case 'save': {
        if (this.imageUrls.length === 0) return;

        const zip = new JSZip();
        const imageFilenames: string[] = [];

        // create image files
        this.imageUrls.forEach((url, i) => {
          const mimeType = url.split(';')[0].split(':')[1]; // Gets "image/jpeg"
          const extension = mimeType.split('/')[1]; // Gets "jpeg"
          const imageName = `image-${i}.${extension}`;
          zip.file(imageName, url.split(',')[1], { base64: true });
          imageFilenames.push(imageName);
        });

        // update manifest with image list
        const images = imageFilenames.map((filename, index) => {
          // If the image already existed in the manifest, try to preserve its labels
          // Simple heuristic: if we are saving the same count of images, map 1-to-1
          // Use existing manifest data if available for this index
          const existingImage = this.manifest.images[index];
          return {
            filename: filename,
            labels: existingImage ? existingImage.labels : {}
          };
        });

        this.manifest.setImages(images);

        // create manifest.json
        zip.file('manifest.json', this.manifest.toJSON());

        // save .r49
        const content = await zip.generateAsync({ type: 'blob' });
        const name = this.manifest.layout.name || 'layout';
        const filename = `${name}.r49`;
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
      let imagePromiseList: Promise<string>[] = [];
      let manifestFileContent: Promise<string> | undefined;

      // read image and manifest ...
      zip.forEach((relativePath, zipEntry) => {
        if (relativePath.startsWith('image')) {
          // Extract extension from filename (e.g., "image.jpeg" -> "jpeg")
          const extension = relativePath.split('.').slice(1).join('.');
          const imagePromise = zipEntry.async('base64').then((data) => {
            const mimeType = `image/${extension}`;
            return `data:${mimeType};base64,${data}`;
          });
          imagePromiseList.push(imagePromise);
        } else if (relativePath === 'manifest.json') {
          manifestFileContent = zipEntry.async('string');
        }
      });

      // update imageUrl & manifest
      if (imagePromiseList.length > 0 && manifestFileContent) {
        // R49 load replaces everything
        try {
          const manifestJson = await manifestFileContent;
          const newManifest = Manifest.fromJSON(manifestJson);

          this.imageUrls = await Promise.all(imagePromiseList);
          this.currentImageIndex = 0;
          this.manifest = newManifest;
        } catch (e) {
          alert(`Error loading file: ${(e as Error).message}`);
          console.error(e);
        }
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

      // layout name defaults to file name
      const name = file.name.substring(0, file.name.lastIndexOf('.'));
      const newImageUrl = e.target?.result as string;
      if (this.imageUrls.includes(newImageUrl)) {
        alert('This image has already been loaded.');
        return;
      }

      // Create an Image object to get actual dimensions
      const img = new Image();
      img.onload = () => {
        // Validation: Only if we already have images
        if (this.imageUrls.length > 0) {
          const currentWidth = this.manifest.camera.resolution.width;
          const currentHeight = this.manifest.camera.resolution.height;
          if (img.width !== currentWidth || img.height !== currentHeight) {
            alert(`Error: New image dimensions (${img.width}x${img.height}) must match existing images (${currentWidth}x${currentHeight}).`);
            return;
          }
        }

        this.manifest.setLayout({ ...this.manifest.layout, name });
        // This will set/update resolution. If it was empty, it sets it. If it was same, it does nothing/idempotent.
        this.manifest.setImageDimensions(img.width, img.height);

        this.imageUrls = [...this.imageUrls, newImageUrl];
        const newIndex = this.imageUrls.length - 1;
        this.currentImageIndex = newIndex;

        // Sync manifest: Add new empty image entry
        // We use a placeholder filename which will be overwritten on save, 
        // but ensures an object exists for labels to attach to.
        const currentImages = this.manifest.images;
        const newImageEntry = { filename: `image-${newIndex}`, labels: {} };
        this.manifest.setImages([...currentImages, newImageEntry]);
      };
      img.src = newImageUrl;
    };
    reader.readAsDataURL(file);
  }

  private _handleChooseFile(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      file.name.toLowerCase().endsWith('.r49') ? this._load_r49(file) : this._load_imgfile(file);
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

  private _handleAddImageClick() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg, image/png';
    input.onchange = (e) => this._handleChooseFile(e);
    input.click();
  }

  private _handleDeleteImage(e: Event, index: number) {
    e.stopPropagation(); // Prevent selecting the image when deleting

    // Remove image from array
    const newImageUrls = [...this.imageUrls];
    newImageUrls.splice(index, 1);
    this.imageUrls = newImageUrls;

    // Sync manifest: Remove image entry
    const currentImages = [...this.manifest.images];
    if (index < currentImages.length) {
      currentImages.splice(index, 1);
      this.manifest.setImages(currentImages);
    }

    // Update index if needed
    if (this.currentImageIndex >= this.imageUrls.length) {
      this.currentImageIndex = this.imageUrls.length - 1;
    } else if (this.currentImageIndex === index) {
      // If we deleted the current image, safety check (handled by length check above mostly, but good for clarity)
      this.currentImageIndex = Math.max(0, this.currentImageIndex - 1);
      if (this.imageUrls.length === 1) this.currentImageIndex = 0;
    }

    // If no images left, reset
    if (this.imageUrls.length === 0) {
      this.currentImageIndex = -1;
    }

    // Update manifest (this will need to be more robust in Step 6, but for now we sync the list)
    // Note: In Step 6 we will have a proper structure, for now just syncing the list of what will be saved
    // The actual manifest.images update happens on save currently, so this state change is sufficient for UI
  }
}
