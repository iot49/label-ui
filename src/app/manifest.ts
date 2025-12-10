import { createContext } from '@lit/context';

export const manifestContext = createContext<Manifest>('manifest');

export type MarkerCategory = 'calibration' | 'label';

export type UUID = string;

export interface Point {
  x: number;
  y: number;
}

export interface Marker extends Point {
  type: string;
}

export interface Image {
  filename: string;
  labels: Record<UUID, Marker>;
}

export interface ManifestData {
  version: number;
  layout: Layout;
  camera: Camera;
  calibration: Record<string, Point>;
  images: Image[];
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

export const Scale2Number = {
  G: 25,
  O: 48,
  S: 64,
  HO: 87,
  T: 72,
  N: 160,
  Z: 96,
};

export const standard_gauge_mm = 1435; // Standard gauge in millimeters

type ValidScales = keyof typeof Scale2Number;

export class Manifest extends EventTarget {
  private _data: ManifestData = {
    version: 2,
    layout: { name: undefined, scale: 'HO', size: { width: undefined, height: undefined } },
    camera: { resolution: { width: 0, height: 0 } },
    calibration: {},
    images: [],
  };

  constructor(data?: Partial<ManifestData>) {
    super();

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
  get calibration() {
    return this._data.calibration;
  }
  get images() {
    return this._data.images;
  }
  get scale(): number {
    return Scale2Number[this._data.layout.scale];
  }
  get dots_per_track(): number { 
    if (!this._data.layout.size.width && !this._data.layout.size.height) return -1;
    // Calculate dpt based on top width of calibration rectangle. 
    // This is valid even if the rectangle is rotated as long as the track is parallel to the top edge.
    const [r0, r1] = [this._data.calibration['rect-0'], this._data.calibration['rect-2']];
    const w_px = Math.sqrt((r1.x - r0.x) ** 2 + (r1.y - r0.y) ** 2);
    const w_mm = this._data.layout.size.width;
    const track_mm = standard_gauge_mm / this.scale;
    const px_per_mm = w_px / w_mm!;
    return Math.round(px_per_mm * track_mm);
  }

  setLayout(layout: Layout) {
    this.dispatchEvent(
      new CustomEvent('rr-manifest-changed', {
        detail: { ...this._data, layout: layout },
      })
    );
  }

  setImageDimensions(width: number, height: number) {
    const calibrationMarkerCount = Object.keys(this.calibration || {}).length;
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
            calibration: newCalibrationMarkers,
          },
        })
      );
    }
  }

  setImages(images: Image[]) {
    this.dispatchEvent(
      new CustomEvent('rr-manifest-changed', {
        detail: { ...this._data, images },
      })
    );
  }

  setMarker(category: MarkerCategory, id: string, x: number, y: number, type?: string, imageIndex: number = 0) {
    if (category === 'calibration') {
      const calibration = { ...this._data.calibration, [id]: { x: Math.round(x), y: Math.round(y) } };
      this.dispatchEvent(
        new CustomEvent('rr-manifest-changed', {
          detail: { ...this._data, calibration },
        })
      );
    } else if (category === 'label') {
        const image = this._data.images[imageIndex];
        if (!image) return; // Should not happen if index is valid

        const labels = { ...image.labels, [id]: { x: Math.round(x), y: Math.round(y), type: type || 'track' } };
        const newImages = [...this._data.images];
        newImages[imageIndex] = { ...image, labels };

        this.dispatchEvent(
          new CustomEvent('rr-manifest-changed', {
            detail: { ...this._data, images: newImages },
          })
        );
    }
  }

  deleteMarker(category: MarkerCategory, id: string, imageIndex: number = 0) {
    if (category === 'calibration') {
        // Calibration markers generally aren't deleted individually via this method in this app flow usually, 
        // but if needed:
        const { [id]: deleted, ...calibration } = this._data.calibration;
        this.dispatchEvent(
            new CustomEvent('rr-manifest-changed', {
            detail: { ...this._data, calibration },
            })
        );
    } else if (category === 'label') {
        const image = this._data.images[imageIndex];
        if (!image) return;

        const { [id]: deleted, ...labels } = image.labels;
        const newImages = [...this._data.images];
        newImages[imageIndex] = { ...image, labels };

        this.dispatchEvent(
            new CustomEvent('rr-manifest-changed', {
            detail: { ...this._data, images: newImages },
            })
        );
    }
  }

  toJSON(): string {
    return JSON.stringify(this._data, null, 2);
  }

  static fromJSON(json: string): Manifest {
    const data = JSON.parse(json);
    if (data.version !== 2) {
      throw new Error(`Unsupported manifest version: ${data.version}. Application only supports version 2.`);
    }
    return new Manifest(data);
  }
}
