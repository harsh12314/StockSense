import React from 'react';

/**
 * StatusBadge component
 * Renders Draft, Waiting, Ready, Done, Canceled with fixed color mapping from DESIGN.md
 */
export default function StatusBadge({ status, isLate, className = '' }) {
  const normalized = (status || 'draft').toLowerCase();

  return (
    <span className={`status-badge ${normalized} ${isLate ? 'badge-late' : ''} ${className}`}>
      {normalized}
      {isLate && <span className="late-indicator" title="Schedule date has passed">(Late)</span>}
    </span>
  );
}
