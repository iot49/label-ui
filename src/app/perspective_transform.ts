import cv, { type Mat } from "opencv-ts";
import type { Manifest } from "./manifest";

export function computePerspectiveTransform(manifest: Manifest): Mat {
    const markers = manifest.markers;

    // Get the four corner points from the manifest
    const rect0 = markers['rect-0']; // top-left
    const rect1 = markers['rect-1']; // bottom-left
    const rect2 = markers['rect-2']; // top-right
    const rect3 = markers['rect-3']; // bottom-right

    // Source points (the quadrilateral in the image)
    const src = cv.matFromArray(4, 1, cv.CV_32FC2, [
        rect0.x, rect0.y,  // top-left
        rect2.x, rect2.y,  // top-right
        rect3.x, rect3.y,  // bottom-right
        rect1.x, rect1.y   // bottom-left
    ]);

    // Destination points
    const size = manifest.layout.size;
    const dst = cv.matFromArray(4, 1, cv.CV_32FC2, [
        0, 0,
        size.width, 0,
        size.width, size.height,
        0, size.height
    ]);

    // Compute perspective transformation matrix
    const transformMatrix = cv.getPerspectiveTransform(src, dst);
    
    // Clean up temporary matrices but keep transformMatrix for return
    // required since OpenCV uses webassembly
    src.delete();
    dst.delete();
    
    return transformMatrix;
}

export function cssTansform(transformMatrix: Mat): string {
    const data = transformMatrix.data64F;
    return `matrix3d(${data[0]}, ${data[3]}, 0, ${data[6]}, ${data[1]}, ${data[4]}, 0, ${data[7]}, 0, 0, 1, 0, ${data[2]}, ${data[5]}, 0, 1)`;
}

export function transformPoint(x: number, y: number, transformMatrix: any): {x: number, y: number} {
    const point = cv.matFromArray(1, 1, cv.CV_32FC2, [x, y]);
    const transformedPoint = new cv.Mat();
    cv.perspectiveTransform(point, transformedPoint, transformMatrix);
    
    const data = transformedPoint.data32F;
    const result = { x: data[0], y: data[1] };
    
    point.delete();
    transformedPoint.delete();
    
    return result;
}

// Source - https://stackoverflow.com/q/10623809
// Posted by Phrogz, modified by community. See post 'Timeline' for change history
// Retrieved 2025-11-14, License - CC BY-SA 3.0

/*
This is a great little utility function, but unfortunately Google Chrome removed the getTransformToElement() method recently. The workaround is to polyfill SVGElement : if (typeof SVGElement.prototype.getTransformToElement === 'undefined') { SVGElement.prototype.getTransformToElement = function(toElement) { return toElement.getScreenCTM().inverse().multiply(this.getScreenCT‌​M()); }; } 
*/

// FIXED: getTransformToElement polyfill with proper null checks and TypeScript types

// Type declaration for the polyfill
declare global {
    interface SVGElement {
        getTransformToElement?(toElement: SVGElement): SVGMatrix;
    }
}

if (typeof (SVGElement.prototype as any).getTransformToElement === 'undefined') {
    (SVGElement.prototype as any).getTransformToElement = function(toElement: SVGElement): SVGMatrix {
        const toElementCTM = (toElement as SVGGraphicsElement).getScreenCTM();
        const thisElementCTM = (this as SVGGraphicsElement).getScreenCTM();

        if (!toElementCTM || !thisElementCTM) {
            console.error('DEBUG: CTM is null', { toElementCTM, thisElementCTM });
            throw new Error('Unable to get screen CTM');
        }
        
        return toElementCTM.inverse().multiply(thisElementCTM);
    };
}

// Calculate the bounding box of an element with respect to its parent element
export function transformedBoundingBox(el: any){
  var bb  = el.getBBox(),
      svg = el.ownerSVGElement,
      m   = el.getTransformToElement(el.parentNode);

  // Create an array of all four points for the original bounding box
  var pts = [
    svg.createSVGPoint(), svg.createSVGPoint(),
    svg.createSVGPoint(), svg.createSVGPoint()
  ];
  pts[0].x=bb.x;          pts[0].y=bb.y;
  pts[1].x=bb.x+bb.width; pts[1].y=bb.y;
  pts[2].x=bb.x+bb.width; pts[2].y=bb.y+bb.height;
  pts[3].x=bb.x;          pts[3].y=bb.y+bb.height;

  // Transform each into the space of the parent,
  // and calculate the min/max points from that.    
  var xMin=Infinity,xMax=-Infinity,yMin=Infinity,yMax=-Infinity;
  pts.forEach(function(pt){
    pt = pt.matrixTransform(m);
    xMin = Math.min(xMin,pt.x);
    xMax = Math.max(xMax,pt.x);
    yMin = Math.min(yMin,pt.y);
    yMax = Math.max(yMax,pt.y);
  });

  // Update the bounding box with the new values
  bb.x = xMin; bb.width  = xMax-xMin;
  bb.y = yMin; bb.height = yMax-yMin;
  return bb;
}


export function bbox(width: number, height: number, transformMatrix: any) {
    console.log("0     0.    ", transformPoint(0, 0, transformMatrix));
    console.log("width 0.    ", transformPoint(width, 0, transformMatrix));
    console.log("0     height", transformPoint(0, height, transformMatrix));
    console.log("width height", transformPoint(width, height, transformMatrix));
}