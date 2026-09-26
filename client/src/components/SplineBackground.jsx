// client/src/components/SplineBackground.jsx
import React, { useState, useRef } from 'react';
import Spline from '@splinetool/react-spline';

export default function SplineBackground({
  scene = 'https://prod.spline.design/LHB9hInitRb0kDY1/scene.splinecode',
  showBranding = false,
}) {
  const [loaded, setLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const splineRef = useRef(null);

  const hideBakedText = (spline) => {
    if (!spline) return;

    const hideNode = (node) => {
      if (!node) return;
      node.visible = false;
      if (node.scale && typeof node.scale.set === 'function') {
        node.scale.set(0, 0, 0);
      }
      if (typeof node.traverse === 'function') {
        node.traverse((child) => {
          child.visible = false;
          if (child.scale && typeof child.scale.set === 'function') {
            child.scale.set(0, 0, 0);
          }
        });
      }
    };

    try {
      // 1. By direct names identified from the .splinecode scene
      const targetNames = ['Text', 'Text 2', 'Instructions'];
      targetNames.forEach((name) => {
        const obj = spline.findObjectByName(name);
        if (obj) hideNode(obj);
      });

      // 2. By exact Spline UUIDs
      const targetIds = [
        'a2f7f49b-4196-4710-b1e2-f8937560feb9', // "OPTITRANS LOG"
        '698ae2be-95af-46b4-bc58-99541510f6eb', // "Transport Expert Around the World"
        '94390d9d-a72e-47c1-8265-bbbd20f712ec', // Parent instructions
      ];
      if (typeof spline.findObjectById === 'function') {
        targetIds.forEach((id) => {
          const obj = spline.findObjectById(id);
          if (obj) hideNode(obj);
        });
      }

      // 3. Traverse entire scene graph to catch any meshes with matching properties
      const sceneGraph = spline._scene || spline.scene;
      if (sceneGraph && typeof sceneGraph.traverse === 'function') {
        sceneGraph.traverse((child) => {
          const isTargetName = targetNames.includes(child.name);
          const isTargetId = targetIds.includes(child.id);
          const isTextType = child.type && child.type.toLowerCase().includes('text');
          if (isTargetName || isTargetId || isTextType) {
            hideNode(child);
          }
        });
      }
    } catch (err) {
      console.warn('Error suppressing baked 3D text in Spline scene:', err);
    }
  };

  const handleLoad = (spline) => {
    splineRef.current = spline;
    setLoaded(true);

    // Apply suppression immediately and on subsequent frames to prevent initial flash
    hideBakedText(spline);
    requestAnimationFrame(() => hideBakedText(spline));
    setTimeout(() => hideBakedText(spline), 50);
    setTimeout(() => hideBakedText(spline), 200);
    setTimeout(() => hideBakedText(spline), 600);
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        zIndex: 0,
        pointerEvents: 'auto',
      }}
    >
      {!hasError ? (
        <Spline
          scene={scene}
          onLoad={handleLoad}
          onError={(e) => {
            console.warn('Spline 3D background failed to load:', e);
            setHasError(true);
          }}
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        />
      ) : null}

      {/* Light-blue translucent ambient wash to preserve light theme while letting 3D models show */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 65% 50%, rgba(240, 245, 252, 0.65) 0%, rgba(235, 243, 252, 0.86) 100%)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* StockSense Brand Hero Overlay (if enabled) */}
      {showBranding && (
        <div className="auth-hero-branding">
          <div className="auth-hero-badge">
            <span className="auth-badge-dot" />
            <span>Intelligent Logistics ERP</span>
          </div>
          <h1 className="auth-hero-title">
            STOCK<br />
            <span className="brand-highlight">SENSE</span>
          </h1>
          <p className="auth-hero-tagline">
            &ldquo;Know what you have, where it is, before it&apos;s a problem.&rdquo;
          </p>
        </div>
      )}
    </div>
  );
}

