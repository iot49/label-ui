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
  calibrationLines?: CalibrationLine[];
  imageWidth?: number;
  imageHeight?: number;
}