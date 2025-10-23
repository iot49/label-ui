export interface Point {
  x: number;
  y: number;
}

export interface CalibrationLine {
  p1: Point;
  p2: Point;
  length: number;
  color?: string;
}

export interface Manifest {
  scale: number;
  referenceLength: number;
  calibrationLines?: SerializableLine[]; // Updated to use SerializableLine
  symbols?: SerializableSymbol[]; // Added symbols
  imageWidth?: number;
  imageHeight?: number;
}

export interface CanvasConfig {
  enableSymbols: boolean;
  enableLines: boolean;
}

export interface SerializablePoint {
  x: number;
  y: number;
}

export interface SerializableSymbol {
  id: string;
  x: number;
  y: number;
}

export interface SerializableLine {
  p1: SerializablePoint;
  p2: SerializablePoint;
  color?: string;
}