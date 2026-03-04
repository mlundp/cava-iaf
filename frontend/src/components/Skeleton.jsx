export default function Skeleton({ rows = 5 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 4 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div className="skeleton-line" style={{ width: '30%', height: 14 }} />
          <div className="skeleton-line" style={{ width: '20%', height: 14 }} />
          <div className="skeleton-line" style={{ width: '15%', height: 14 }} />
          <div className="skeleton-line" style={{ width: '15%', height: 14, marginLeft: 'auto' }} />
        </div>
      ))}
    </div>
  );
}
