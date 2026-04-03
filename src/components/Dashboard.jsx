import { useState, useEffect } from 'react';
import { getSites, manualCheck, updateSite } from '../api';
import toast from 'react-hot-toast';
import { RefreshCw, Globe, AlertTriangle, CheckCircle, Pause, Plus, ChevronRight, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

function ChangeTypeDot({ type }) {
  const colors = { major: 'var(--red)', minor: 'var(--yellow)', none: 'var(--green)' };
  return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: colors[type] || 'var(--text3)', flexShrink: 0 }} />;
}

export default function Dashboard({ refreshKey, onAddSite, onSelectSite }) {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState({});

  const load = async () => {
    try {
      const res = await getSites();
      setSites(res.data);
    } catch {
      toast.error('Cannot connect to backend. Is it running on port 8000?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [refreshKey]);

  // Auto-refresh every 30s
  useEffect(() => {
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  const handleCheck = async (e, siteId) => {
    e.stopPropagation();
    setChecking(c => ({ ...c, [siteId]: true }));
    try {
      await manualCheck(siteId);
      toast.success('Check triggered! Refresh in a moment.');
      setTimeout(load, 3000);
    } catch {
      toast.error('Check failed.');
    } finally {
      setChecking(c => ({ ...c, [siteId]: false }));
    }
  };

  const handlePauseToggle = async (e, site) => {
    e.stopPropagation();
    const newStatus = site.status === 'active' ? 'paused' : 'active';
    try {
      await updateSite(site.id, { status: newStatus });
      toast.success(`Site ${newStatus === 'active' ? 'resumed' : 'paused'}.`);
      load();
    } catch {
      toast.error('Failed to update site.');
    }
  };

  // Stats
  const total  = sites.length;
  const major  = sites.filter(s => s.last_change_type === 'major').length;
  const minor  = sites.filter(s => s.last_change_type === 'minor').length;
  const active = sites.filter(s => s.status === 'active').length;

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, gap: 12, color: 'var(--text3)' }}>
      <div className="spinner" /> Loading dashboard…
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Dashboard</h2>
          <p className="page-subtitle">Monitoring {total} website{total !== 1 ? 's' : ''} for changes</p>
        </div>
        <button className="btn btn-primary" onClick={onAddSite}>
          <Plus size={15} /> Add Site
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{total}</div>
          <div className="stat-label">Total Sites</div>
        </div>
        <div className="stat-card" style={{ borderColor: major ? 'rgba(239,68,68,0.3)' : 'var(--border)' }}>
          <div className="stat-value" style={{ color: major ? 'var(--red)' : 'var(--text)' }}>{major}</div>
          <div className="stat-label">⚠ Major Changes</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: minor ? 'var(--yellow)' : 'var(--text)' }}>{minor}</div>
          <div className="stat-label">Minor Changes</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--green)' }}>{active}</div>
          <div className="stat-label">Active Monitors</div>
        </div>
      </div>

      {/* Sites list */}
      <div className="card">
        <div className="card-title">Monitored Sites</div>

        {sites.length === 0 ? (
          <div className="empty-state">
            <Globe size={40} />
            <h3>No sites yet</h3>
            <p>Click "Add Site" to start monitoring a website.</p>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={onAddSite}>
              <Plus size={14} /> Add your first site
            </button>
          </div>
        ) : (
          sites.map(site => (
            <div key={site.id} className="site-row" style={{ cursor: 'pointer' }} onClick={() => onSelectSite(site)}>
              <ChangeTypeDot type={site.last_change_type} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="site-name">{site.name}</div>
                <div className="site-url">{site.url}</div>
                <div className="site-meta" style={{ marginTop: 4, display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span>
                    <Clock size={10} style={{ display: 'inline', marginRight: 3 }} />
                    {site.last_checked
                      ? `Checked ${formatDistanceToNow(new Date(site.last_checked + 'Z'))} ago`
                      : 'Never checked'}
                  </span>
                  <span>every {site.interval_minutes}m</span>
                </div>
              </div>

              <span className={`badge badge-${site.last_change_type}`}>
                {site.last_change_type === 'major' && <AlertTriangle size={9} />}
                {site.last_change_type === 'none'  && <CheckCircle size={9} />}
                {site.last_change_type}
              </span>

              <span className={`badge badge-${site.status}`}>{site.status}</span>

              <button className="btn btn-ghost btn-sm"
                      title={site.status === 'active' ? 'Pause' : 'Resume'}
                      onClick={(e) => handlePauseToggle(e, site)}>
                <Pause size={12} />
              </button>

              <button className={`btn btn-ghost btn-sm ${checking[site.id] ? 'pulse' : ''}`}
                      title="Check now"
                      onClick={(e) => handleCheck(e, site.id)}
                      disabled={checking[site.id]}>
                <RefreshCw size={12} />
              </button>

              <ChevronRight size={14} color="var(--text3)" />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
