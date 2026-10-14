import { ArrowDownRight, ArrowUpRight, AudioLines } from 'lucide-react';

export default function MetricCard({ label, value, hint, icon: Icon = AudioLines, tone = 'pink', delta, detail }) {
  const Trend = delta?.direction === 'down' ? ArrowDownRight : ArrowUpRight;
  return (
    <article className={`metric-card metric-${tone}`}>
      <div className="metric-top"><span className="metric-icon"><Icon size={16} strokeWidth={1.8} /></span>{delta && <span className={`metric-delta ${delta.direction || 'up'}`}><Trend size={13} />{delta.label}</span>}</div>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value ?? '—'}</div>
      <div className="metric-foot"><span>{hint}</span>{detail && <span className="metric-detail">{detail}</span>}</div>
    </article>
  );
}
