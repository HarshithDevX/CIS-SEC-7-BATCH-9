import { useState, useEffect } from 'react';
import { getSites, deleteSite, manualCheck, updateSite } from '../api';
import DiffViewer from './DiffViewer';
import VersionHistory from './VersionHistory';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Trash2, RefreshCw, ExternalLink,
  GitCompare, Clock, Pause, Play, Globe
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const TABS = [
  { id: 'diff',    label: 'Latest Diff',      icon: <GitCompare size={13} /> },
  { id: 'history', label: 'Version History',  icon: <Clock size={13} /> },
];

export default function SiteDetail({ site: initialSite, onBack, onDeleted }) {
  const [site, setSite]       = useState(initialSite);
  const [tab, setTab]         = useState('diff');
  const [checking, setChecking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDel, setConfirm] = useState(false);

  // Keep site data fresh
  const refreshSite = async () => {
    try {
      const res = await getSites();
      const updated = res.data.find(s => s.id === site.id);
      if (updated) setSite(updated);
    } catch {}
  };

  useEffect(() => {
    const t = setInterval(refreshSite, 15000);
    return () => clearInterval(t);
  }, [site.id]);

  const handleCheck = async () => {
    setChecking(true);
    try {
      await manualCheck(site.id);
      toast.success('Check triggered! Data will refresh shortly.');
      setTimeout(refreshSite, 3500);
    } catch {
      toast.error('Failed to trigger check.');
    } finally {
      setChecking(false);
    }
  };

  const handlePause = async () => {
    const newStatus = site.status === 'active' ? 'paused' : 'active';
    try {
      await updateSite(site.id, { status: newStatus });
      setSite(s => ({ ...s, status: newStatus }));
      toast.success(`Site ${newStatus}.`);
    } catch {
      toast.error('Failed to update status.');
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteSite(site.id);
      toast.success('Site removed.');
      onDeleted();
    } catch {
      toast.error('Failed to delete site.');
      setDeleting(false);
    }
  };

  const changeColor = { major: 'var(--red)', minor: 'var(--yellow)', none: 'var(--green)' };

  return (
    <div>
      {/* Back */}
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 20 }} onClick={onBack}>
        <ArrowLeft size={13} /> Back to Dashboard
      </button>

      {/* Site header card */}
      <div className="card" style={{ marginBottom: 24, borderColor: changeColor[site.last_change_type] + '44' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: 'var(--bg3)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Globe size={20} color="var(--accent2)" />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 2 }}>{site.name}</h2>
            <a href={site.url} target="_blank" rel="noreferrer"
               style={{ fontSize: 12, color: 'var(--accent2)', fontFamily: 'var(--mono)', display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
               onClick={e => e.stopPropagation()}>
              {site.url} <ExternalLink size={10} />
            </a>

            <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>Status</div>
                <span className={`badge badge-${site.status}`}>{site.status}</span>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>Last Change</div>
                <span className={`badge badge-${site.last_change_type}`}>{site.last_change_type}</span>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>Last Checked</div>
                <span style={{ fontSize: 12, color: 'var(--text2)' }}>
                  {site.last_checked
                    ? formatDistanceToNow(new Date(site.last_checked + 'Z')) + ' ago'
                    : 'Never'}
                </span>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>Interval</div>
                <span style={{ fontSize: 12, color: 'var(--text2)' }}>Every {site.interval_minutes}m</span>
              </div>
              {site.alert_email && (
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>Alert Email</div>
                  <span style={{ fontSize: 12, color: 'var(--text2)' }}>{site.alert_email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
            <button className={`btn btn-ghost btn-sm ${checking ? 'pulse' : ''}`}
                    onClick={handleCheck} disabled={checking}>
              <RefreshCw size={13} /> {checking ? 'Checking…' : 'Check Now'}
            </button>

            <button className="btn btn-ghost btn-sm" onClick={handlePause}>
              {site.status === 'active'
                ? <><Pause size={13} /> Pause</>
                : <><Play  size={13} /> Resume</>}
            </button>

            {!confirmDel ? (
              <button className="btn btn-danger btn-sm" onClick={() => setConfirm(true)}>
                <Trash2 size={13} /> Delete
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--red)' }}>Sure?</span>
                <button className="btn btn-danger btn-sm" onClick={handleDelete} disabled={deleting}>
                  {deleting ? 'Deleting…' : 'Yes, Delete'}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setConfirm(false)}>Cancel</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '10px 16px', background: 'none', border: 'none',
              cursor: 'pointer', fontSize: 13, fontWeight: 600,
              fontFamily: 'var(--sans)',
              color: tab === t.id ? 'var(--accent2)' : 'var(--text3)',
              borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1, transition: 'all 0.15s',
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      {tab === 'diff'    && <DiffViewer    siteId={site.id} />}
      {tab === 'history' && <VersionHistory siteId={site.id} />}
    </div>
  );
}
