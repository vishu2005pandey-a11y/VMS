/**
 * Photorealistic LED Matrix Canvas Renderer
 * Simulates physical outdoor DIP / SMD LED matrix panels with individual glowing diodes,
 * dot pitch, unlit background diodes, Hindi unicode rendering, and real-time scroll/blink.
 */

class LEDMatrixCanvas {
  constructor(canvasElement, options = {}) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');

    // Matrix specs
    this.matrixWidth = options.matrixWidth || 192;   // number of LED columns
    this.matrixHeight = options.matrixHeight || 32;   // number of LED rows
    this.dotPitch = options.dotPitch || 4;            // pixel spacing on screen
    this.dotRadius = options.dotRadius || 1.4;

    // State
    this.lines = options.lines || ['FASTag LANE ONLY', 'कृपया लेन न बदलें'];
    this.color = options.color || 'A';   // 'A'=Amber, 'G'=Green, 'R'=Red, 'W'=White
    this.effect = options.effect || 'S'; // 'S'=Static, 'L'=Scroll Left, 'F'=Flash
    this.speed = options.speed || 5;
    this.brightness = options.brightness || 1.0; // 0.0 to 1.0

    // Animation internal state
    this.scrollOffset = 0;
    this.flashVisible = true;
    this.lastFlashToggle = Date.now();
    this.animationFrameId = null;

    // Virtual offscreen canvas for text rasterization
    this.offscreen = document.createElement('canvas');
    this.offCtx = this.offscreen.getContext('2d', { willReadFrequently: true });

    this.initCanvasSize();
    this.startAnimationLoop();
  }

  setDimensions(width, height) {
    this.matrixWidth = width;
    this.matrixHeight = height;
    this.initCanvasSize();
    this.rasterizeText();
  }

  initCanvasSize() {
    this.canvas.width = this.matrixWidth * this.dotPitch;
    this.canvas.height = this.matrixHeight * this.dotPitch;

    // Keep offscreen canvas big enough for scrolling text
    this.offscreen.width = Math.max(1000, this.matrixWidth * 3);
    this.offscreen.height = this.matrixHeight;
  }

  updateContent({ lines, color, effect, speed, brightness }) {
    if (lines !== undefined) this.lines = lines;
    if (color !== undefined) this.color = color;
    if (effect !== undefined) {
      this.effect = effect;
      this.scrollOffset = 0;
    }
    if (speed !== undefined) this.speed = speed;
    if (brightness !== undefined) this.brightness = brightness;

    this.rasterizeText();
  }

  /**
   * Rasterize text lines onto the low-res 1-bit matrix offscreen canvas
   */
  rasterizeText() {
    const ctx = this.offCtx;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, this.offscreen.width, this.offscreen.height);

    ctx.fillStyle = '#FFFFFF';
    ctx.textBaseline = 'middle';

    const validLines = this.lines.filter(l => l && l.trim().length > 0);
    const count = validLines.length;

    if (count === 1) {
      // 1 single large line
      ctx.font = 'bold 20px "Segoe UI", "Arial", sans-serif';
      const text = validLines[0];
      const textWidth = ctx.measureText(text).width;
      this.contentWidth = Math.max(this.matrixWidth, textWidth + 40);

      const x = this.effect === 'L' ? 0 : Math.max(0, (this.matrixWidth - textWidth) / 2);
      ctx.fillText(text, x, this.matrixHeight / 2);
    } else if (count >= 2) {
      // 2 lines (Line 1 English, Line 2 Hindi, etc.)
      ctx.font = 'bold 12px "Segoe UI", "Arial", sans-serif';

      const line1 = validLines[0];
      const line2 = validLines[1];
      const w1 = ctx.measureText(line1).width;
      const w2 = ctx.measureText(line2).width;
      this.contentWidth = Math.max(this.matrixWidth, Math.max(w1, w2) + 40);

      const x1 = this.effect === 'L' ? 0 : Math.max(0, (this.matrixWidth - w1) / 2);
      const x2 = this.effect === 'L' ? 0 : Math.max(0, (this.matrixWidth - w2) / 2);

      ctx.fillText(line1, x1, 8);
      ctx.fillText(line2, x2, 23);
    }

    // Read pixel data from offscreen
    this.pixelData = ctx.getImageData(0, 0, this.offscreen.width, this.matrixHeight).data;
  }

  getColorValues() {
    switch (this.color) {
      case 'G':
        return {
          core: '#00ff88',
          glow: 'rgba(0, 255, 136, ' + (0.5 * this.brightness) + ')',
          off: '#08170e'
        };
      case 'R':
        return {
          core: '#ff334b',
          glow: 'rgba(255, 51, 75, ' + (0.5 * this.brightness) + ')',
          off: '#190a0c'
        };
      case 'W':
        return {
          core: '#ffffff',
          glow: 'rgba(230, 245, 255, ' + (0.5 * this.brightness) + ')',
          off: '#10141a'
        };
      case 'A':
      default:
        return {
          core: '#ffaa00',
          glow: 'rgba(255, 170, 0, ' + (0.5 * this.brightness) + ')',
          off: '#1a1205'
        };
    }
  }

  render() {
    const ctx = this.ctx;
    const colors = this.getColorValues();
    const pData = this.pixelData;

    // Clear main canvas background
    ctx.fillStyle = '#030508';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    if (!pData) return;

    // Flash effect handling
    let isLit = true;
    if (this.effect === 'F') {
      const now = Date.now();
      if (now - this.lastFlashToggle > (600 / (this.speed || 5))) {
        this.flashVisible = !this.flashVisible;
        this.lastFlashToggle = now;
      }
      isLit = this.flashVisible;
    }

    const currentScrollX = this.effect === 'L' ? Math.floor(this.scrollOffset) : 0;
    const offWidth = this.offscreen.width;

    // Render physical LED diode grid
    for (let y = 0; y < this.matrixHeight; y++) {
      for (let x = 0; x < this.matrixWidth; x++) {
        // Calculate sampling coordinate on the text bitmap
        let sampleX = (x + currentScrollX) % (this.contentWidth || this.matrixWidth);
        const pIndex = (y * offWidth + sampleX) * 4;

        // Check brightness of raster pixel (R channel)
        const active = isLit && (pData[pIndex] > 120);

        const screenX = x * this.dotPitch + this.dotPitch / 2;
        const screenY = y * this.dotPitch + this.dotPitch / 2;

        ctx.beginPath();
        ctx.arc(screenX, screenY, this.dotRadius, 0, Math.PI * 2);

        if (active) {
          ctx.fillStyle = colors.core;
          ctx.fill();

          // Subtle outer glow halo for lit LEDs
          ctx.beginPath();
          ctx.arc(screenX, screenY, this.dotRadius * 1.8, 0, Math.PI * 2);
          ctx.fillStyle = colors.glow;
          ctx.fill();
        } else {
          // Unlit LED diode phosphor body
          ctx.fillStyle = colors.off;
          ctx.fill();
        }
      }
    }
  }

  startAnimationLoop() {
    const animate = () => {
      if (this.effect === 'L') {
        this.scrollOffset += (this.speed * 0.15);
      }

      this.render();
      this.animationFrameId = requestAnimationFrame(animate);
    };

    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    this.animationFrameId = requestAnimationFrame(animate);
  }

  destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}

window.LEDMatrixCanvas = LEDMatrixCanvas;
