import { AlertCircle, Check, RefreshCw, Sparkles } from 'lucide-react';

export function LoadingState({ rows = 4, label = 'Loading call intelligence' }) {
  return (
    <div className="skeleton-stack" role="status" aria-label={label}>
      <span className="sr-only">{label}…</span>
      {Array.from({ length: rows }, (_, index) => (
        <div className="skeleton-row" key={index} aria-hidden="true"><i /><span /><b /></div>
      ))}
    </div>
  );
}

export function EmptyState({ title = 'No calls found', detail = 'Try adjusting your filters or refresh the call list.' }) {
  return (
    <div className="empty-state">
      <div className="empty-mark"><Sparkles size={20} /></div>
      <h3>{title}</h3>
      <p>{detail}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="error-state" role="alert">
      <div className="error-mark"><AlertCircle size={19} /></div>
      <div className="error-copy"><strong>We couldn’t load your call data</strong><p>{message || 'Check the API connection and try again.'}</p></div>
      {onRetry && <button className="button button-quiet" onClick={onRetry}><RefreshCw size={15} /> Retry</button>}
    </div>
  );
}

export function Toast({ toast, onClose }) {
  if (!toast) return null;
  return (
    <div className={`toast toast-${toast.type || 'success'}`} role="status">
      <span className="toast-icon">{toast.type === 'error' ? <AlertCircle size={17} /> : <Check size={17} />}</span>
      <span>{toast.message}</span>
      <button className="icon-button toast-close" aria-label="Dismiss notification" title="Dismiss notification" onClick={onClose}>×</button>
    </div>
  );
}
