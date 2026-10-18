export function StatItem({
  value,
  label,
  iconSrc,
  icon,
  title,
}: {
  value: React.ReactNode;
  label: string;
  iconSrc?: string;
  icon?: React.ReactNode;
  title?: string;
}) {
  return (
    <div className="stat-item">
      <div>
        {iconSrc && (
          <span className="stat-icon">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={iconSrc} alt="" />
          </span>
        )}
        {icon && <span className="stat-icon">{icon}</span>}
        <span className="stat-value" title={title}>
          {value}
        </span>
      </div>
      <span className="stat-label">{label}</span>
    </div>
  );
}
