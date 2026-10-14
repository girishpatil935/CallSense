const defaultApiBase = import.meta.env.DEV ? 'http://127.0.0.1:8000' : '';
const configuredBase = import.meta.env.VITE_API_BASE_URL ?? defaultApiBase;
export const API_BASE_URL = configuredBase.replace(/\/+$/, '');

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: { Accept: 'application/json', ...(options.headers || {}) },
    });
  } catch {
    throw new Error(`Could not reach the CallSense API at ${API_BASE_URL || 'this origin'}. Check the backend and CORS configuration.`);
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    const suffix = detail && detail.length < 180 ? ` — ${detail}` : '';
    throw new Error(`CallSense API returned ${response.status} for ${path}${suffix}`);
  }
  return response;
}

export async function checkBackendHealth() {
  const response = await request('/api/health');
  return response.json().catch(() => ({ ok: true }));
}

export async function fetchCalls() {
  const response = await request('/api/calls');
  const payload = await response.json();
  const records = Array.isArray(payload)
    ? payload
    : payload?.calls ?? payload?.items ?? payload?.data;
  if (!Array.isArray(records)) throw new Error('The calls endpoint returned an unsupported response shape. Check the API contract and update the frontend adapter.');
  if (typeof payload?.demo_data !== 'boolean') return records;
  return records.map((record) => record && typeof record === 'object' && typeof record.demo_data !== 'boolean'
    ? { ...record, demo_data: payload.demo_data }
    : record);
}

export async function fetchCallDetail(callId) {
  const id = encodeURIComponent(String(callId));
  const response = await request(`/api/calls/${id}`);
  const payload = await response.json();
  return payload?.call ?? payload?.data ?? payload;
}

export function getAudioSource(call) {
  if (!call?.audioUrl) return null;
  try {
    const base = API_BASE_URL ? `${API_BASE_URL}/` : globalThis.location?.origin;
    if (!base) return null;
    const url = new URL(call.audioUrl, base);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function getFilenameFromDisposition(disposition, fallback) {
  if (!disposition) return fallback;
  const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) {
    try { return decodeURIComponent(encoded.replace(/^"|"$/g, '')); } catch { /* use plain filename */ }
  }
  const plain = disposition.match(/filename="?([^";]+)"?/i)?.[1];
  return plain || fallback;
}

export async function downloadCallReport(callId) {
  const id = encodeURIComponent(String(callId));
  const response = await request(`/api/calls/${id}/report`, { headers: { Accept: 'application/pdf, application/octet-stream' } });
  const blob = await response.blob();
  const fallbackName = `callsense-${id}-report.pdf`;
  return { blob, filename: getFilenameFromDisposition(response.headers.get('content-disposition'), fallbackName) };
}
