export default function NotFound() {
  return (
    <div style={{ display: "flex", minHeight: "60vh", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", direction: "rtl" }}>
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 700 }}>٤٠٤ — الصفحة غير موجودة</h1>
        <p style={{ color: "#6c757d", marginTop: "0.5rem" }}>Page not found</p>
        <a href="/ar" style={{ color: "#a0533b", display: "inline-block", marginTop: "1rem" }}>
          العودة للرئيسية / Home
        </a>
      </div>
    </div>
  );
}
