import React from 'react';
import { Check, Clock, PackageCheck, AlertCircle, Ban } from 'lucide-react';

const STEPS = [
  { id: 'draft', label: 'Draft', icon: Clock, description: 'Order created' },
  { id: 'waiting', label: 'Waiting', icon: AlertCircle, description: 'Stock reservation' },
  { id: 'ready', label: 'Ready', icon: PackageCheck, description: 'Picked & Packed' },
  { id: 'done', label: 'Done', icon: Check, description: 'Shipped & Decreased' },
];

export default function StatusStepper({ currentStatus }) {
  const status = (currentStatus || 'draft').toLowerCase();
  const isCanceled = status === 'canceled';

  const getStepIndex = (s) => {
    switch (s) {
      case 'draft': return 0;
      case 'waiting': return 1;
      case 'ready': return 2;
      case 'done': return 3;
      default: return 0;
    }
  };

  const currentIndex = getStepIndex(status);

  if (isCanceled) {
    return (
      <div className="status-stepper canceled-stepper" style={{ borderLeft: '4px solid var(--status-canceled)' }}>
        <div className="stepper-step canceled-step">
          <div className="stepper-dot" style={{ background: 'var(--status-canceled)', color: '#fff' }}>
            <Ban size={16} />
          </div>
          <div className="stepper-label-group">
            <span className="stepper-label" style={{ fontWeight: 700, color: 'var(--status-canceled)' }}>Order Canceled</span>
            <span className="stepper-desc" style={{ fontSize: '0.75rem', color: '#64748b' }}>No stock was decremented</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="status-stepper">
      {STEPS.map((step, idx) => {
        const isCurrent = idx === currentIndex;
        const isPast = idx < currentIndex;
        const IconComponent = step.icon;

        return (
          <React.Fragment key={step.id}>
            <div
              className={`stepper-step ${isCurrent ? 'active' : ''} ${isPast ? 'completed' : ''}`}
            >
              <div className="stepper-dot">
                {isPast ? <Check size={14} /> : <IconComponent size={14} />}
              </div>
              <div className="stepper-label-group">
                <span className="stepper-label">{step.label}</span>
                <span className="stepper-desc" style={{ fontSize: '0.7rem', opacity: 0.8, display: 'block' }}>
                  {step.description}
                </span>
              </div>
            </div>

            {idx < STEPS.length - 1 && (
              <div className={`stepper-line ${idx < currentIndex ? 'completed' : ''}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
