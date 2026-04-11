/**
 * StatusIndicator — Connection / proximity status badge
 */

interface StatusIndicatorProps {
  status: 'connected' | 'disconnected' | 'scanning';
  label: string;
}

export function StatusIndicator({ status, label }: StatusIndicatorProps) {
  return (
    <div className={`status-indicator ${status}`}>
      <span className="status-dot" />
      <span>{label}</span>
    </div>
  );
}
