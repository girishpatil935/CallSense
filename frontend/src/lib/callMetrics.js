export function filterAndSortCalls(calls, { query = '', sentiment = 'All', sortBy = 'date' } = {}) {
  const term = query.trim().toLowerCase();
  const filtered = calls.filter((call) => {
    const matchesText = !term || [call.customerName, call.id, call.title, call.transcript].some((value) => String(value || '').toLowerCase().includes(term));
    return matchesText && (sentiment === 'All' || call.sentiment === sentiment);
  });
  return filtered.sort((a, b) => {
    if (sortBy === 'likelihood') return (b.purchaseProbability ?? -1) - (a.purchaseProbability ?? -1);
    if (sortBy === 'sentiment') return (a.sentiment || 'ZZZ').localeCompare(b.sentiment || 'ZZZ');
    return dateValue(b.date) - dateValue(a.date);
  });
}

function dateValue(value) {
  if (!value) return -Infinity;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : -Infinity;
}

export function getMetrics(calls) {
  const sentiment = { Positive: 0, Neutral: 0, Negative: 0 };
  calls.forEach((call) => { if (call.sentiment) sentiment[call.sentiment] += 1; });
  const scored = calls.map((call) => call.purchaseProbability).filter((value) => value !== null && value !== undefined && Number.isFinite(value));
  const followUpKnown = calls.some((call) => call.followUpRequired !== null);
  return {
    total: calls.length,
    sentiment,
    averageLikelihood: scored.length ? scored.reduce((sum, value) => sum + value, 0) / scored.length : null,
    scoredCount: scored.length,
    followUpCount: followUpKnown ? calls.filter((call) => call.followUpRequired === true).length : null,
    followUpKnown,
  };
}

export function getLikelihoodBuckets(calls) {
  const buckets = [
    { name: 'Lower · 0–39%', count: 0, range: 'lower' },
    { name: 'Mid · 40–69%', count: 0, range: 'mid' },
    { name: 'Higher · 70–100%', count: 0, range: 'higher' },
  ];
  calls.forEach(({ purchaseProbability }) => {
    if (purchaseProbability === null || purchaseProbability === undefined) return;
    const bucket = purchaseProbability < 40 ? 0 : purchaseProbability < 70 ? 1 : 2;
    buckets[bucket].count += 1;
  });
  return buckets;
}

export function getCallEvidenceCount(call) {
  return (call.evidence?.length || 0) + (call.behaviorSignals?.length || 0) + (call.keyInsights?.length || 0);
}
