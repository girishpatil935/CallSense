import { useEffect, useState } from 'react';
import { AlertCircle, ArrowUpRight, Download, FileAudio2, FileText, ListChecks, MessageSquareText, Sparkles, X } from 'lucide-react';
import AudioPlayer from './AudioPlayer';
import { SentimentBadge, Likelihood } from './CallTable';
import { formatDate, formatDuration } from '../lib/normalizeCall';
import { getAudioSource } from '../lib/api';

function DetailList({ title, items, icon: Icon, empty = 'Not provided by the backend.' }) {
  return <section className="detail-section"><div className="detail-section-title"><Icon size={15} /><h3>{title}</h3></div>{items?.length ? <ul className="detail-list">{items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul> : <p className="detail-muted">{empty}</p>}</section>;
}

export default function CallDetailPanel({ call, busy, detailNote, onClose, onReport, reportBusy }) {
  const [expanded, setExpanded] = useState(false);
  const transcript = call?.transcript || '';
  const canExpand = transcript.length > 440;
  useEffect(() => { setExpanded(false); }, [call?.id]);
  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  if (!call) return null;
  const audioSource = getAudioSource(call);

  return (
    <div className="detail-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside className="detail-panel" role="dialog" aria-modal="true" aria-labelledby="detail-title">
        <header className="detail-head"><div><span className="eyebrow">CALL INTELLIGENCE</span><h2 id="detail-title">Call details</h2></div><button className="icon-button" onClick={onClose} aria-label="Close call details" title="Close"><X size={18} /></button></header>
        <div className="detail-scroll">
          <section className="detail-profile"><div className="detail-avatar">{call.customerName.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div><div className="detail-customer"><h3>{call.customerName}</h3><span>{call.id || 'Call ID unavailable'}{call.title ? ` · ${call.title}` : ''}</span></div><button className="report-button detail-report" onClick={() => onReport(call)} disabled={!call.id || reportBusy} title="Download the actual PDF for this call"><span>{reportBusy ? 'Preparing…' : 'Download report'}</span><Download size={15} /></button></section>
          <div className="detail-meta-grid"><div><span>Sentiment</span><SentimentBadge value={call.sentiment} /></div><div><span>Estimated purchase likelihood</span><Likelihood value={call.purchaseProbability} compact /></div><div><span>Date</span><strong>{formatDate(call.date)}</strong></div><div><span>Duration</span><strong>{formatDuration(call.durationSeconds)}</strong></div></div>
          {detailNote && <div className="detail-note"><AlertCircle size={14} />{detailNote}</div>}
          {busy && <div className="detail-loading"><span className="tiny-spinner" /> Checking optional call-detail endpoint…</div>}
          <AudioPlayer src={audioSource} durationSeconds={call.durationSeconds} customerName={call.customerName} isSyntheticDemo={call.isSyntheticDemo !== false} />
          {call.modelName && <section className="detail-section"><div className="detail-section-title"><FileText size={15} /><h3>Sentiment model</h3></div><p className="detail-muted">{call.modelName}</p>{Object.entries(call.sentimentScores || {}).some(([, value]) => value !== null) && <p className="detail-muted">Segment shares: {Object.entries(call.sentimentScores).filter(([, value]) => value !== null).map(([name, value]) => `${name} ${Math.round((value <= 1 ? value * 100 : value))}%`).join(' · ')}</p>}</section>}
          <section className="detail-section transcript-section"><div className="detail-section-title"><MessageSquareText size={15} /><h3>Transcript</h3>{transcript && <span className="transcript-count">{transcript.trim().split(/\s+/).filter(Boolean).length} words</span>}</div>{transcript ? <><p className={`transcript-text ${canExpand && !expanded ? 'is-collapsed' : ''}`}>{transcript}</p>{canExpand && <button className="text-action" onClick={() => setExpanded((value) => !value)}>{expanded ? 'Show less' : 'Read full transcript'} <ArrowUpRight size={13} /></button>}</> : <p className="detail-muted">Transcript not provided by the backend.</p>}</section>
          <div className="detail-section-grid"><DetailList title="Key insights" items={call.keyInsights} icon={Sparkles} /><DetailList title="Buying signals & behavior" items={call.behaviorSignals} icon={ListChecks} /></div>
          <DetailList title="Objections & hesitation" items={call.objections} icon={AlertCircle} empty="No objection data was provided." />
          <section className="next-action-card"><div className="detail-section-title"><ArrowUpRight size={15} /><h3>Recommended next action</h3></div><p>{call.recommendedAction || 'No recommended action was returned for this call.'}</p></section>
          {call.analysisMethod && <p className="method-note"><FileText size={13} />Analysis method: {call.analysisMethod}</p>}
          {call.confidenceNote && <p className="method-note">{call.confidenceNote}</p>}
          <div className="detail-disclosure"><FileAudio2 size={14} />Call data and likelihood estimates are supplied by the backend. Estimates are directional and are not calibrated probabilities.</div>
        </div>
      </aside>
    </div>
  );
}
