import { useState, useEffect } from 'react';
import { getLatestDiff, compareDiff, getHistory } from '../api';
import toast from 'react-hot-toast';
import { GitCompare, Plus, Minus, ArrowLeft, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

function DiffBlock({ block }) {
  const typeLabels = { replace: '~ Changed', insert: '+ Inserted', delete: '- Deleted' };
  const typeColors = { replace: 'var(--yellow)', insert: 'var(--green)', delete: 'var(--red)' };

  return (
    <div className="diff-block">
      <div className="diff-block-header" style={{ color: typeColors[block.type] }}>
        {typeLabels[block.type]}
      </div>
      {block.old?.map((line, i) => (
        <div key={`d-${i}`} className="diff-line diff-line-del">{line}</div>
      ))}
      {block.new?.map((line, i) => (
        <div key={`a-${i}`} className="diff-line diff-line-add">{line}</div>
      ))}
    </div>
  );
}

export default function DiffViewer({ siteId }) {
  const [diff, setDiff]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [history, setHistory]   = useState([]);
  const [snapA, setSnapA]       = useState('');
  const [snapB, setSnapB]       = useState('');
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    loadLatest();
    loadHistory();
  }, [siteId]);

  const loadLatest = async () => {
    setLoading(true);
    try {
      const res = await getLatestDiff(siteId);
      setDiff(res.data);
    } catch {
      toast.error('Could not load diff.');
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await getHistory(siteId, 20);
      setHistory(res.data);
    } catch {}
  };

  const handleCompare = async () => {
    if (!snapA || !snapB) { toast.error('Select both snapshots.'); return; }
    setComparing(true);
    try {
      const res = await compareDiff(siteId, snapA, snapB);
      setDiff({ ...res.data, diff: res.data.diff });
    } catch {
      toast.error('Compare failed.');
    } finally {
      setComparing(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text3)', padding: 20 }}>
      <div className="spinner" /> Loading diff…
    </div>
  );

  const d = diff?.diff;

  return (
    <div>
      {/* Compare snapshots */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">Compare Any Two Snapshots</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <select className="form-group" style={{ flex: 1 }}
            value={snapA} onChange={e => setSnapA(e.target.value)}>
            <option value="">— Snapshot A (older) —</option>
            {history.map(s => (
              <option key={s.id} value={s.id}>
                #{s.id} · {format(new Date(s.timestamp + 'Z'), 'MMM d, HH:mm')} · {s.change_type}
              </option>
            ))}
          </select>
          <ArrowRight size={14} color="var(--text3)" />
          <select className="form-group" style={{ flex: 1 }}
            value={snapB} onChange={e => setSnapB(e.target.value)}>
            <option value="">— Snapshot B (newer) —</option>
            {history.map(s => (
              <option key={s.id} value={s.id}>
                #{s.id} · {format(new Date(s.timestamp + 'Z'), 'MMM d, HH:mm')} · {s.change_type}
              </option>
            ))}
          </select>
          <button className="btn btn-primary" onClick={handleCompare} disabled={comparing}>
            <GitCompare size={14} /> {comparing ? 'Comparing…' : 'Compare'}
          </button>
          <button className="btn btn-ghost" onClick={loadLatest}>Latest</button>
        </div>
      </div>

      {/* Stats */}
      {d && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div className="stat-card" style={{ flex: 1, minWidth: 120 }}>
            <div className="stat-value" style={{ color: 'var(--green)', fontSize: 22 }}>{d.lines_added}</div>
            <div className="stat-label"><Plus size={10} style={{ display: 'inline' }} /> Lines Added</div>
          </div>
          <div className="stat-card" style={{ flex: 1, minWidth: 120 }}>
            <div className="stat-value" style={{ color: 'var(--red)', fontSize: 22 }}>{d.lines_removed}</div>
            <div className="stat-label"><Minus size={10} style={{ display: 'inline' }} /> Lines Removed</div>
          </div>
          <div className="stat-card" style={{ flex: 1, minWidth: 120 }}>
            <div className="stat-value" style={{ fontSize: 22 }}>{d.change_percent}%</div>
            <div className="stat-label">Content Changed</div>
          </div>
          {diff.change_type && (
            <div className="stat-card" style={{ flex: 1, minWidth: 120 }}>
              <div className="stat-value" style={{ fontSize: 16, color: diff.change_type === 'major' ? 'var(--red)' : 'var(--yellow)' }}>
                {diff.change_type?.toUpperCase()}
              </div>
              <div className="stat-label">Change Type</div>
            </div>
          )}
        </div>
      )}

      {/* AI Summary */}
      {diff?.change_summary && (
        <div className="card" style={{ marginBottom: 20, borderColor: 'rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.05)' }}>
          <div className="card-title">⬡ AI Analysis</div>
          <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.6 }}>{diff.change_summary}</p>
        </div>
      )}

      {/* Diff blocks */}
      {d?.blocks?.length > 0 ? (
        <div className="card">
          <div className="card-title">Changes ({d.blocks.length} block{d.blocks.length !== 1 ? 's' : ''})</div>
          {d.blocks.map((block, i) => <DiffBlock key={i} block={block} />)}
        </div>
      ) : (
        <div className="empty-state">
          <GitCompare size={36} />
          <h3>No visible differences</h3>
          <p>The content hash changed but the extracted text is identical (possible JS-rendered content).</p>
        </div>
      )}
    </div>
  );
}
