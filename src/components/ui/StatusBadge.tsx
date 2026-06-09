import { getStatusLabel, getStatusColor } from '../../utils/format';

interface StatusBadgeProps {
  status: string;
  customLabel?: string;
  customColor?: 'green' | 'amber' | 'red' | 'cyan' | 'blue' | 'muted';
  size?: 'sm' | 'md';
  className?: string;
}

const colorMap: Record<string, string> = {
  green: 'badge-green',
  amber: 'badge-amber',
  red: 'badge-red',
  cyan: 'badge-cyan',
  blue: 'badge-blue',
  muted: 'badge-muted',
};

const sizeMap: Record<string, string> = {
  sm: 'text-xs',
  md: 'text-sm',
};

export default function StatusBadge({
  status,
  customLabel,
  customColor,
  size = 'sm',
  className = '',
}: StatusBadgeProps) {
  const label = customLabel || getStatusLabel(status);
  const color = customColor || getStatusColor(status);
  const badgeClass = colorMap[color] || 'badge-muted';

  return (
    <span className={`badge ${badgeClass} ${sizeMap[size]} ${className}`}>
      {label}
    </span>
  );
}
