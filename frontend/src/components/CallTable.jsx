import { ArrowDownUp, ArrowUpRight, Download, MoreHorizontal } from 'lucide-react';
import { formatDate, formatDuration, formatPercent } from '../lib/normalizeCall';

export function SentimentBadge({ value }) {
  if (!value) return <span className="sentiment-badge unknown">Not scored</span>;
  return <span className={`sentiment-badge ${value.toLowerCase()}`}><i />{value}</span>;
}

export function Likelihood({ value, compact = false }) {
  return <span className={`likelihood-cell ${compact ? 'is-compact' : ''}`}><span className="likelihood-track"><i style={{ width: value === null ? '0%' : `${value}%` }} /></span><strong>{formatPercent(value)}</strong></span>;
}

export default function CallTable({ calls, onSelect, onReport, reportBusyId, density = 'comfortable', emptyTitle = 'No calls match this view', compact = false }) {
  if (!calls?.length) return <div className="table-empty"><span className="empty-table-icon"><ArrowDownUp size={17} /></span><strong>{emptyTitle}</strong><p>Adjust the search or filters, or refresh the backend data.</p></div>;
  return (
    <div className={`table-frame density-${density}`}>
      <table className="call-table">
        <thead><tr><th>Customer / call</th><th>Date</th><th>Sentiment</th><th>Estimated purchase likelihood</th><th>{compact ? 'Duration' : 'Follow-up'}</th><th><span className="sr-only">Actions</span></th></tr></thead>
        <tbody>{calls.map((call) => (
          <tr key={`${call.id}-${call.sourceIndex}`}>
            <td><button className="customer-link" onClick={() => onSelect(call)}><span className="avatar-orbit">{call.customerName.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span><span className="customer-meta"><strong>{call.customerName}</strong><small>{call.id || 'ID unavailable'}{call.title ? ` · ${call.title}` : ''}</small>{call.isSyntheticDemo === false && <span className="real-audio-label">REAL AUDIO</span>}</span></button></td>
            <td><span className="table-date">{formatDate(call.date)}</span></td>
            <td><SentimentBadge value={call.sentiment} /></td>
            <td><Likelihood value={call.purchaseProbability} compact /></td>
            <td>{compact ? <span className="table-date">{formatDuration(call.durationSeconds)}</span> : call.followUpRequired === null ? <span className="muted-value">Not provided</span> : call.followUpRequired ? <span className="followup-pill"><i />Follow up</span> : <span className="muted-value">No follow-up</span>}</td>
            <td><div className="row-actions"><button className="icon-button row-detail" aria-label={`Open ${call.customerName} call details`} title="Open call details" onClick={() => onSelect(call)}><ArrowUpRight size={16} /></button><button className="icon-button row-report" aria-label={`Download ${call.customerName} PDF report`} title="Download PDF report" onClick={() => onReport(call)} disabled={!call.id || reportBusyId === call.id}>{reportBusyId === call.id ? <span className="tiny-spinner" /> : <Download size={15} />}</button><button className="icon-button row-more" aria-label={`Open ${call.customerName} call details`} title="Call details" onClick={() => onSelect(call)}><MoreHorizontal size={16} /></button></div></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}
