import { consume } from '@lit/context';
import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { Manifest, manifestContext, Scale2Number } from './app/manifest';

@customElement('rr-settings')
export class RrSettings extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }

    .settings-table {
      display: table;
      width: 100%;
      border-spacing: 0 8px;
    }

    .settings-row {
      display: table-row;
    }

    .settings-label {
      display: table-cell;
      text-align: right;
      padding-right: 12px;
      vertical-align: middle;
      width: 150px;
    }

    .settings-field {
      display: table-cell;
      vertical-align: middle;
    }

    sl-input,
    sl-dropdown {
      width: 200px;
    }
  `;

  @consume({ context: manifestContext, subscribe: true })
  @state()
  manifest!: Manifest;

  render() {
    return html` <div class="settings-table">
      <div class="settings-row">
        <div class="settings-label">Name:</div>
        <div class="settings-field">
          <sl-input value=${this.manifest.layout.name || ""} @sl-input=${this._handleLayoutNameChange}> </sl-input>
        </div>
      </div>
      <div class="settings-row">
        <div class="settings-label">Width in mm:</div>
        <div class="settings-field">
          <sl-input type="number" value=${this.manifest.layout.size.width ?? ''} @sl-change=${this._handleWidthChange}></sl-input>
        </div>
      </div>
      <div class="settings-row">
        <div class="settings-label">Height in mm:</div>
        <div class="settings-field">
          <sl-input type="number" value=${this.manifest.layout.size.height ?? ''} @sl-input=${this._handleHeightChange}></sl-input>
        </div>
      </div>
      <div class="settings-row">
        <div class="settings-label">Scale:</div>
        <div class="settings-field">
          <sl-dropdown>
            <sl-button class="scale" slot="trigger" caret> ${this.manifest.layout.scale} </sl-button>
            <sl-menu @sl-select=${this._handleScaleSelect}>
              ${Object.keys(Scale2Number).map(
                (scale) => html`<sl-menu-item value=${scale}>${scale} (1:${Scale2Number[scale as keyof typeof Scale2Number]})</sl-menu-item>`
              )}
            </sl-menu>
          </sl-dropdown>
        </div>
      </div>
    </div>`;
  }

  private _handleLayoutNameChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.manifest.setLayout({ ...this.manifest.layout, name: input.value });
  }

  private _handleScaleSelect(event: Event) {
    const menuItem = (event as CustomEvent).detail.item;
    const scale = menuItem.value as keyof typeof Scale2Number;
    this.manifest.setLayout({ ...this.manifest.layout, scale: scale });
  }

  private _handleWidthChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const width = parseFloat(input.value) || 0;

    // estimate height from image aspect ratio (if not set by user)
    const aspect_ratio = this.manifest.camera.resolution.height / this.manifest.camera.resolution.width;
    const height = this.manifest.layout.size.height ? this.manifest.layout.size.height : Math.round(width * aspect_ratio);
    
    this.manifest.setLayout({
      ...this.manifest.layout,
      size: { width: width, height: height },
    });
  }

  private _handleHeightChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const height = parseFloat(input.value) || 0;
    this.manifest.setLayout({
      ...this.manifest.layout,
      size: { ...this.manifest.layout.size, height },
    });
  }
}
