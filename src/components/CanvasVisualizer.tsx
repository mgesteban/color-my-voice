import React, { useEffect, useRef } from 'react';
import type { VisualToken } from '../types/chromacoustic';

interface CanvasVisualizerProps {
  token: VisualToken | null;
  isActive: boolean;
  isCalmMode: boolean;
}

interface PaintDroplet {
  x: number;
  y: number;
  r: number;
  angle: number;
  distance: number;
  pulseSpeed: number;
  colorOffset: number;
}

interface FloatingNote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  char: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  alpha: number;
  hue: number;
  swirlAngle: number;
  swirlSpeed: number;
}

interface Sparkle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  hue: number;
}

export const CanvasVisualizer: React.FC<CanvasVisualizerProps> = ({
  token,
  isActive,
  isCalmMode,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Interpolation state targets for butter-smooth visual motion
  const stateRef = useRef({
    hue: 220,
    saturation: 0.65,
    lightness: 0.16,
    turbulence: 0.05,
    motionSpeed: 0.05,
    volume: 0.0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    let animationFrameId: number;
    let phase = 0;

    // Persistent whimsical visual elements
    const notes: FloatingNote[] = [];
    const sparkles: Sparkle[] = [];
    const staticDroplets: PaintDroplet[] = [];

    // Initialize decorative paint droplets situated around the main splash
    const numDroplets = 8;
    for (let i = 0; i < numDroplets; i++) {
      const angle = (i / numDroplets) * Math.PI * 2;
      staticDroplets.push({
        x: 0,
        y: 0,
        r: 8 + Math.random() * 12,
        angle,
        distance: 100 + Math.random() * 60,
        pulseSpeed: 0.02 + Math.random() * 0.03,
        colorOffset: (Math.random() - 0.5) * 45,
      });
    }

    const noteChars = ['𝄞', '♪', '♫', '♩', '♬', '𝄢'];

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      const current = stateRef.current;
      if (isNaN(current.hue)) current.hue = 220;
      if (isNaN(current.saturation)) current.saturation = 0.65;
      if (isNaN(current.lightness)) current.lightness = 0.16;
      if (isNaN(current.volume)) current.volume = 0.0;

      const target = token || {
        hue: 220,
        saturation: 0.65,
        lightness: 0.16,
        turbulence: 0.05,
        motionSpeed: 0.05,
        patternId: 'calm',
      };

      current.hue += ((isNaN(target.hue) ? 220 : target.hue) - current.hue) * 0.08;
      current.saturation += ((isNaN(target.saturation) ? 0.65 : target.saturation) - current.saturation) * 0.08;
      current.lightness += (((isActive && !isNaN(target.lightness)) ? target.lightness : 0.16) - current.lightness) * 0.08;
      current.volume += (((isActive && token && !isNaN(token.lightness)) ? token.lightness : 0.0) - current.volume) * 0.1;

      // 1. Organic dark backdrop with a subtle radial gradient
      const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, Math.max(w, h));
      const bgHue = mod(current.hue + 180, 360);
      bgGrad.addColorStop(0, `hsla(${bgHue}, ${current.saturation * 20}%, 5%, 1)`);
      bgGrad.addColorStop(1, '#050608');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.translate(w / 2, h / 2);

      phase += 0.015 + current.volume * 0.045;

      // 2. Generate dancing neon musical notes on sound energy
      if (isActive && current.volume > 0.03 && notes.length < 40 && !isCalmMode) {
        const spawnChance = Math.random();
        if (spawnChance < 0.15 + current.volume * 0.5) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 1.0 + Math.random() * 2.5;
          const size = 18 + Math.random() * 24;
          notes.push({
            x: (30 + current.volume * 50) * Math.cos(angle),
            y: (30 + current.volume * 50) * Math.sin(angle),
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 1.2, // dynamic buoyancy
            char: noteChars[Math.floor(Math.random() * noteChars.length)],
            size,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.05,
            alpha: 1.0,
            hue: mod(current.hue + (Math.random() - 0.5) * 60, 360),
            swirlAngle: Math.random() * Math.PI * 2,
            swirlSpeed: 0.03 + Math.random() * 0.06,
          });
        }
      }

      // 3. Render and update floating musical notes
      ctx.globalCompositeOperation = 'screen';
      for (let i = notes.length - 1; i >= 0; i--) {
        const n = notes[i];
        n.swirlAngle += n.swirlSpeed;
        n.x += n.vx + Math.sin(n.swirlAngle) * 0.8;
        n.y += n.vy;

        n.vy -= 0.02; // soft floating lift
        n.vx *= 0.97;
        n.vy *= 0.97;
        n.rotation += n.rotationSpeed;
        n.alpha -= isCalmMode ? 0.015 : 0.008;

        if (n.alpha <= 0 || n.y < -h / 2 - 40) {
          notes.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.translate(n.x, n.y);
        ctx.rotate(n.rotation);

        // Draw magic glow behind notes
        ctx.shadowBlur = 15 + current.volume * 10;
        ctx.shadowColor = `hsla(${n.hue}, 95%, 65%, ${n.alpha * 0.8})`;

        ctx.fillStyle = `hsla(${n.hue}, 95%, 72%, ${n.alpha})`;
        ctx.font = `bold ${n.size}px Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(n.char, 0, 0);

        ctx.restore();

        // Spawn magical sparkles from active drifting notes
        if (Math.random() < 0.08 && !isCalmMode && sparkles.length < 100) {
          sparkles.push({
            x: n.x + (Math.random() - 0.5) * 15,
            y: n.y + (Math.random() - 0.5) * 15,
            vx: (Math.random() - 0.5) * 1.0,
            vy: (Math.random() - 0.5) * 1.0 - 0.2,
            size: 2.0 + Math.random() * 4.0,
            alpha: 0.9,
            hue: n.hue,
          });
        }
      }

      // 4. Render and update magical sparkles (voice dust)
      for (let i = sparkles.length - 1; i >= 0; i--) {
        const s = sparkles[i];
        s.x += s.vx;
        s.y += s.vy;
        s.alpha -= 0.012;

        if (s.alpha <= 0) {
          sparkles.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${s.hue}, 95%, 80%, ${s.alpha})`;
        ctx.shadowBlur = 10;
        ctx.shadowColor = `hsla(${s.hue}, 95%, 70%, ${s.alpha})`;
        ctx.fill();
      }
      ctx.shadowBlur = 0; // reset shadow

      // 5. Draw acoustic ripple waves (rings propagating outwards)
      if (isActive && current.volume > 0.05 && !isCalmMode) {
        const pulseRatio = (phase % (Math.PI * 2)) / (Math.PI * 2);
        const maxRippleRadius = 150 + current.volume * 180;
        
        for (let r = 0; r < 3; r++) {
          const progress = (pulseRatio + r / 3) % 1.0;
          const radius = progress * maxRippleRadius;
          const alpha = (1.0 - progress) * 0.18 * current.volume;

          ctx.beginPath();
          ctx.arc(0, 0, radius, 0, Math.PI * 2);
          ctx.strokeStyle = `hsla(${mod(current.hue + progress * 60, 360)}, ${current.saturation * 100}%, 65%, ${alpha})`;
          ctx.lineWidth = 1.5 + current.volume * 3.0;
          ctx.stroke();
        }
      }

      // 6. Draw whimsical overlapping rainbow paint splatters (liquid paint art)
      ctx.globalCompositeOperation = 'screen';
      
      const numSplatterLayers = 3;
      const baseBlobSize = 65 + current.volume * 95;

      for (let l = 0; l < numSplatterLayers; l++) {
        // Multi-color rainbow offsets (Korsakov center, with beautiful adjacent rainbow hues)
        const layerHue = mod(current.hue + (l - 1) * 35, 360);
        const layerScale = 1.0 - l * 0.15;
        const blobSize = baseBlobSize * layerScale;

        const numPoints = isCalmMode ? 16 : 45;
        const points: { x: number; y: number }[] = [];
        const pattern = target.patternId;

        // Custom motion speed and wave multipliers based on texture pattern
        let speedMultiplier = 1.0;
        if (pattern === 'viscous') {
          speedMultiplier = 0.25; // slow viscous flow
        } else if (pattern === 'airy') {
          speedMultiplier = 1.6;  // breezy airy flow
        }

        const adjustedPhase = phase * speedMultiplier + l * (Math.PI / 3);

        for (let j = 0; j < numPoints; j++) {
          const theta = (j / numPoints) * Math.PI * 2;
          
          let wave = Math.sin(theta * 3 + adjustedPhase) * (6 + current.volume * 28) +
                     Math.cos(theta * 5 - adjustedPhase * 1.2) * (4 + current.volume * 14);
          
          if (pattern === 'viscous') {
            wave *= 0.35; // rounder, thicker, less turbulent blobs
          }

          let r = blobSize + wave;

          // Sandpaper/Spiky texture -> Create dynamic sharp spikes
          if (pattern === 'spiky') {
            if (j % 2 === 0) {
              r = (blobSize + wave) * (1.15 + current.volume * 0.35); // pop out spikes
            } else {
              r = (blobSize + wave) * 0.85;
            }
          }

          const x = r * Math.cos(theta);
          const y = r * Math.sin(theta);
          points.push({ x, y });
        }

        ctx.beginPath();
        
        // Brittle Glass / Crisp or Spiky Sandpaper -> Sharp geometric straight line segments
        const isSharpMode = pattern === 'crisp' || pattern === 'spiky';

        if (isSharpMode) {
          ctx.moveTo(points[0].x, points[0].y);
          for (let j = 1; j < numPoints; j++) {
            ctx.lineTo(points[j].x, points[j].y);
          }
        } else {
          // Velvet/Fluid/Viscous/Airy -> Smooth organic curves
          ctx.moveTo(points[0].x, points[0].y);
          for (let j = 0; j < numPoints; j++) {
            const next = points[(j + 1) % numPoints];
            const curr = points[j];
            const xc = (curr.x + next.x) / 2;
            const yc = (curr.y + next.y) / 2;
            ctx.quadraticCurveTo(curr.x, curr.y, xc, yc);
          }
        }
        ctx.closePath();

        // Custom opacity based on texture pattern (e.g. Airy morning mist is highly transparent)
        let alphaMultiplier = 1.0;
        if (pattern === 'airy') {
          alphaMultiplier = 0.28;
        } else if (pattern === 'viscous') {
          alphaMultiplier = 1.35; // dense, thick syrup
        }

        // Shiny radial paint gradient
        const blobGrad = ctx.createRadialGradient(-15 * layerScale, -15 * layerScale, 5, 0, 0, blobSize * 1.4);
        blobGrad.addColorStop(0, `hsla(${layerHue}, ${current.saturation * 100}%, 72%, ${Math.min(0.98, (0.48 + current.volume * 0.4) * alphaMultiplier)})`);
        blobGrad.addColorStop(0.6, `hsla(${mod(layerHue + 15, 360)}, ${current.saturation * 90}%, 50%, ${0.28 * alphaMultiplier})`);
        blobGrad.addColorStop(1, `hsla(${layerHue}, ${current.saturation * 100}%, 30%, 0.0)`);

        ctx.fillStyle = blobGrad;
        ctx.fill();

        // Stylized vector paint stroke
        ctx.strokeStyle = `hsla(${layerHue}, ${current.saturation * 100}%, 78%, ${(0.22 + current.volume * 0.3) * alphaMultiplier})`;
        ctx.lineWidth = 1.8 + current.volume * 3.5;
        ctx.stroke();
      }

      // 7. Draw whimsical satellite paint droplets
      for (let i = 0; i < staticDroplets.length; i++) {
        const d = staticDroplets[i];
        const pulse = Math.sin(phase * 1.5 + d.angle * 2) * (d.r * 0.25 * current.volume);
        const currentR = Math.max(3.0, d.r + pulse);
        const dynamicDistance = d.distance + Math.sin(phase + d.angle) * (12 + current.volume * 20);

        const x = dynamicDistance * Math.cos(d.angle);
        const y = dynamicDistance * Math.sin(d.angle);

        const dropHue = mod(current.hue + d.colorOffset, 360);

        const dropGrad = ctx.createRadialGradient(x - currentR * 0.3, y - currentR * 0.3, 1, x, y, currentR);
        dropGrad.addColorStop(0, `hsla(${dropHue}, 90%, 75%, ${0.65 + current.volume * 0.3})`);
        dropGrad.addColorStop(1, `hsla(${dropHue}, 90%, 45%, 0.05)`);

        ctx.beginPath();
        ctx.arc(x, y, currentR, 0, Math.PI * 2);
        ctx.fillStyle = dropGrad;
        ctx.fill();

        ctx.strokeStyle = `hsla(${dropHue}, 90%, 80%, ${0.18 + current.volume * 0.2})`;
        ctx.lineWidth = 1.0;
        ctx.stroke();
      }

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [token, isActive, isCalmMode]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          background: '#050608',
        }}
      />
    </div>
  );
};

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}
