import { ParticlePoint } from '../types';

const PARTICLE_COUNT = 4000;
const CANVAS_WIDTH = 200;
const CANVAS_HEIGHT = 100;

// Helper to create a point
const createPoint = (x: number, y: number, z: number, color: [number, number, number]): ParticlePoint => ({ x, y, z, color });

/**
 * Generates points for a 3D Spiral Christmas Tree
 */
export const generateTreePoints = (): ParticlePoint[] => {
  const points: ParticlePoint[] = [];
  
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    // Spiral logic
    const angle = i * 0.1;
    const height = (i / PARTICLE_COUNT) * 20 - 10; // -10 to 10
    const radius = ((20 - (height + 10)) / 20) * 8; // Wider at bottom
    
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = height;

    // Decorate: Mostly green, some red/gold ornaments
    let color: [number, number, number] = [0.1, 0.8, 0.2]; // Green
    if (Math.random() > 0.95) color = [1, 0.1, 0.1]; // Red ornament
    else if (Math.random() > 0.95) color = [1, 0.8, 0.1]; // Gold ornament

    points.push(createPoint(x, y, z, color));
  }
  return points;
};

/**
 * Generates points by sampling text drawn on a 2D canvas
 */
export const generateTextPoints = (text: string, colorBase: [number, number, number] = [1, 1, 1]): ParticlePoint[] => {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return [];

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Adjust font size based on text length
  const fontSize = text.length > 2 ? 30 : 80;
  ctx.font = `bold ${fontSize}px Arial`;
  ctx.fillText(text, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);

  const imageData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  const data = imageData.data;
  
  const validPixels: {x: number, y: number}[] = [];

  // Scan for white pixels
  for (let y = 0; y < CANVAS_HEIGHT; y += 2) { // Skip lines for density control
    for (let x = 0; x < CANVAS_WIDTH; x += 2) {
      const index = (y * CANVAS_WIDTH + x) * 4;
      if (data[index] > 128) { // Red channel > 128
        validPixels.push({ x, y });
      }
    }
  }

  const points: ParticlePoint[] = [];
  
  // Map pixels to 3D points
  if (validPixels.length === 0) return points;

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    // If we have more particles than pixels, reuse pixels randomly to fill volume
    const pixel = validPixels[i % validPixels.length];
    
    // Center and scale
    const x = (pixel.x - CANVAS_WIDTH / 2) * 0.2;
    const y = -(pixel.y - CANVAS_HEIGHT / 2) * 0.2; // Flip Y for canvas coords
    const z = (Math.random() - 0.5) * 2; // Slight depth
    
    points.push(createPoint(x, y, z, colorBase));
  }

  return points;
};

// Returns points for the current stage
export const getPointsForStage = (stage: string): ParticlePoint[] => {
  switch (stage) {
    case 'TREE':
      return generateTreePoints();
    case '5':
    case '4':
    case '3':
    case '2':
    case '1':
      return generateTextPoints(stage, [0.4, 0.6, 1.0]); // Blue-ish
    case 'HAPPY_NEW_YEAR':
      return generateTextPoints('新年快乐', [1, 0.8, 0.2]); // Gold
    default:
      return generateTreePoints();
  }
};
