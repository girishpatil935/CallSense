import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Activity, AudioLines } from 'lucide-react';
import { getLikelihoodBuckets } from '../lib/callMetrics';

const SENTIMENT_COLORS = ['#65D6A6', '#9B7A9C', '#F08A9B'];
const TOOLTIP_STYLE = { background: '#231C27', border: '1px solid #493c4c', borderRadius: 10, color: '#F5F0F6', fontSize: 12 };

export function SentimentChart({ counts, reducedMotion = false }) {
  const data = [
    { name: 'Positive', value: counts.Positive || 0 },
    { name: 'Neutral', value: counts.Neutral || 0 },
    { name: 'Negative', value: counts.Negative || 0 },
  ];
  const total = data.reduce((sum, item) => sum + item.value, 0);
  return (
    <article className="panel chart-panel">
      <div className="panel-heading"><div><span className="eyebrow">CONVERSATION TONE</span><h2>Sentiment distribution</h2></div><span className="panel-icon"><Activity size={16} /></span></div>
      {total ? <div className="sentiment-chart-layout"><div className="donut-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius="69%" outerRadius="90%" paddingAngle={4} stroke="none" isAnimationActive={!reducedMotion} animationDuration={reducedMotion ? 0 : 500}>{data.map((entry, index) => <Cell key={entry.name} fill={SENTIMENT_COLORS[index]} />)}</Pie><Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value, name) => [`${value} calls`, name]} /></PieChart></ResponsiveContainer><div className="donut-center"><strong>{total}</strong><small>calls</small></div></div><div className="chart-legend">{data.map((entry, index) => <div key={entry.name} className="legend-row"><span><i style={{ background: SENTIMENT_COLORS[index] }} />{entry.name}</span><strong>{entry.value}<small>{total ? ` · ${Math.round(entry.value / total * 100)}%` : ''}</small></strong></div>)}</div></div> : <div className="chart-empty"><Activity size={19} /><span>Sentiment values are not available from the current API response.</span></div>}
      <div className="chart-footnote">Sentiment is a separate model output, not a purchase-intent score.</div>
    </article>
  );
}

export function LikelihoodChart({ calls, reducedMotion = false }) {
  const buckets = getLikelihoodBuckets(calls);
  const total = buckets.reduce((sum, item) => sum + item.count, 0);
  return (
    <article className="panel chart-panel">
      <div className="panel-heading"><div><span className="eyebrow">BUYING SIGNAL</span><h2>Estimated purchase likelihood</h2></div><span className="panel-icon"><AudioLines size={16} /></span></div>
      {total ? <div className="bar-chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={buckets} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}><CartesianGrid stroke="#332A36" strokeDasharray="3 5" vertical={false} /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#A69BA9', fontSize: 10 }} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#7f7483', fontSize: 10 }} /><Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => [`${value} calls`, 'Calls']} cursor={{ fill: 'rgba(216,165,210,.06)' }} /><Bar dataKey="count" fill="#9B7A9C" radius={[6, 6, 0, 0]} maxBarSize={48} isAnimationActive={!reducedMotion} animationDuration={reducedMotion ? 0 : 500} /></BarChart></ResponsiveContainer></div> : <div className="chart-empty"><AudioLines size={19} /><span>No estimated likelihood values were returned by the backend.</span></div>}
      <div className="chart-footnote">Directional backend estimates grouped for display; not validated or calibrated probabilities.</div>
    </article>
  );
}
