export function CategoryIcon({ svg, size = 18 }: { svg: string | null; size?: number }) {
  return (
    <span
      className="chip-icon"
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svg ?? "" }}
    />
  );
}
