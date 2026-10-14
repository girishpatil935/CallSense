import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { AppShell } from './components/AppShell';
import CallDetailPanel from './components/CallDetailPanel';
import { ErrorState, LoadingState, Toast } from './components/Feedback';
import { downloadCallReport, fetchCallDetail, fetchCalls, checkBackendHealth } from './lib/api';
import { filterAndSortCalls, getMetrics } from './lib/callMetrics';
import { normalizeCall } from './lib/normalizeCall';
import { CallsPage, HelpPage, OverviewPage, PurchasePage, ReportsPage, SentimentPage, SettingsPage } from './pages/WorkspacePages';

const readPreference = (key, fallback) => {
  try {
    const value = localStorage.getItem(`callsense.${key}`);
    return value === null ? fallback : JSON.parse(value);
  } catch { return fallback; }
};
const persistPreference = (key, value) => {
  try { localStorage.setItem(`callsense.${key}`, JSON.stringify(value)); } catch { /* storage may be disabled */ }
};

export default function App() {
  const [page, setPage] = useState('overview');
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [apiError, setApiError] = useState('');
  const [health, setHealth] = useState('checking');
  const [sentimentEngine, setSentimentEngine] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);
  const [query, setQuery] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState(() => readPreference('defaultSentiment', 'All'));
  const [sortBy, setSortBy] = useState('date');
  const [density, setDensityState] = useState(() => readPreference('density', 'comfortable'));
  const [collapsed, setCollapsedState] = useState(() => readPreference('sidebarCollapsed', false));
  const [reducedMotion, setReducedMotionState] = useState(() => readPreference('reducedMotion', false));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedCall, setSelectedCall] = useState(null);
  const [detailBusy, setDetailBusy] = useState(false);
  const [detailNote, setDetailNote] = useState('');
  const [reportBusyId, setReportBusyId] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => setToast({ message, type }), []);
  const setDensity = (value) => { setDensityState(value); persistPreference('density', value); };
  const setCollapsed = (value) => { setCollapsedState(value); persistPreference('sidebarCollapsed', value); };
  const setReducedMotion = (value) => { setReducedMotionState(value); persistPreference('reducedMotion', value); };
  const setDefaultSentiment = (value) => {
    setSentimentFilter(value);
    persistPreference('defaultSentiment', value);
  };

  useEffect(() => {
    document.documentElement.dataset.reducedMotion = reducedMotion ? 'true' : 'false';
  }, [reducedMotion]);
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 3800);
    return () => window.clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const onEscape = (event) => { if (event.key === 'Escape') setSelectedCall(null); };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setApiError('');
    const [callsResult] = await Promise.allSettled([fetchCalls()]);
    // Calls may initialize an explicitly enabled local model; check its final engine status afterward.
    const [healthResult] = await Promise.allSettled([checkBackendHealth()]);
    if (callsResult.status === 'fulfilled') {
      const normalized = callsResult.value.map((record, index) => normalizeCall(record, index));
      setCalls(normalized);
      setSelectedCall((current) => current ? normalized.find((call) => current.id ? call.id === current.id : call.sourceIndex === current.sourceIndex) || current : null);
    } else {
      setApiError(callsResult.reason?.message || 'The calls endpoint failed.');
    }
    setHealth(healthResult.status === 'fulfilled' ? 'online' : 'offline');
    setSentimentEngine(healthResult.status === 'fulfilled'
      ? (healthResult.value?.sentiment_engine === 'fallback' ? 'Lexical fallback' : healthResult.value?.sentiment_engine === 'local_transformer' ? 'Local transformer' : 'Engine status unavailable')
      : 'Unavailable');
    setHasLoaded(true);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData, refreshToken]);
  const visibleCalls = useMemo(() => filterAndSortCalls(calls, { query, sentiment: sentimentFilter, sortBy }), [calls, query, sentimentFilter, sortBy]);
  const recentCalls = useMemo(() => filterAndSortCalls(calls, { query, sentiment: sentimentFilter, sortBy: 'date' }).slice(0, 5), [calls, query, sentimentFilter]);
  const metrics = useMemo(() => getMetrics(visibleCalls), [visibleCalls]);

  const selectCall = useCallback(async (call) => {
    setSelectedCall(call);
    setDetailNote('');
    if (!call.id) {
      setDetailNote('This API record does not include a call ID, so the optional detail endpoint cannot be requested.');
      return;
    }
    setDetailBusy(true);
    try {
      const detail = await fetchCallDetail(call.id);
      setSelectedCall((current) => {
        if (!current || current.id !== call.id) return current;
        const merged = { ...(call.source || {}), ...(detail || {}) };
        return normalizeCall(merged, call.sourceIndex);
      });
    } catch {
      setDetailNote('Showing the call-list data. The optional per-call detail endpoint could not be loaded; verify its availability in the FastAPI backend.');
    } finally {
      setDetailBusy(false);
    }
  }, []);

  const handleReport = useCallback(async (call) => {
    if (!call?.id) {
      showToast('This call has no backend ID; the report cannot be requested.', 'error');
      return;
    }
    setReportBusyId(call.id);
    try {
      const { blob, filename } = await downloadCallReport(call.id);
      if (blob.type && !/application\/(pdf|octet-stream)/i.test(blob.type)) throw new Error('The report endpoint did not return a PDF file.');
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
      showToast(`Downloaded ${filename}`);
    } catch (error) {
      showToast(error?.message || 'Could not download the report. Check the backend report endpoint.', 'error');
    } finally {
      setReportBusyId('');
    }
  }, [showToast]);

  const onNavigate = useCallback((nextPage) => {
    setPage(nextPage);
    setMobileOpen(false);
    setSelectedCall(null);
  }, []);

  const retry = () => { setRefreshToken((value) => value + 1); };
  const pageContent = () => {
    const isDataView = ['overview', 'calls', 'sentiment', 'purchase', 'reports'].includes(page);
    if (isDataView && !hasLoaded && loading) return <div className="page-stack"><div className="section-heading"><div><span className="eyebrow">CONNECTING TO YOUR API</span><h2>Retrieving call records</h2><p>Loading live data from the configured backend.</p></div></div><LoadingState rows={5} /></div>;
    if (isDataView && apiError && calls.length === 0) return <div className="page-stack"><ErrorState message={apiError} onRetry={retry} /><div className="connection-note"><AlertCircle size={15} />No sample calls are shown while the API is unavailable.</div></div>;
    switch (page) {
      case 'calls': return <CallsPage calls={visibleCalls} onSelect={selectCall} onReport={handleReport} reportBusyId={reportBusyId} density={density} />;
      case 'sentiment': return <SentimentPage calls={visibleCalls} metrics={metrics} onSelect={selectCall} onReport={handleReport} reportBusyId={reportBusyId} density={density} reducedMotion={reducedMotion} />;
      case 'purchase': return <PurchasePage calls={visibleCalls} onSelect={selectCall} />;
      case 'reports': return <ReportsPage calls={visibleCalls} onReport={handleReport} reportBusyId={reportBusyId} />;
      case 'settings': return <SettingsPage density={density} setDensity={setDensity} collapsed={collapsed} setCollapsed={setCollapsed} defaultSentiment={sentimentFilter} setDefaultSentiment={setDefaultSentiment} reducedMotion={reducedMotion} setReducedMotion={setReducedMotion} />;
      case 'help': return <HelpPage />;
      default: return <OverviewPage calls={visibleCalls} recentCalls={recentCalls} metrics={metrics} loading={loading} onSelect={selectCall} onReport={handleReport} reportBusyId={reportBusyId} density={density} reducedMotion={reducedMotion} />;
    }
  };

  return <>
    <AppShell page={page} onNavigate={onNavigate} collapsed={collapsed} onToggleCollapsed={() => setCollapsed(!collapsed)} mobileOpen={mobileOpen} onToggleMobile={setMobileOpen} search={query} onSearch={setQuery} sentimentFilter={sentimentFilter} onSentimentFilter={setSentimentFilter} sortBy={sortBy} onSortBy={setSortBy} onRefresh={retry} loading={loading} health={health} sentimentEngine={sentimentEngine} callsCount={calls.length}>
      {apiError && calls.length > 0 && <ErrorState message={`Refresh failed; showing the previously loaded backend records. ${apiError}`} onRetry={retry} />}
      {pageContent()}
    </AppShell>
    {selectedCall && <CallDetailPanel call={selectedCall} busy={detailBusy} detailNote={detailNote} onClose={() => setSelectedCall(null)} onReport={(call) => handleReport(call)} reportBusy={reportBusyId === selectedCall.id} />}
    <Toast toast={toast} onClose={() => setToast(null)} />
  </>;
}
