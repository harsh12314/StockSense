// client/src/components/FormField.jsx
import styles from './FormField.module.css';
import clsx from 'clsx';

export default function FormField({ label, required, error, hint, children, className }) {
  return (
    <div className={clsx(styles.field, className)}>
      {label && (
        <label className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}
      {children}
      {error && <span className={styles.errorMsg}>{error}</span>}
      {!error && hint && <span className={styles.hint}>{hint}</span>}
    </div>
  );
}

// Convenience sub-components
FormField.Input = function Input({ error, className, ...props }) {
  return (
    <input
      className={clsx(styles.input, error && styles.error, className)}
      {...props}
    />
  );
};

FormField.Select = function Select({ error, className, children, ...props }) {
  return (
    <select
      className={clsx(styles.select, error && styles.error, className)}
      {...props}
    >
      {children}
    </select>
  );
};
