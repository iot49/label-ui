import { createContext } from '@lit/context';

export const manifestContext = createContext<Manifest>('manifest');

export interface ManifestData {
  version: number;
  layout: Layout;
  image: { pixelWidth: number; pixelHeight: number };
  markers: Record<string, Marker>;
}

export interface Layout {
  name: string | undefined;
  scale: ValidScales;
  size: { width: number | undefined; height: number | undefined }; // in mm
}

export interface Marker {
  x: number;
  y: number;
}

export const Scale2Number = {
  G: 25,
  O: 48,
  S: 64,
  HO: 87,
  T: 72,
  N: 160,
  Z: 96,
};

type ValidScales = keyof typeof Scale2Number;

export class Manifest extends EventTarget {
  private _data!: ManifestData;

  constructor(data?: Partial<ManifestData>) {
    super();

    // Initialize _data first
    this._data = {
      version: 1,
      layout: { name: undefined, scale: 'HO', size: { width: undefined, height: undefined } },
      image: { pixelWidth: 0, pixelHeight: 0 },
      markers: {},
    };

    if (data) this._data = { ...this._data, ...data };
  }

  get version() {
    return this._data.version;
  }
  get layout() {
    return this._data.layout;
  }
  get image() {
    return this._data.image;
  }
  get markers() {
    return this._data.markers;
  }
  get scale(): number {
    return Scale2Number[this._data.layout.scale];
  }

  setLayout(layout: Layout) {
    this.dispatchEvent(
      new CustomEvent('rr-manifest-changed', {
        detail: { ...this._data, layout: layout },
      })
    );
  }

  setImageDimensions(width: number, height: number) {
    if (width != this.image.pixelWidth || height != this.image.pixelHeight || Object.keys(this.markers).length < 4) {
      const newMarkers = {
        'rect-0': { x: 50, y: 50 },
        'rect-1': { x: 50, y: height - 50 },
        'rect-2': { x: width - 50, y: 50 },
        'rect-3': { x: width - 50, y: height - 50 },
      };

      this.dispatchEvent(
        new CustomEvent('rr-manifest-changed', {
          detail: {
            ...this._data,
            image: { pixelWidth: width, pixelHeight: height },
            markers: newMarkers,
          },
        })
      );
    }
  }

  setMarker(id: string, x: number, y: number) {
    this.dispatchEvent(
      new CustomEvent('rr-manifest-changed', {
        detail: { ...this._data, markers: { ...this._data.markers, [id]: { x, y } } },
      })
    );
  }

  deleteMarker(id: string) {
    // Remove marker with given id if it exists
    if (!(id in this._data.markers)) {
      return; // Marker doesn't exist, nothing to do
    }
    
    const { [id]: removed, ...newMarkers } = this._data.markers;
    this.dispatchEvent(
      new CustomEvent('rr-manifest-changed', {
        detail: { ...this._data, markers: newMarkers }
      })
    );
  }

  toJSON(): string {
    return JSON.stringify(this._data, null, 2);
  }

  static fromJSON(json: string): Manifest {
    const data = JSON.parse(json);
    return new Manifest(data);
  }
}
