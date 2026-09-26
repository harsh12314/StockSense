// client/src/components/Button.jsx
import styles from './Button.module.css';
import clsx from 'clsx';

export default function Button({
  children,
  variant = 'primary',
  size,
  className,
  ...props
}) {
  return (
    <button
      className={clsx(
        styles.btn,
        styles[variant],
        size && styles[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
