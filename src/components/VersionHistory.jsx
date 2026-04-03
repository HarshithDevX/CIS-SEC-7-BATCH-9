import { useState, useEffect } from 'react';
import { getHistory } from '../api';
import toast from 'react-hot-toast';
import { Clock, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

const CHANGE_COLORS = {
  major: 'var(--red)',
  minor: 'var(--yellow)',
  none:  'var(--green)',
};

const CHANGE_ICONS = {
  major: <AlertTriangle size={13} />,
  minor: <Info size={13} />,
  none:  <CheckCircle size={13} />,
};

function MiniBar({ percent }) {
  const color = percent >= 20 ? 'var(--red)' : percent >= 5 ? 'var(--yellow)' : 'var(--green)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 4, background: 'var(--bg3)', borderRadius: 2 }}>
        <div style={{ width: `${Math.min(percent, 100)}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.4s' }} />
      </div>
      <span style={{ fontSize: 11, color, fontFamily: 'var(--mono)', minWidth: 36 }}>{percent}%</span>
    </div>
  );
}

export default function VersionHistory({ siteId, onSelectSnapshot }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('all'); // all | major | minor | none

  useEffect(() => {
    loadHistory();
  }, [siteId]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await getHistory(siteId, 50);
      setHistory(res.data);
    } catch {
      toast.error('Could not load version history.');
    } finally {
      setLoading(false);
    }
  };

  const filtered = filter === 'all' ? history : history.filter(s => s.change_type === filter);

  const counts = {
    all:   history.length,
    major: history.filter(s => s.change_type === 'major').length,
    minor: history.filter(s => s.change_type === 'minor').length,
    none:  history.filter(s => s.change_type === 'none').length,
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text3)', padding: 20 }}>
      <div className="spinner" /> Loading history…
    </div>
  );

  return (
    <div>
      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {['all', 'major', 'minor', 'none'].map(f => (
          <button
            key={f}
            className={`btn ${filter === f ? 'btn-primary' : 'btn-ghost'} btn-sm`}
            onClick={() => setFilter(f)}
            style={filter !== f && f !== 'all' ? { color: CHANGE_COLORS[f] } : {}}
          >
            {CHANGE_ICONS[f] || null}
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <span style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '1px 6px', fontSize: 10 }}>
              {counts[f]}
            </span>
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="card">
        <div className="card-title">
          <Clock size={11} style={{ display: 'inline', marginRight: 4 }} />
          Snapshot History — {filtered.length} entries
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: 40 }}>
            <Clock size={32} />
            <h3>No snapshots yet</h3>
            <p>Snapshots appear here after each monitoring check.</p>
          </div>
        ) : (
          <div>
            {filtered.map((snap, idx) => (
              <div key={snap.id} className="timeline-item"
                   style={{ cursor: onSelectSnapshot ? 'pointer' : 'default' }}
                   onClick={() => onSelectSnapshot && onSelectSnapshot(snap)}>

                {/* Dot + line */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
                  <div className="timeline-dot" style={{ background: CHANGE_COLORS[snap.change_type] }} />
                  {idx < filtered.length - 1 && (
                    <div style={{ width: 1, flex: 1, background: 'var(--border)', marginTop: 4, minHeight: 20 }} />
                  )}
                </div>

                {/* Content */}
                <div style={{ flex: 1, paddingBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span className={`badge badge-${snap.change_type}`}>
                      {CHANGE_ICONS[snap.change_type]}
                      {snap.change_type}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                      {format(new Date(snap.timestamp + 'Z'), 'MMM d, yyyy · HH:mm:ss')}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 'auto' }}>
                      {formatDistanceToNow(new Date(snap.timestamp + 'Z'))} ago
                    </span>
                  </div>

                  {snap.change_type !== 'none' && (
                    <div style={{ marginBottom: 6 }}>
                      <MiniBar percent={snap.change_percent} />
                    </div>
                  )}

                  {snap.change_summary && snap.change_type !== 'none' && (
                    <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5, marginBottom: 4 }}>
                      {snap.change_summary}
                    </p>
                  )}

                  {snap.change_type !== 'none' && (
                    <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
                      {snap.lines_added   > 0 && <span style={{ color: 'var(--green)' }}>+{snap.lines_added} added</span>}
                      {snap.lines_removed > 0 && <span style={{ color: 'var(--red)' }}>-{snap.lines_removed} removed</span>}
                      <span style={{ marginLeft: 'auto', fontSize: 10 }}>hash: {snap.content_hash?.slice(0, 8)}…</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
