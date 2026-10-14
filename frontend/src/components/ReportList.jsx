import { CalendarDays, Download, FileText } from 'lucide-react';
import { formatDate, formatPercent } from '../lib/normalizeCall';
import { SentimentBadge } from './CallTable';

export default function ReportList({ calls, onDownload, busyId }) {
  if (!calls.length) return <div className="table-empty"><FileText size={18} /><strong>No reports available in this view</strong><p>The backend has not returned any calls.</p></div>;
  return <div className="report-list">{calls.map((call) => (
    <article className="report-row" key={`${call.id}-${call.sourceIndex}`}>
      <span className="report-file-icon"><FileText size={18} /></span><div className="report-customer"><strong>{call.customerName}</strong><small>{call.id || 'Call ID unavailable'}</small></div><div className="report-date"><CalendarDays size={14} /><span>{formatDate(call.date)}</span></div><SentimentBadge value={call.sentiment} /><span className="report-likelihood"><small>Estimated</small>{formatPercent(call.purchaseProbability)}</span>
      <button className="button button-outline download-cta" onClick={() => onDownload(call)} disabled={!call.id || busyId === call.id}>{busyId === call.id ? <><span className="tiny-spinner" />Preparing</> : <><Download size={15} />Download PDF</>}</button>
    </article>
  ))}</div>;
}
