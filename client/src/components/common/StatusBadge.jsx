import React from 'react';

const STATUS_CONFIG = {
  draft: {
    label: 'Draft',
    bg: 'rgba(100, 116, 139, 0.08)',
    color: '#64748B',
    border: '#64748B',
    dot: '#64748B',
  },
  waiting: {
    label: 'Waiting',
    bg: 'rgba(217, 119, 6, 0.08)',
    color: '#D97706',
    border: '#D97706',
    dot: '#D97706',
  },
  ready: {
    label: 'Ready',
    bg: 'rgba(74, 144, 226, 0.08)',
    color: '#4A90E2',
    border: '#4A90E2',
    dot: '#4A90E2',
  },
  done: {
    label: 'Done',
    bg: 'rgba(34, 197, 94, 0.08)',
    color: '#16A34A',
    border: '#22C55E',
    dot: '#22C55E',
  },
  canceled: {
    label: 'Canceled',
    bg: 'rgba(239, 68, 68, 0.08)',
    color: '#DC2626',
    border: '#EF4444',
    dot: '#EF4444',
  },
  late: {
    label: 'Late',
    bg: 'rgba(239, 68, 68, 0.08)',
    color: '#DC2626',
    border: '#EF4444',
    dot: '#EF4444',
  },
  in: {
    label: 'In',
    bg: 'rgba(34, 197, 94, 0.08)',
    color: '#16A34A',
    border: '#22C55E',
    dot: '#22C55E',
  },
  out: {
    label: 'Out',
    bg: 'rgba(239, 68, 68, 0.08)',
    color: '#DC2626',
    border: '#EF4444',
    dot: '#EF4444',
  },
};

export default function StatusBadge({ status, text, isLate = false, className = '' }) {
  const normalized = (status || '').toLowerCase();
  const config = STATUS_CONFIG[normalized] || STATUS_CONFIG.draft;
  const label = text || (isLate ? 'Late' : config.label);

  return (
    <span
      className={`status-badge ${className}`.trim()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 12px',
        borderRadius: '9999px',
        fontSize: '11.5px',
        fontWeight: '600',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        backgroundColor: isLate ? STATUS_CONFIG.late.bg : config.bg,
        color: isLate ? STATUS_CONFIG.late.color : config.color,
        border: `1.5px solid ${isLate ? STATUS_CONFIG.late.border : config.border}`,
      }}
    >
      <span
        className="status-dot"
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: isLate ? STATUS_CONFIG.late.dot : config.dot,
        }}
      />
      {label}
    </span>
  );
}

