'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AdminShell from '../AdminShell';

interface Image {
  id: string;
  url: string;
  image_description: string;
  is_public: boolean;
  is_common_use: boolean;
  additional_context: string;
  created_datetime_utc: string;
}

const emptyForm = { url: '', image_description: '', additional_context: '', is_public: true, is_common_use: false };

const AccessDenied = () => {
  const router = useRouter();
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'IBM Plex Mono', monospace", color: '#e0e0e0' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⛔</div>
        <h1 style={{ color: '#f87171', marginBottom: '0.5rem', fontSize: '1.2rem' }}>Access Denied</h1>
        <p style={{ color: '#555', fontSize: '0.82rem', marginBottom: '1.5rem' }}>Your account does not have superadmin privileges.</p>
        <button onClick={() => { supabase.auth.signOut(); router.push('/'); }} style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#888', padding: '0.5rem 1rem', borderRadius: 4, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.78rem', cursor: 'pointer' }}>
          $ sign_out
        </button>
      </div>
    </div>
  );
};

export default function ImagesPage() {
  const router = useRouter();
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }
      const { data: profile } = await supabase.from('profiles').select('is_superadmin').eq('id', session.user.id).single();
      if (!profile?.is_superadmin) { setAccessDenied(true); setLoading(false); return; }
      fetchImages();
    };
    init();
  }, [router]);

  const fetchImages = async () => {
    setLoading(true);
    const { data } = await supabase.from('images').select('id, url, image_description, is_public, is_common_use, additional_context, created_datetime_utc').order('created_datetime_utc', { ascending: false });
    setImages(data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        const { error } = await supabase.from('images').update({ url: form.url, image_description: form.image_description, additional_context: form.additional_context, is_public: form.is_public, is_common_use: form.is_common_use, modified_datetime_utc: new Date().toISOString() }).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('images').insert([{ url: form.url, image_description: form.image_description, additional_context: form.additional_context, is_public: form.is_public, is_common_use: form.is_common_use, created_datetime_utc: new Date().toISOString(), modified_datetime_utc: new Date().toISOString() }]);
        if (error) throw error;
      }
      setForm(emptyForm);
      setEditingId(null);
      setShowForm(false);
      fetchImages();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (img: Image) => {
    setForm({ url: img.url, image_description: img.image_description || '', additional_context: img.additional_context || '', is_public: img.is_public, is_common_use: img.is_common_use });
    setEditingId(img.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this image?')) return;
    await supabase.from('images').delete().eq('id', id);
    fetchImages();
  };

  const inputStyle = { background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 4, padding: '0.5rem 0.75rem', color: '#e0e0e0', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.78rem', width: '100%' };

  if (accessDenied) return <AccessDenied />;

  return (
    <AdminShell active="images">
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 600, color: '#fff', marginBottom: '0.25rem' }}>Images</h1>
          <p style={{ fontSize: '0.78rem', color: '#555' }}>{images.length} images · CREATE / READ / UPDATE / DELETE</p>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(!showForm); }}
          style={{ background: '#4ade8022', border: '1px solid #4ade8044', color: '#4ade80', padding: '0.5rem 1rem', borderRadius: 6, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.78rem', cursor: 'pointer' }}
        >
          {showForm ? '✕ cancel' : '+ new image'}
        </button>
      </div>

      {showForm && (
        <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 8, padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.72rem', color: '#555', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {editingId ? '// editing image' : '// new image'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.7rem', color: '#555', display: 'block', marginBottom: '0.3rem' }}>URL</label>
              <input style={inputStyle} value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..." />
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', color: '#555', display: 'block', marginBottom: '0.3rem' }}>Description</label>
              <input style={inputStyle} value={form.image_description} onChange={e => setForm(f => ({ ...f, image_description: e.target.value }))} placeholder="Image description" />
            </div>
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ fontSize: '0.7rem', color: '#555', display: 'block', marginBottom: '0.3rem' }}>Additional Context</label>
            <input style={inputStyle} value={form.additional_context} onChange={e => setForm(f => ({ ...f, additional_context: e.target.value }))} placeholder="Optional context" />
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem' }}>
            {[{ key: 'is_public', label: 'Public' }, { key: 'is_common_use', label: 'Common Use' }].map(({ key, label }) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: '#888', cursor: 'pointer' }}>
                <input type="checkbox" checked={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))} />
                {label}
              </label>
            ))}
          </div>
          {error && <div style={{ fontSize: '0.75rem', color: '#f87171', marginBottom: '0.75rem' }}>{error}</div>}
          <button
            onClick={handleSave}
            disabled={saving || !form.url}
            style={{ background: '#4ade8022', border: '1px solid #4ade8044', color: '#4ade80', padding: '0.5rem 1.25rem', borderRadius: 4, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.78rem', cursor: saving || !form.url ? 'not-allowed' : 'pointer', opacity: saving || !form.url ? 0.4 : 1 }}
          >
            {saving ? 'saving...' : editingId ? '$ update' : '$ insert'}
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ color: '#555', fontSize: '0.82rem' }}>Loading images...</div>
      ) : (
        <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr style={{ background: '#0d0d0d' }}>
                {['Preview', 'Description', 'Flags', 'Created', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {images.map(img => (
                <tr key={img.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {img.url ? <img src={img.url} alt="" style={{ width: 48, height: 36, objectFit: 'cover', borderRadius: 3, border: '1px solid #2a2a2a' }} /> : <div style={{ width: 48, height: 36, background: '#1a1a1a', borderRadius: 3 }} />}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', color: '#aaa', maxWidth: 240 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{img.image_description || <span style={{ color: '#444' }}>—</span>}</div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      {img.is_public && <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', background: '#4ade8022', color: '#4ade80', borderRadius: 3, border: '1px solid #4ade8044' }}>public</span>}
                      {img.is_common_use && <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', background: '#60a5fa22', color: '#60a5fa', borderRadius: 3, border: '1px solid #60a5fa44' }}>common</span>}
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.72rem', color: '#555' }}>
                    {img.created_datetime_utc ? new Date(img.created_datetime_utc).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => handleEdit(img)} style={{ fontSize: '0.7rem', padding: '0.25rem 0.6rem', background: 'transparent', border: '1px solid #2a2a2a', color: '#888', borderRadius: 3, fontFamily: "'IBM Plex Mono', monospace", cursor: 'pointer' }}>edit</button>
                      <button onClick={() => handleDelete(img.id)} style={{ fontSize: '0.7rem', padding: '0.25rem 0.6rem', background: 'transparent', border: '1px solid #2a2a2a', color: '#888', borderRadius: 3, fontFamily: "'IBM Plex Mono', monospace", cursor: 'pointer' }}>delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {images.length === 0 && <div style={{ padding: '2rem', textAlign: 'center', color: '#444', fontSize: '0.82rem' }}>No images found</div>}
        </div>
      )}
    </AdminShell>
  );
}