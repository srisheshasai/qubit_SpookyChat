import React, { useEffect, useRef } from 'react';

export default function BlochSphere({ theta = 0, phi = 0, isCollapsing = false, collapsedState = null, width = 220, height = 220 }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const currentTheta = useRef(theta);
  const currentPhi = useRef(phi);

  useEffect(() => {
    // Smooth transition of angles
    let active = true;
    const animate = () => {
      if (!active) return;

      let targetTheta = theta;
      let targetPhi = phi;

      if (isCollapsing && collapsedState !== null) {
        // Collapse to |0> (theta = 0) or |1> (theta = Math.PI)
        targetTheta = collapsedState === 0 ? 0 : Math.PI;
        // Hold phase constant during collapse
      }

      // Linear interpolation for smooth visuals
      currentTheta.current += (targetTheta - currentTheta.current) * 0.15;
      currentPhi.current += (targetPhi - currentPhi.current) * 0.15;

      draw();
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      active = false;
      cancelAnimationFrame(animationRef.current);
    };
  }, [theta, phi, isCollapsing, collapsedState]);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cx = width / 2;
    const cy = height / 2;
    const r = Math.min(width, height) * 0.4; // Radius of Bloch sphere

    // Clear with transparent bg
    ctx.clearRect(0, 0, width, height);

    // Draw grid glow effect
    const glowGradient = ctx.createRadialGradient(cx, cy, 2, cx, cy, r);
    glowGradient.addColorStop(0, 'rgba(0, 240, 255, 0.02)');
    glowGradient.addColorStop(0.8, 'rgba(208, 0, 255, 0.02)');
    glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // 1. Draw Equator (3D Ellipse projection)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    // Ellipse with major radius r, minor radius r*0.3 representing slant
    ctx.ellipse(cx, cy, r, r * 0.28, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 2. Draw Sphere Boundary Circle
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // 3. Draw Axes (3D Projection)
    // Z axis (Up/Down)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r - 10);
    ctx.lineTo(cx, cy + r + 10);
    ctx.stroke();

    // Y axis (Right/Left - 3D skewed)
    ctx.beginPath();
    ctx.moveTo(cx - r - 10, cy);
    ctx.lineTo(cx + r + 10, cy);
    ctx.stroke();

    // X axis (Out of page - skewed 45 deg)
    const slantX = Math.cos(Math.PI / 4) * r * 0.5;
    const slantY = Math.sin(Math.PI / 4) * r * 0.5;
    ctx.beginPath();
    ctx.moveTo(cx + slantX + 5, cy + slantY + 5);
    ctx.lineTo(cx - slantX - 5, cy - slantY - 5);
    ctx.stroke();

    // 4. Draw Labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '10px Fira Code';
    ctx.textAlign = 'center';
    
    // Z-axis Labels (|0> and |1>)
    ctx.fillStyle = '#00f0ff'; // Cyan for |0>
    ctx.fillText('|0⟩', cx, cy - r - 14);
    ctx.fillStyle = '#d000ff'; // Purple for |1>
    ctx.fillText('|1⟩', cx, cy + r + 20);

    // X and Y axis Labels
    ctx.fillStyle = 'rgba(142, 155, 179, 0.8)';
    ctx.fillText('+z', cx - 12, cy - r + 5);
    ctx.fillText('+y', cx + r + 16, cy + 3);
    ctx.fillText('+x', cx - slantX - 12, cy - slantY - 4);

    // 5. Calculate State Vector Endpoint in 3D projection
    // Spherical coordinates:
    // x = r * sin(theta) * cos(phi)
    // y = r * sin(theta) * sin(phi)
    // z = r * cos(theta)
    const t = currentTheta.current;
    const p = currentPhi.current;

    const vecX_sph = Math.sin(t) * Math.cos(p);
    const vecY_sph = Math.sin(t) * Math.sin(p);
    const vecZ_sph = Math.cos(t);

    // Project onto 2D Screen:
    // Screen X = cx + vecY * r - vecX * slant_factor_x
    // Screen Y = cy - vecZ * r + vecX * slant_factor_y
    const slantFactorX = Math.cos(Math.PI / 4) * 0.35;
    const slantFactorY = Math.sin(Math.PI / 4) * 0.35;

    const targetX = cx + (vecY_sph * r) - (vecX_sph * r * slantFactorX);
    const targetY = cy - (vecZ_sph * r) + (vecX_sph * r * slantFactorY);

    // 6. Draw Projection Lines to Equator and Z-axis
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    
    // Line to Z-axis
    ctx.beginPath();
    ctx.moveTo(targetX, targetY);
    ctx.lineTo(cx, cy - (vecZ_sph * r));
    ctx.stroke();

    // Line to Equator projection
    const eqX = cx + (vecY_sph * r) - (vecX_sph * r * slantFactorX);
    const eqY = cy + (vecX_sph * r * slantFactorY);
    ctx.beginPath();
    ctx.moveTo(targetX, targetY);
    ctx.lineTo(eqX, eqY);
    ctx.stroke();
    
    // Center to Equator projection point
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(eqX, eqY);
    ctx.stroke();

    // 7. Draw State Vector Arrow
    ctx.setLineDash([]);
    ctx.lineWidth = 3.5;
    
    // Glowing color based on current state / collapse
    let vectorColor = 'rgba(0, 240, 255, 0.9)'; // Default Cyan
    let glowColor = 'rgba(0, 240, 255, 0.6)';

    if (isCollapsing) {
      vectorColor = collapsedState === 0 ? 'rgba(0, 240, 255, 0.95)' : 'rgba(208, 0, 255, 0.95)';
      glowColor = collapsedState === 0 ? 'rgba(0, 240, 255, 0.7)' : 'rgba(208, 0, 255, 0.7)';
    } else {
      // Blend colors based on theta (0 is pure cyan, PI is pure purple)
      const ratio = t / Math.PI;
      const r_color = Math.round(0 * (1 - ratio) + 208 * ratio);
      const g_color = Math.round(240 * (1 - ratio) + 0 * ratio);
      const b_color = Math.round(255 * (1 - ratio) + 255 * ratio);
      vectorColor = `rgba(${r_color}, ${g_color}, ${b_color}, 0.95)`;
      glowColor = `rgba(${r_color}, ${g_color}, ${b_color}, 0.5)`;
    }

    // Glow under vector
    ctx.strokeStyle = glowColor;
    ctx.shadowBlur = 8;
    ctx.shadowColor = glowColor;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(targetX, targetY);
    ctx.stroke();

    // Vector line
    ctx.strokeStyle = vectorColor;
    ctx.shadowBlur = 0; // reset
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(targetX, targetY);
    ctx.stroke();

    // Draw Arrowhead
    const angle = Math.atan2(targetY - cy, targetX - cx);
    const arrowSize = 6;
    ctx.fillStyle = vectorColor;
    ctx.beginPath();
    ctx.moveTo(targetX, targetY);
    ctx.lineTo(targetX - arrowSize * Math.cos(angle - Math.PI / 6), targetY - arrowSize * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(targetX - arrowSize * Math.cos(angle + Math.PI / 6), targetY - arrowSize * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();

    // 8. Draw Center point
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw state endpoint point
    ctx.fillStyle = vectorColor;
    ctx.beginPath();
    ctx.arc(targetX, targetY, 4, 0, Math.PI * 2);
    ctx.fill();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <canvas 
        ref={canvasRef} 
        width={width} 
        height={height} 
        style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
      />
    </div>
  );
}
