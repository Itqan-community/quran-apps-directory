import type { ReactNode } from "react";

export function StatItem({
  value,
  label,
  icon,
}: {
  value: string;
  label: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-1">
        {icon}
        <span className="text-sm font-bold text-text">{value}</span>
      </div>
      <span className="text-xs text-text-secondary">{label}</span>
    </div>
  );
}
