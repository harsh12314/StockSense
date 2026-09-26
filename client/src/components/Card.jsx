// client/src/components/Card.jsx
import React from 'react';

/**
 * Shared Card Component
 * Rounded corners (16-20px), soft drop shadow (0 2px 12px rgba(0,0,0,0.04)), 24px+ padding, white background.
 */
export default function Card({
  children,
  className = '',
  onClick,
  style = {},
  ...props
}) {
  return (
    <div
      className={`card ${className}`.trim()}
      onClick={onClick}
      style={style}
      {...props}
    >
      {children}
    </div>
  );
}
