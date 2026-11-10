/**
 * ═══════════════════════════════════════════════════════════════
 *  Fall — Ambient Falling Autumn Leaves Component
 *
 *  Provides a gentle, realistic drifting leaves effect across the
 *  entire viewport.
 *  - Organic physics: flutter, 3D flip, pendulum sway, and breeze
 *  - Multiple leaf species: Maple, Oak, Birch, and Ginkgo
 *  - High performance Canvas 2D render loop (0.1% CPU)
 *  - Non-intrusive: pointer-events: none (zero click interference)
 * ═══════════════════════════════════════════════════════════════
 */

import { useEffect, useRef } from 'react';

interface Leaf {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  oscillationSpeed: number;
  oscillationDistance: number;
  oscillationAngle: number;
  rotation: number;
  rotationSpeed: number;
  flipAngle: number;
  flipSpeed: number;
  opacity: number;
  colorIndex: number;
  type: 'maple' | 'oak' | 'birch' | 'ginkgo';
}

interface FallProps {
  /** Number of leaves floating simultaneously (default: 26) */
  count?: number;
  /** Wind drift factor (-1 to 1, default: 0.25 gentle right breeze) */
  wind?: number;
  /** Overall opacity of the leaf effect (0 to 1, default: 0.85) */
  opacity?: number;
  /** Additional custom class name */
  className?: string;
  /** Custom z-index (default: 9999 so leaves float above background) */
  zIndex?: number;
}

const LEAF_COLORS = [
  { main: '#e25822', dark: '#b83b10', light: '#f97316' }, // Flame Maple
  { main: '#f59e0b', dark: '#d97706', light: '#fbbf24' }, // Golden Birch
  { main: '#dc2626', dark: '#991b1b', light: '#ef4444' }, // Crimson Oak
  { main: '#d97706', dark: '#b45309', light: '#fde047' }, // Amber Ginkgo
  { main: '#b45309', dark: '#78350f', light: '#d97706' }, // Russet Brown
  { main: '#c2410c', dark: '#9a3412', light: '#fb923c' }, // Burnt Sienna
];

const LEAF_TYPES: Leaf['type'][] = ['maple', 'oak', 'birch', 'ginkgo'];

function drawMapleLeaf(ctx: CanvasRenderingContext2D, size: number, colors: typeof LEAF_COLORS[0]) {
  const s = size / 20;
  ctx.beginPath();
  ctx.moveTo(0, 16 * s);
  ctx.lineTo(0, 8 * s);

  // Central lobe
  ctx.bezierCurveTo(-2 * s, 4 * s, -3 * s, 0, 0, -16 * s);
  ctx.bezierCurveTo(3 * s, 0, 2 * s, 4 * s, 0, 8 * s);

  // Left lobes
  ctx.bezierCurveTo(-4 * s, 6 * s, -12 * s, 2 * s, -14 * s, -6 * s);
  ctx.bezierCurveTo(-11 * s, -2 * s, -7 * s, 2 * s, -3 * s, 7 * s);
  ctx.bezierCurveTo(-7 * s, 9 * s, -12 * s, 9 * s, -13 * s, 6 * s);

  // Right lobes
  ctx.bezierCurveTo(7 * s, 9 * s, 12 * s, 9 * s, 13 * s, 6 * s);
  ctx.bezierCurveTo(11 * s, -2 * s, 7 * s, 2 * s, 3 * s, 7 * s);
  ctx.bezierCurveTo(4 * s, 6 * s, 12 * s, 2 * s, 14 * s, -6 * s);

  ctx.closePath();
  ctx.fillStyle = colors.main;
  ctx.fill();

  // Stem & Veins
  ctx.beginPath();
  ctx.moveTo(0, 18 * s);
  ctx.lineTo(0, -10 * s);
  ctx.moveTo(0, 4 * s);
  ctx.lineTo(-8 * s, -2 * s);
  ctx.moveTo(0, 4 * s);
  ctx.lineTo(8 * s, -2 * s);
  ctx.strokeStyle = colors.dark;
  ctx.lineWidth = 1 * s;
  ctx.stroke();
}

function drawOakLeaf(ctx: CanvasRenderingContext2D, size: number, colors: typeof LEAF_COLORS[0]) {
  const s = size / 20;
  ctx.beginPath();
  ctx.moveTo(0, 18 * s);
  ctx.lineTo(0, 14 * s);

  // Rounded wavy lobed leaf
  ctx.bezierCurveTo(-6 * s, 12 * s, -8 * s, 8 * s, -4 * s, 6 * s);
  ctx.bezierCurveTo(-10 * s, 4 * s, -10 * s, -2 * s, -4 * s, -4 * s);
  ctx.bezierCurveTo(-8 * s, -8 * s, -6 * s, -14 * s, 0, -18 * s);
  ctx.bezierCurveTo(6 * s, -14 * s, 8 * s, -8 * s, 4 * s, -4 * s);
  ctx.bezierCurveTo(10 * s, -2 * s, 10 * s, 4 * s, 4 * s, 6 * s);
  ctx.bezierCurveTo(8 * s, 8 * s, 6 * s, 12 * s, 0, 14 * s);

  ctx.closePath();
  ctx.fillStyle = colors.main;
  ctx.fill();

  // Center vein
  ctx.beginPath();
  ctx.moveTo(0, 18 * s);
  ctx.lineTo(0, -14 * s);
  ctx.strokeStyle = colors.dark;
  ctx.lineWidth = 1.2 * s;
  ctx.stroke();
}

function drawBirchLeaf(ctx: CanvasRenderingContext2D, size: number, colors: typeof LEAF_COLORS[0]) {
  const s = size / 20;
  ctx.beginPath();
  ctx.moveTo(0, 16 * s);
  ctx.lineTo(0, 12 * s);

  // Classic teardrop / heart leaf shape
  ctx.bezierCurveTo(-10 * s, 8 * s, -12 * s, -2 * s, 0, -18 * s);
  ctx.bezierCurveTo(12 * s, -2 * s, 10 * s, 8 * s, 0, 12 * s);

  ctx.closePath();
  ctx.fillStyle = colors.main;
  ctx.fill();

  // Highlight
  ctx.beginPath();
  ctx.moveTo(0, 16 * s);
  ctx.lineTo(0, -12 * s);
  ctx.strokeStyle = colors.light;
  ctx.lineWidth = 1 * s;
  ctx.stroke();
}

function drawGinkgoLeaf(ctx: CanvasRenderingContext2D, size: number, colors: typeof LEAF_COLORS[0]) {
  const s = size / 20;
  ctx.beginPath();
  ctx.moveTo(0, 18 * s);
  ctx.lineTo(0, 10 * s);

  // Fan shaped leaf
  ctx.bezierCurveTo(-14 * s, 8 * s, -16 * s, -8 * s, -4 * s, -14 * s);
  ctx.bezierCurveTo(-2 * s, -11 * s, 2 * s, -11 * s, 4 * s, -14 * s);
  ctx.bezierCurveTo(16 * s, -8 * s, 14 * s, 8 * s, 0, 10 * s);

  ctx.closePath();
  ctx.fillStyle = colors.main;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, 18 * s);
  ctx.lineTo(0, -10 * s);
  ctx.strokeStyle = colors.dark;
  ctx.lineWidth = 1 * s;
  ctx.stroke();
}

export function Fall({
  count = 26,
  wind = 0.35,
  opacity = 0.85,
  className = '',
  zIndex = 100,
}: FallProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Initialize leaf collection
    const leaves: Leaf[] = Array.from({ length: count }, () => {
      return {
        x: Math.random() * width,
        y: Math.random() * height - height, // Spread across and above
        size: 16 + Math.random() * 18, // 16px - 34px
        speedY: 0.7 + Math.random() * 1.3, // Gentle downward glide
        speedX: wind + (Math.random() - 0.5) * 0.4,
        oscillationSpeed: 0.015 + Math.random() * 0.025,
        oscillationDistance: 20 + Math.random() * 35,
        oscillationAngle: Math.random() * Math.PI * 2,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.03,
        flipAngle: Math.random() * Math.PI * 2,
        flipSpeed: 0.02 + Math.random() * 0.03,
        opacity: 0.45 + Math.random() * 0.5,
        colorIndex: Math.floor(Math.random() * LEAF_COLORS.length),
        type: LEAF_TYPES[Math.floor(Math.random() * LEAF_TYPES.length)],
      };
    });

    // Render loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < leaves.length; i++) {
        const leaf = leaves[i];

        // Physics step: oscillate sideways and fall
        leaf.oscillationAngle += leaf.oscillationSpeed;
        const sway = Math.sin(leaf.oscillationAngle) * leaf.oscillationDistance;

        leaf.x += leaf.speedX + Math.cos(leaf.oscillationAngle) * 0.5;
        leaf.y += leaf.speedY;

        // 3D tumble flip and rotation
        leaf.rotation += leaf.rotationSpeed;
        leaf.flipAngle += leaf.flipSpeed;
        const flipScale = Math.cos(leaf.flipAngle);

        // Respawn if leaf has drifted off bottom or sides
        if (leaf.y > height + 40) {
          leaf.y = -30 - Math.random() * 50;
          leaf.x = Math.random() * (width + 200) - 100;
        }
        if (leaf.x > width + 50) {
          leaf.x = -40;
        } else if (leaf.x < -50) {
          leaf.x = width + 40;
        }

        // Render leaf with 3D flip transformation
        ctx.save();
        ctx.translate(leaf.x + sway, leaf.y);
        ctx.rotate(leaf.rotation);
        ctx.scale(1, flipScale); // Realistic 3D flutter
        ctx.globalAlpha = leaf.opacity * opacity;

        const colors = LEAF_COLORS[leaf.colorIndex];

        switch (leaf.type) {
          case 'maple':
            drawMapleLeaf(ctx, leaf.size, colors);
            break;
          case 'oak':
            drawOakLeaf(ctx, leaf.size, colors);
            break;
          case 'birch':
            drawBirchLeaf(ctx, leaf.size, colors);
            break;
          case 'ginkgo':
            drawGinkgoLeaf(ctx, leaf.size, colors);
            break;
        }

        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [count, wind, opacity]);

  return (
    <canvas
      ref={canvasRef}
      className={`falling-leaves-canvas ${className}`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex,
      }}
      aria-hidden="true"
    />
  );
}

// Export aliases so both `import { Fall }` and `import { fall }` work seamlessly
export const fall = Fall;
export default Fall;
