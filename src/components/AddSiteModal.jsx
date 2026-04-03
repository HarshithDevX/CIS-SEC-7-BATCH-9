import { useState } from 'react';
import { addSite } from '../api';
import toast from 'react-hot-toast';
import { X, Globe, Bell, Clock, Tag } from 'lucide-react';

export default function AddSiteModal({ onClose, onAdded }) {
  const [form, setForm] = useState({
    url: '',
    name: '',
    interval_minutes: 60,
    alert_email: '',
  });
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.url.startsWith('http')) {
      toast.error('URL must start with http:// or https://');
      return;
    }
    setLoading(true);
    try {
      await addSite({
        url: form.url.trim(),
        name: form.name.trim() || form.url.trim(),
        interval_minutes: Number(form.interval_minutes),
        alert_email: form.alert_email.trim() || null,
      });
      toast.success('✅ Site added! Initial snapshot is being taken.');
      onAdded();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add site.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div className="modal-title">Add Website to Monitor</div>
            <div className="modal-subtitle">We'll take an initial snapshot and track changes automatically.</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={14} /></button>
        </div>

        <div className="form-group">
          <label><Globe size={10} style={{ display: 'inline', marginRight: 4 }} />Website URL *</label>
          <input
            type="url"
            placeholder="https://example.com"
            value={form.url}
            onChange={e => set('url', e.target.value)}
            autoFocus
          />
        </div>

        <div className="form-group">
          <label><Tag size={10} style={{ display: 'inline', marginRight: 4 }} />Display Name</label>
          <input
            type="text"
            placeholder="Competitor Homepage"
            value={form.name}
            onChange={e => set('name', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label><Clock size={10} style={{ display: 'inline', marginRight: 4 }} />Check Interval</label>
          <select value={form.interval_minutes} onChange={e => set('interval_minutes', e.target.value)}>
            <option value={5}>Every 5 minutes</option>
            <option value={15}>Every 15 minutes</option>
            <option value={30}>Every 30 minutes</option>
            <option value={60}>Every hour</option>
            <option value={360}>Every 6 hours</option>
            <option value={720}>Every 12 hours</option>
            <option value={1440}>Every day</option>
          </select>
        </div>

        <div className="form-group">
          <label><Bell size={10} style={{ display: 'inline', marginRight: 4 }} />Alert Email (for major changes)</label>
          <input
            type="email"
            placeholder="alerts@yourcompany.com (optional)"
            value={form.alert_email}
            onChange={e => set('alert_email', e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Adding…</> : '+ Start Monitoring'}
          </button>
        </div>
      </div>
    </div>
  );
}
