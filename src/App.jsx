import { useState } from 'react';
import Dashboard from './components/Dashboard';
import SiteDetail from './components/SiteDetail';
import AddSiteModal from './components/AddSiteModal';
import { Toaster } from 'react-hot-toast';
import { LayoutDashboard, PlusCircle, Globe, Activity } from 'lucide-react';

export default function App() {
  const [page, setPage]       = useState('dashboard');
  const [selectedSite, setSite] = useState(null);
  const [showAdd, setShowAdd]   = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const navigate = (p, site = null) => {
    setPage(p);
    setSite(site);
  };

  const onSiteAdded = () => {
    setShowAdd(false);
    setRefreshKey(k => k + 1);
  };

  return (
    <div className="app-shell">
      <Toaster position="top-right" toastOptions={{ style: { background: '#1a1a24', color: '#e2e8f0', border: '1px solid #2a2a3a' } }} />

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>⬡ WebWatch</h1>
          <span>Change Detection</span>
        </div>

        <nav>
          <div className={`nav-item ${page === 'dashboard' ? 'active' : ''}`}
               onClick={() => navigate('dashboard')}>
            <LayoutDashboard size={16} /> Dashboard
          </div>
          <div className="nav-item" onClick={() => setShowAdd(true)}>
            <PlusCircle size={16} /> Add Site
          </div>
        </nav>

        <div style={{ marginTop: 'auto', padding: '0 24px' }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.6 }}>
            <Activity size={11} style={{ display: 'inline', marginRight: 4 }} />
            Backend: <span style={{ color: 'var(--green)' }}>localhost:8000</span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="main-content">
        {page === 'dashboard' && (
          <Dashboard
            refreshKey={refreshKey}
            onAddSite={() => setShowAdd(true)}
            onSelectSite={(site) => navigate('detail', site)}
          />
        )}
        {page === 'detail' && selectedSite && (
          <SiteDetail
            site={selectedSite}
            onBack={() => navigate('dashboard')}
            onDeleted={() => { setRefreshKey(k => k + 1); navigate('dashboard'); }}
          />
        )}
      </main>

      {showAdd && (
        <AddSiteModal onClose={() => setShowAdd(false)} onAdded={onSiteAdded} />
      )}
    </div>
  );
}
