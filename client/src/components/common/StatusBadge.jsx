import React from 'react';

const STATUS_CONFIG = {
  draft: {
    label: 'Draft',
    bg: '#252321',
    color: '#d6cfc7',
    border: '#3c3833',
    dot: '#a8a196',
  },
  waiting: {
    label: 'Waiting',
    bg: '#2c2214',
    color: '#fbbf24',
    border: '#4a371c',
    dot: '#f59e0b',
  },
  ready: {
    label: 'Ready',
    bg: '#142538',
    color: '#7dd3fc',
    border: '#1e3d5c',
    dot: '#38bdf8',
  },
  done: {
    label: 'Done',
    bg: '#13281a',
    color: '#86efac',
    border: '#1f482a',
    dot: '#22c55e',
  },
  canceled: {
    label: 'Canceled',
    bg: '#2d1818',
    color: '#fca5a5',
    border: '#4d2222',
    dot: '#ef4444',
  },
  late: {
    label: 'Late',
    bg: '#33151f',
    color: '#fda4af',
    border: '#541d2e',
    dot: '#f43f5e',
  },
  in: {
    label: 'In',
    bg: '#13281a',
    color: '#86efac',
    border: '#1f482a',
    dot: '#22c55e',
  },
  out: {
    label: 'Out',
    bg: '#2d1818',
    color: '#fca5a5',
    border: '#4d2222',
    dot: '#ef4444',
  },
};

export default function StatusBadge({ status, text, isLate = false, className = '' }) {
  const normalized = (status || '').toLowerCase();
  const config = STATUS_CONFIG[normalized] || STATUS_CONFIG.draft;
  const label = text || (isLate ? 'Late' : config.label);

  return (
    <span
      className={`status-badge ${className}`}
      style={{
        backgroundColor: isLate ? STATUS_CONFIG.late.bg : config.bg,
        color: isLate ? STATUS_CONFIG.late.color : config.color,
        borderColor: isLate ? STATUS_CONFIG.late.border : config.border,
      }}
    >
      <span
        className="status-dot"
        style={{
          backgroundColor: isLate ? STATUS_CONFIG.late.dot : config.dot,
        }}
      />
      {label}
    </span>
  );
}
