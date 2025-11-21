import { createContext } from '@lit/context';

export const manifestContext = createContext<Manifest>('manifest');

export interface ManifestData {
  version: number;
  layout: Layout;
  camera: Camera;
  markers: Markers;
}

export interface Layout {
  name: string | undefined;
  scale: ValidScales;
  size: { width: number | undefined; height: number | undefined }; // in mm
  description?: string;
  contact?: string;
}

export interface Camera {
  resolution: { width: number; height: number };
  model?: string;
}

export type MarkerCategory = "calibration" | "detector" | "label";
export type MarkerId = string;
export type Markers = Record<MarkerCategory, Record<string, Marker>>;

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
      camera: { resolution: { width: 0, height: 0 } },
      markers: { calibration: {}, detector: {}, label: {} },
    };

    if (data) this._data = { ...this._data, ...data };
  }

  get version() {
    return this._data.version;
  }
  get layout() {
    return this._data.layout;
  }
  get camera() {
    return this._data.camera;
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
    const calibrationMarkerCount = Object.keys(this.markers.calibration || {}).length;
    if (width != this.camera.resolution.width || height != this.camera.resolution.height || calibrationMarkerCount < 4) {
      const newCalibrationMarkers = {
        'rect-0': { x: 50, y: 50 },
        'rect-1': { x: 50, y: height - 50 },
        'rect-2': { x: width - 50, y: 50 },
        'rect-3': { x: width - 50, y: height - 50 },
      };

      this.dispatchEvent(
        new CustomEvent('rr-manifest-changed', {
          detail: {
            ...this._data,
            camera: { ...this._data.camera, resolution: { width, height } },
            markers: { ...this._data.markers, calibration: newCalibrationMarkers },
          },
        })
      );
    }
  }

  setMarker(category: MarkerCategory, id: string, x: number, y: number) {
    this.dispatchEvent(
      new CustomEvent('rr-manifest-changed', {
        detail: {
          ...this._data,
          markers: {
            ...this._data.markers,
            [category]: { ...this._data.markers[category], [id]: { x: Math.round(x), y: Math.round(y) } }
          }
        },
      })
    );
  }

  deleteMarker(id: string) {
    // Find which category the marker belongs to (detector or label only)
    let targetCategory: MarkerCategory | null = null;
    
    if (id in (this._data.markers.detector || {})) {
      targetCategory = "detector";
    } else if (id in (this._data.markers.label || {})) {
      targetCategory = "label";
    }

    if (!targetCategory) {
      return; // Marker doesn't exist in deletable categories, nothing to do
    }

    const { [id]: removed, ...newCategoryMarkers } = this._data.markers[targetCategory];
    this.dispatchEvent(
      new CustomEvent('rr-manifest-changed', {
        detail: {
          ...this._data,
          markers: {
            ...this._data.markers,
            [targetCategory]: newCategoryMarkers
          }
        },
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
