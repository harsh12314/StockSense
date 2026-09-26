// client/src/components/Button.jsx
import './Button.css';

/**
 * Shared Button component.
 * variant: 'primary' | 'secondary' | 'danger' | 'ghost'
 * size:    'sm' | 'md' | 'lg'
 */
export default function Button({
  children,
  onClick,
  variant = 'secondary',
  size = 'md',
  disabled = false,
  type = 'button',
  className = '',
}) {
  return (
    <button
      type={type}
      className={`btn btn-${variant} ${size !== 'md' ? `btn-${size}` : ''} ${className}`.trim()}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
