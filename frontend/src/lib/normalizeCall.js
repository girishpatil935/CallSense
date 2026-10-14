const first = (...values) => values.find((value) => value !== undefined && value !== null);
const text = (value) => (value === undefined || value === null || value === '' ? '' : String(value));
const list = (value) => {
  if (Array.isArray(value)) return value.map((item) => (typeof item === 'string' ? item : text(item?.text ?? item?.label ?? item?.description))).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return value.split(/\n|•|;(?=\s)/).map((item) => item.trim()).filter(Boolean);
  return [];
};
const numeric = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const sentimentLabel = (value) => {
  const raw = text(value).toLowerCase();
  if (raw.includes('pos')) return 'Positive';
  if (raw.includes('neg')) return 'Negative';
  if (raw.includes('neu') || raw.includes('mixed')) return 'Neutral';
  return null;
};
const probabilityPercent = (value) => {
  const score = numeric(value);
  if (score === null) return null;
  // The API may expose a ratio or a percentage. Convert units only; never infer a score.
  const percent = score >= 0 && score <= 1 ? score * 100 : score;
  return percent >= 0 && percent <= 100 ? percent : null;
};
const boolOrNull = (value) => {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === 'true' || value === 'yes') return true;
  if (value === 0 || value === 'false' || value === 'no') return false;
  return null;
};

export function normalizeCall(record, index = 0) {
  const data = record && typeof record === 'object' ? record : {};
  const analysis = data.analysis && typeof data.analysis === 'object' ? data.analysis : {};
  const details = data.details && typeof data.details === 'object' ? data.details : {};
  const sentiment = sentimentLabel(first(data.sentiment, data.sentiment_label, data.sentimentLabel, analysis.sentiment, analysis.sentiment_label));
  const rawScores = first(data.sentiment_scores, data.sentimentScores, analysis.sentiment_scores, analysis.sentimentScores, {});
  const audio = first(data.audio_url, data.audioUrl, data.recording_url, data.recordingUrl, data.audio_path, data.audioPath, data.recording_path);
  const callId = first(data.call_id, data.callId, data.id, data.uuid);
  const rawDuration = first(data.duration_seconds, data.durationSeconds, data.duration, details.duration_seconds);
  const duration = typeof rawDuration === 'string' && /^\d+:\d{2}$/.test(rawDuration.trim())
    ? rawDuration.trim().split(':').reduce((total, part) => total * 60 + Number(part), 0)
    : numeric(rawDuration);
  const audioUrl = text(audio) || (data.audio && callId ? `/api/calls/${encodeURIComponent(String(callId))}/audio` : '');
  const followUp = boolOrNull(first(data.follow_up_required, data.followUpRequired, data.requires_follow_up, data.needs_follow_up, data.needsFollowUp));
  const likelihood = probabilityPercent(first(data.purchase_likelihood, data.purchaseLikelihood, data.purchase_probability, data.purchaseProbability, data.purchase_intent_score, analysis.purchase_likelihood, analysis.purchase_probability));
  const scoreObj = rawScores && typeof rawScores === 'object' ? rawScores : {};

  return {
    id: text(callId),
    customerName: text(first(data.customer_name, data.customerName, data.customer, data.name)) || 'Unknown customer',
    title: text(first(data.title, data.call_title, data.callTitle)),
    date: text(first(data.date, data.call_date, data.callDate, data.created_at, data.timestamp)),
    durationSeconds: duration,
    sentiment,
    sentimentScores: {
      positive: numeric(first(scoreObj.positive, scoreObj.Positive)),
      neutral: numeric(first(scoreObj.neutral, scoreObj.Neutral)),
      negative: numeric(first(scoreObj.negative, scoreObj.Negative)),
    },
    purchaseProbability: likelihood,
    transcript: text(first(data.transcript, data.full_transcript, data.fullTranscript, details.transcript)),
    keyInsights: list(first(data.key_insights, data.keyInsights, data.insights, analysis.key_insights, analysis.insights)),
    behaviorSignals: list(first(data.behavioral_signals, data.behavioralSignals, data.behavior_signals, data.behaviorSignals, data.buying_signals, data.buyingSignals, analysis.behavioral_signals, analysis.behavioralSignals, analysis.behavior_signals, analysis.buying_signals)),
    objections: list(first(data.objections, data.pricing_objections, data.pricingObjections, data.hesitations, analysis.objections)),
    evidence: list(first(data.purchase_evidence, data.purchaseEvidence, data.evidence, analysis.purchase_evidence)),
    recommendedAction: text(first(data.recommended_action, data.recommendedAction, data.next_action, data.nextAction, analysis.recommended_action)),
    audioUrl,
    reportUrl: text(first(data.report_url, data.reportUrl)),
    analysisMethod: text(first(data.analysis_method, data.analysisMethod, analysis.analysis_method, analysis.analysisMethod, analysis.method)),
    confidenceNote: text(first(data.confidence_note, data.confidenceNote, analysis.confidence_note, analysis.confidenceNote)),
    modelScore: numeric(first(data.model_score, data.modelScore, analysis.model_score, analysis.confidence_score)),
    modelName: text(first(data.sentiment_model, data.sentimentModel, analysis.sentiment_model, analysis.sentimentModel)),
    followUpRequired: followUp,
    isSyntheticDemo: boolOrNull(first(data.is_synthetic_demo, data.isSyntheticDemo, data.synthetic_demo, data.demo_data)),
    source: data,
    sourceIndex: index,
  };
}

export function formatDuration(seconds) {
  if (seconds === null || seconds === undefined || !Number.isFinite(Number(seconds))) return '—';
  const total = Math.max(0, Math.floor(Number(seconds)));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export function formatDate(value, options = { month: 'short', day: 'numeric', year: 'numeric' }) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? text(value) : new Intl.DateTimeFormat('en', options).format(date);
}

export function formatPercent(value) {
  return value === null || value === undefined ? '—' : `${Math.round(value)}%`;
}
