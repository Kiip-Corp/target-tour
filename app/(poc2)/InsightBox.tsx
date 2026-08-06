export default function InsightBox({ items }: { items: string[] }) {
  return (
    <div
      style={{
        background: "#F4F8F6",
        border: "1px solid #D6E7E1",
        borderRadius: 10,
        padding: "14px 18px",
        marginBottom: 20,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, color: "#0E7C6B", letterSpacing: "0.04em", marginBottom: 8 }}>
        시사점
      </div>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.7, color: "#25303B" }}>
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
