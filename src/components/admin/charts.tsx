import type { DayCount } from "@/lib/repo/analytics";
import { adminBodyRow, adminHeadRow, adminTable, adminTableWrap, adminTh } from "@/components/admin/ui";

/** Normalized row for <RankTable>: label (+ optional LTR sub) and its view count. */
export type RankRow = {
  label: string;
  secondary?: string | null;
  /** ISO-style code (country/device) — rendered LTR inside the RTL table. */
  code?: boolean;
  views: number;
};

const CHART_W = 720;
const CHART_H = 190;

/** 30-day views as a pure SVG bar chart (server-rendered, no client JS). */
export function ViewsBar({ data }: { data: DayCount[] }) {
  const top = 8;
  const baseline = CHART_H - 26;
  const areaH = baseline - top;
  const max = Math.max(...data.map((d) => d.views), 1);
  const colW = CHART_W / data.length;
  const barW = Math.round(colW * 0.66);

  return (
    // dir="ltr": the SVG subtree stays LTR so the timeline runs left→right in the RTL page.
    <div dir="ltr">
      <svg
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        className="block w-full"
        role="img"
        aria-label={`الزيارات اليومية خلال آخر ${data.length} يومًا`}
      >
        {data.map((d, i) => {
          const h = d.views > 0 ? Math.max(2, Math.round((d.views / max) * areaH)) : 0;
          const x = Math.round(i * colW + (colW - barW) / 2);
          return (
            <rect
              key={d.day}
              x={x}
              y={baseline - h}
              width={barW}
              height={h}
              rx={2}
              className="fill-primary"
            >
              <title>{`${d.day}: ${d.views}`}</title>
            </rect>
          );
        })}
        <text x={0} y={CHART_H - 6} className="fill-text-secondary" fontSize="11">
          {data[0]?.day}
        </text>
        <text
          x={CHART_W}
          y={CHART_H - 6}
          className="fill-text-secondary"
          fontSize="11"
          textAnchor="end"
        >
          {data[data.length - 1]?.day}
        </text>
      </svg>
    </div>
  );
}

/** Shared ranked table (top apps / countries / devices) with proportional count bars. */
export function RankTable({
  rows,
  labelHeader = "الاسم",
  viewsHeader = "الزيارات",
}: {
  rows: RankRow[];
  labelHeader?: string;
  viewsHeader?: string;
}) {
  const max = Math.max(...rows.map((r) => r.views), 1);
  return (
    <div className={adminTableWrap}>
      <table className={adminTable}>
        <thead>
          <tr className={adminHeadRow}>
            <th scope="col" className="w-8 px-2 py-2 text-start font-medium">
              #
            </th>
            <th scope="col" className={adminTh}>
              {labelHeader}
            </th>
            <th scope="col" className={adminTh}>
              {viewsHeader}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={`${i}-${row.label}`} className={adminBodyRow}>
              <td className="px-2 py-2 tabular-nums text-text-secondary">{i + 1}</td>
              <td className="px-3 py-2">
                <span dir={row.code ? "ltr" : undefined} className="block text-text">
                  {row.label}
                </span>
                {row.secondary ? (
                  <span dir="ltr" className="block text-xs text-text-secondary">
                    {row.secondary}
                  </span>
                ) : null}
              </td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className="block h-2 w-40 max-w-full overflow-hidden rounded-full bg-surface"
                  >
                    <span
                      className="block h-full rounded-full bg-primary"
                      style={{ width: `${barPct(row.views, max)}%` }}
                    />
                  </span>
                  <span className="shrink-0 tabular-nums text-text">{row.views}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function barPct(views: number, max: number): number {
  const pct = Math.round((views / max) * 100);
  return views > 0 ? Math.max(4, pct) : 0;
}
