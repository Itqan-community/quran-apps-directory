function SkeletonCard() {
  return (
    <article className="app-card shimmer-card" aria-hidden="true">
      <div className="card-cover">
        <div className="shimmer-block" />
      </div>
      <div className="card-body">
        <div className="app-info">
          <div className="shimmer-icon" />
          <div className="shimmer-text-group">
            <div className="shimmer-line shimmer-title" />
            <div className="shimmer-line shimmer-desc" />
            <div className="shimmer-line shimmer-meta" />
          </div>
        </div>
        <div className="skeleton-tag-row">
          <div className="shimmer-line skeleton-tag" />
          <div className="shimmer-line skeleton-tag skeleton-tag--short" />
        </div>
        <div className="skeleton-stats-row">
          <div className="shimmer-line skeleton-stat" />
          <div className="shimmer-line skeleton-stat" />
        </div>
        <div className="skeleton-actions-row">
          <div className="shimmer-block skeleton-action" />
          <div className="shimmer-block skeleton-action skeleton-action--primary" />
        </div>
      </div>
    </article>
  );
}

/** Card-only loading state; the page shell (hero) stays visible. */
export function ListingCardsSkeleton() {
  return (
    <div className="main-content" aria-hidden="true">
      <div className="apps-grid">
        {Array.from({ length: 8 }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
    </div>
  );
}
