type Kind = "submission" | "app";

const SUBMISSION_STATUSES: Record<string, { label: string; color: string }> = {
  pending: { label: "قيد الانتظار", color: "bg-amber-500" },
  under_review: { label: "قيد المراجعة", color: "bg-blue-500" },
  info_requested: { label: "طلب معلومات", color: "bg-purple-500" },
  approved: { label: "تمت الموافقة", color: "bg-green-600" },
  rejected: { label: "مرفوض", color: "bg-red-500" },
};

const APP_STATUSES: Record<string, { label: string; color: string }> = {
  draft: { label: "مسودة", color: "bg-gray-500" },
  published: { label: "منشور", color: "bg-green-600" },
  archived: { label: "مؤرشف", color: "bg-amber-700" },
};

export default function StatusBadge({ status, kind }: { status: string; kind: Kind }) {
  const map = kind === "app" ? APP_STATUSES : SUBMISSION_STATUSES;
  const known = map[status];

  return (
    <span
      data-testid="apps-status-badge"
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white ${
        known ? known.color : "bg-gray-400"
      }`}
    >
      {known ? known.label : status}
    </span>
  );
}
