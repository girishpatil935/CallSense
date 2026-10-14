import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCall, formatDuration } from '../src/lib/normalizeCall.js';

test('normalizes the FastAPI call schema into the Manus dashboard model', () => {
  const call = normalizeCall({
    id: 'CALL-001', customer: 'Priya Sharma', title: 'Premium plan inquiry',
    date: '2026-10-14', duration: '02:18', transcript: 'Synthetic call transcript',
    audio: 'call-001.wav', demo_data: true,
    analysis: {
      sentiment: 'Positive', sentiment_scores: { Positive: 0.7, Neutral: 0.2, Negative: 0.1 },
      purchase_probability: 81, key_insights: ['A real backend insight.'],
      behavioral_signals: ['Asked for a proposal.'], recommended_action: 'Send it.',
      analysis_method: 'Transparent lexical fallback', confidence_note: 'Heuristic estimate.',
    },
  });

  assert.equal(call.id, 'CALL-001');
  assert.equal(call.customerName, 'Priya Sharma');
  assert.equal(call.durationSeconds, 138);
  assert.equal(formatDuration(call.durationSeconds), '2:18');
  assert.equal(call.audioUrl, '/api/calls/CALL-001/audio');
  assert.equal(call.sentiment, 'Positive');
  assert.equal(call.purchaseProbability, 81);
  assert.deepEqual(call.behaviorSignals, ['Asked for a proposal.']);
  assert.equal(call.analysisMethod, 'Transparent lexical fallback');
  assert.equal(call.confidenceNote, 'Heuristic estimate.');
  assert.equal(call.isSyntheticDemo, true);
});

test('normalizes the local recording sentiment model and measured segment shares', () => {
  const call = normalizeCall({
    id: 'REAL-AUDIO-001', customer: 'Rahul', audio: 'Demo Audio.mp4',
    is_synthetic_demo: false,
    sentiment_model: 'distilbert/distilbert-base-uncased-finetuned-sst-2-english',
    analysis: {
      sentiment: 'Positive',
      sentiment_scores: { Positive: 0.5238, Negative: 0.4762 },
      sentiment_model: 'distilbert/distilbert-base-uncased-finetuned-sst-2-english',
    },
  });

  assert.equal(call.id, 'REAL-AUDIO-001');
  assert.equal(call.audioUrl, '/api/calls/REAL-AUDIO-001/audio');
  assert.equal(call.sentiment, 'Positive');
  assert.equal(call.sentimentScores.positive, 0.5238);
  assert.equal(call.sentimentScores.negative, 0.4762);
  assert.equal(call.modelName, 'distilbert/distilbert-base-uncased-finetuned-sst-2-english');
  assert.equal(call.isSyntheticDemo, false);
});
