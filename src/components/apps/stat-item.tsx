export function StatItem({
  value,
  label,
  iconSrc,
}: {
  value: string;
  label: string;
  iconSrc?: string;
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
        <span className="stat-value">
          {value}
        </span>
      </div>
      <span className="stat-label">{label}</span>
    </div>
  );
}
