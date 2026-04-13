'use client';

import { useEffect, useRef } from 'react';

export default function RadarChart({ scores, size = 72, max = 10 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const centerX = size / 2;
    const centerY = size / 2;
    const maxRadius = size / 2 - 8;
    const labels = Object.keys(scores);
    const values = Object.values(scores);
    const numAxes = labels.length;
    const angleStep = (2 * Math.PI) / numAxes;
    const startAngle = -Math.PI / 2;

    // Clear
    ctx.clearRect(0, 0, size, size);

    // Draw grid circles
    for (let level = 1; level <= 5; level++) {
      const r = (maxRadius * level) / 5;
      ctx.beginPath();
      ctx.arc(centerX, centerY, r, 0, 2 * Math.PI);
      ctx.strokeStyle = level === 5 ? 'rgba(7, 193, 96, 0.15)' : 'rgba(0, 0, 0, 0.04)';
      ctx.lineWidth = level === 5 ? 1 : 0.5;
      ctx.stroke();
    }

    // Draw grid lines
    for (let i = 0; i < numAxes; i++) {
      const angle = startAngle + i * angleStep;
      const x = centerX + maxRadius * Math.cos(angle);
      const y = centerY + maxRadius * Math.sin(angle);
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x, y);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // Draw data polygon
    ctx.beginPath();
    for (let i = 0; i < numAxes; i++) {
      const angle = startAngle + i * angleStep;
      const value = Math.max(0, Math.min(values[i] / max, 1));
      const x = centerX + maxRadius * value * Math.cos(angle);
      const y = centerY + maxRadius * value * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();

    // Fill
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius);
    gradient.addColorStop(0, 'rgba(7, 193, 96, 0.3)');
    gradient.addColorStop(1, 'rgba(7, 193, 96, 0.08)');
    ctx.fillStyle = gradient;
    ctx.fill();

    // Stroke
    ctx.strokeStyle = 'rgba(7, 193, 96, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Draw data points
    for (let i = 0; i < numAxes; i++) {
      const angle = startAngle + i * angleStep;
      const value = Math.max(0, Math.min(values[i] / max, 1));
      const x = centerX + maxRadius * value * Math.cos(angle);
      const y = centerY + maxRadius * value * Math.sin(angle);

      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, 2 * Math.PI);
      ctx.fillStyle = '#07C160';
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }, [scores, size]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
    />
  );
}
