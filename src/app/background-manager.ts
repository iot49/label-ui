import { Svg, Image as SvgImage } from '@svgdotjs/svg.js';

export class BackgroundManager {
  private svg: Svg;
  private backgroundImage?: SvgImage;
  private canvasDimensions = { width: 800, height: 600 }; // Default, will be updated

  constructor(svg: Svg) {
    this.svg = svg;
  }

  async loadBackgroundImage(url: string): Promise<void> {
    const img = new Image();
    img.src = url;

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
    });

    this.canvasDimensions = {
      width: img.naturalWidth,
      height: img.naturalHeight
    };

    this.svg.size(this.canvasDimensions.width, this.canvasDimensions.height);
    this.svg.viewbox(0, 0, this.canvasDimensions.width, this.canvasDimensions.height);

    if (this.backgroundImage) {
      this.backgroundImage.remove();
    }
    this.backgroundImage = this.svg.image(url).move(0, 0);
  }

  getDimensions(): { width: number; height: number } {
    return { ...this.canvasDimensions };
  }
}