import { useEffect } from 'react';
import { Activity, AudioLines, BarChart3, ChevronLeft, ChevronRight, CircleHelp, FileText, Headphones, LayoutDashboard, Menu, Search, Settings2, Sparkles, X, RefreshCw, SlidersHorizontal } from 'lucide-react';

export const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'calls', label: 'Call Records', icon: Headphones },
  { id: 'sentiment', label: 'Sentiment Analysis', icon: Activity },
  { id: 'purchase', label: 'Purchase Intelligence', icon: AudioLines },
  { id: 'reports', label: 'Insights & Reports', icon: FileText },
];
const PAGE_META = {
  overview: ['Overview', 'A clearer signal from every conversation.'],
  calls: ['Call records', 'Search, sort and inspect analyzed conversations.'],
  sentiment: ['Sentiment analysis', 'Conversation tone, measured separately from buying intent.'],
  purchase: ['Purchase intelligence', 'Evidence-led estimates for your next follow-up.'],
  reports: ['Insights & reports', 'Review the signals and download a call report.'],
  settings: ['Preferences', 'Tune the workspace to the way you work.'],
  help: ['Help & about', 'What CallSense measures — and what it does not.'],
};

function Brand() {
  return <div className="brand-lockup"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span className="brand-name">Call<span>Sense</span></span></div>;
}

export function AppShell({ children, page, onNavigate, collapsed, onToggleCollapsed, mobileOpen, onToggleMobile, search, onSearch, sentimentFilter, onSentimentFilter, sortBy, onSortBy, onRefresh, loading, health, sentimentEngine, callsCount }) {
  const [title, subtitle] = PAGE_META[page] || PAGE_META.overview;
  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape' && mobileOpen) onToggleMobile(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen, onToggleMobile]);

  const navButtons = (items) => items.map(({ id, label, icon: Icon }) => (
    <button key={id} className={`nav-link ${page === id ? 'active' : ''}`} onClick={() => onNavigate(id)} title={collapsed ? label : undefined} aria-current={page === id ? 'page' : undefined}>
      <Icon size={18} strokeWidth={1.8} /><span>{label}</span><span className="nav-active-dot" />
    </button>
  ));

  return (
    <div className="app-shell">
      {mobileOpen && <button aria-label="Close navigation" className="drawer-scrim" onClick={() => onToggleMobile(false)} />}
      <aside className={`sidebar ${collapsed ? 'is-collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-head"><Brand /><button className="icon-button mobile-close" aria-label="Close navigation" title="Close navigation" onClick={() => onToggleMobile(false)}><X size={17} /></button></div>
        <div className="workspace-label"><span className="workspace-orbit"><Sparkles size={13} /></span><span>INTELLIGENCE</span></div>
        <nav className="nav-group" aria-label="Main navigation">{navButtons(NAV_ITEMS)}</nav>
        <div className="nav-divider" />
        <div className="workspace-label"><span>WORKSPACE</span></div>
        <nav className="nav-group" aria-label="Workspace navigation">{navButtons([
          { id: 'settings', label: 'Settings', icon: Settings2 },
          { id: 'help', label: 'Help & About', icon: CircleHelp },
        ])}</nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-demo"><div className="demo-glint" /><span className="demo-kicker">DATA ENVIRONMENT</span><strong><i className="status-dot" /> Demo Data</strong><small>Synthetic sample calls</small></div>
        <button className="collapse-button" onClick={onToggleCollapsed} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /><span>Collapse sidebar</span></>}
        </button>
      </aside>

      <section className="main-shell">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Open navigation" title="Open navigation" onClick={() => onToggleMobile(true)}><Menu size={19} /></button>
          <div className="topbar-title"><div className="breadcrumb"><span>CALLSENSE AI</span><span className="breadcrumb-slash">/</span><b>{title}</b></div><p>{subtitle}</p></div>
          <div className="topbar-tools">
            {['overview', 'calls', 'sentiment', 'purchase', 'reports'].includes(page) && <>
              <label className="search-box"><Search size={16} /><span className="sr-only">Search calls by customer, ID or transcript</span><input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search calls…" /></label>
              <label className="select-wrap" title="Filter by sentiment"><SlidersHorizontal size={15} /><span className="sr-only">Sentiment filter</span><select value={sentimentFilter} onChange={(event) => onSentimentFilter(event.target.value)}><option value="All">All sentiment</option><option value="Positive">Positive</option><option value="Neutral">Neutral</option><option value="Negative">Negative</option></select></label>
              <label className="select-wrap sort-select"><span className="sr-only">Sort calls</span><select value={sortBy} onChange={(event) => onSortBy(event.target.value)} aria-label="Sort calls"><option value="date">Newest first</option><option value="sentiment">Sentiment</option><option value="likelihood">Likelihood</option></select></label>
            </>}
            <div className={`api-indicator ${health === 'online' ? 'is-online' : health === 'offline' ? 'is-offline' : ''}`} title={health === 'online' ? `Backend connected · ${sentimentEngine || 'engine status unavailable'} · ${callsCount ?? 0} calls loaded` : health === 'offline' ? 'Backend unavailable' : 'Checking backend'}><i className="status-dot" /><span>{health === 'online' ? `API · ${sentimentEngine || 'engine status unavailable'}` : health === 'offline' ? 'API unavailable' : 'Connecting'}</span></div>
            <button className="icon-button refresh-button" onClick={onRefresh} disabled={loading} aria-label="Refresh data" title="Refresh data"><RefreshCw size={16} className={loading ? 'spin' : ''} /></button>
          </div>
        </header>
        <main className="page-content" key={page}>{children}</main>
        <footer className="app-footer"><span><span className="footer-pulse" /> CallSense AI <span className="footer-sep">·</span> Demo Data</span><span>{health === 'online' ? `Backend connected · ${sentimentEngine || 'engine status unavailable'}` : 'Waiting for backend connection'}</span></footer>
      </section>
    </div>
  );
}
