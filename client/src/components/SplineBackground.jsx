// client/src/components/SplineBackground.jsx
import React, { useState } from 'react';
import Spline from '@splinetool/react-spline';

export default function SplineBackground({
  scene = 'https://prod.spline.design/LHB9hInitRb0kDY1/scene.splinecode',
}) {
  const [loaded, setLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

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
          onLoad={() => setLoaded(true)}
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

      {/* Visual dark vignette / glass gradient overlay to ensure login card contrast */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at center, rgba(15, 23, 42, 0.4) 0%, rgba(9, 13, 22, 0.75) 100%)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
    </div>
  );
}
