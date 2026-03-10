'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AdminShell from '../AdminShell';

const AD = () => {
  const r = useRouter();
  return (
    <div style={{minHeight:'100vh',background:'#0a0a0a',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'IBM Plex Mono',monospace"}}>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:'2rem',marginBottom:'1rem'}}>⛔</div>
        <h1 style={{color:'#f87171',marginBottom:'0.5rem',fontSize:'1.2rem'}}>Access Denied</h1>
        <p style={{color:'#555',fontSize:'0.82rem',marginBottom:'1.5rem'}}>Superadmin required.</p>
        <button onClick={()=>{supabase.auth.signOut();r.push('/');}} style={{background:'transparent',border:'1px solid #2a2a2a',color:'#888',padding:'0.5rem 1rem',borderRadius:4,fontFamily:"'IBM Plex Mono',monospace",fontSize:'0.78rem',cursor:'pointer'}}>$ sign_out</button>
      </div>
    </div>
  );
};

const IS: React.CSSProperties = {
  background:'#0a0a0a',border:'1px solid #2a2a2a',borderRadius:4,
  padding:'0.5rem 0.75rem',color:'#e0e0e0',fontFamily:"'IBM Plex Mono',monospace",
  fontSize:'0.78rem',width:'100%'
};

const empty = {
  humor_flavor_id: 0,
  order_by: 0,
  description: '',
  llm_temperature: '',
  llm_model_id: 0,
  llm_input_type_id: 0,
  llm_output_type_id: 0,
  humor_flavor_step_type_id: 0,
  llm_system_prompt: '',
  llm_user_prompt: '',
};

export default function HumorFlavorStepsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<any[]>([]);
  const [flavors, setFlavors] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<number|null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterFlavor, setFilterFlavor] = useState<number|'all'>('all');
  const [expandedId, setExpandedId] = useState<number|null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }
      const { data: p } = await supabase.from('profiles').select('is_superadmin').eq('id', session.user.id).single();
      if (!p?.is_superadmin) { setAccessDenied(true); setLoading(false); return; }
      const [{ data: steps }, { data: fl }, { data: mdl }] = await Promise.all([
        supabase.from('humor_flavor_steps').select('*').order('humor_flavor_id').order('order_by'),
        supabase.from('humor_flavors').select('id, slug'),
        supabase.from('llm_models').select('id, name'),
      ]);
      setRows(steps || []);
      setFlavors(fl || []);
      setModels(mdl || []);
      setLoading(false);
    };
    init();
  }, [router]);

  const fetchRows = async () => {
    const { data } = await supabase.from('humor_flavor_steps').select('*').order('humor_flavor_id').order('order_by');
    setRows(data || []);
  };

  const flavorName = (id: number) => flavors.find(f => f.id === id)?.slug || `flavor ${id}`;
  const modelName = (id: number) => models.find(m => m.id === id)?.name || `model ${id}`;

  const handleSave = async () => {
    setSaving(true);
    const now = new Date().toISOString();
    const payload = {
      humor_flavor_id: Number(form.humor_flavor_id),
      order_by: Number(form.order_by),
      description: form.description,
      llm_temperature: form.llm_temperature ? parseFloat(String(form.llm_temperature)) : null,
      llm_model_id: Number(form.llm_model_id) || null,
      llm_input_type_id: Number(form.llm_input_type_id) || null,
      llm_output_type_id: Number(form.llm_output_type_id) || null,
      humor_flavor_step_type_id: Number(form.humor_flavor_step_type_id) || null,
      llm_system_prompt: form.llm_system_prompt,
      llm_user_prompt: form.llm_user_prompt,
    };
    if (editingId) {
      await supabase.from('humor_flavor_steps').update(payload).eq('id', editingId);
    } else {
      await supabase.from('humor_flavor_steps').insert([{ ...payload, created_datetime_utc: now }]);
    }
    setForm(empty); setEditingId(null); setShowForm(false); setSaving(false);
    fetchRows();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this step?')) return;
    await supabase.from('humor_flavor_steps').delete().eq('id', id);
    fetchRows();
  };

  const handleEdit = (r: any) => {
    setForm({
      humor_flavor_id: r.humor_flavor_id,
      order_by: r.order_by,
      description: r.description || '',
      llm_temperature: r.llm_temperature ?? '',
      llm_model_id: r.llm_model_id || 0,
      llm_input_type_id: r.llm_input_type_id || 0,
      llm_output_type_id: r.llm_output_type_id || 0,
      humor_flavor_step_type_id: r.humor_flavor_step_type_id || 0,
      llm_system_prompt: r.llm_system_prompt || '',
      llm_user_prompt: r.llm_user_prompt || '',
    });
    setEditingId(r.id);
    setShowForm(true);
    setExpandedId(null);
  };

  const filtered = filterFlavor === 'all' ? rows : rows.filter(r => r.humor_flavor_id === filterFlavor);

  if (accessDenied) return <AD />;

  return (
    <AdminShell active="humor-flavor-steps">
      {/* Header */}
      <div style={{marginBottom:'1.5rem',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'1rem'}}>
        <div>
          <h1 style={{fontSize:'1.3rem',fontWeight:600,color:'#fff',marginBottom:'0.25rem'}}>Humor Flavor Steps</h1>
          <p style={{fontSize:'0.78rem',color:'#555'}}>{rows.length} steps · CRUD</p>
        </div>
        <div style={{display:'flex',gap:'0.75rem',alignItems:'center'}}>
          <select
            value={filterFlavor}
            onChange={e => setFilterFlavor(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            style={{...IS, width:'auto', minWidth:160}}
          >
            <option value="all">All flavors</option>
            {flavors.map(f => <option key={f.id} value={f.id}>{f.slug}</option>)}
          </select>
          <button
            onClick={() => { setForm(empty); setEditingId(null); setShowForm(!showForm); }}
            style={{background:'#4ade8022',border:'1px solid #4ade8044',color:'#4ade80',padding:'0.5rem 1rem',borderRadius:6,fontFamily:"'IBM Plex Mono',monospace",fontSize:'0.78rem',cursor:'pointer',whiteSpace:'nowrap'}}
          >
            {showForm ? '✕ cancel' : '+ new step'}
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="fade-up" style={{background:'#111',border:'1px solid #1e1e1e',borderRadius:8,padding:'1.5rem',marginBottom:'1.5rem'}}>
          <div style={{fontSize:'0.72rem',color:'#555',marginBottom:'1.25rem',textTransform:'uppercase',letterSpacing:'0.08em'}}>
            {editingId ? '// editing step' : '// new step'}
          </div>

          {/* Row 1 */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'0.75rem',marginBottom:'0.75rem'}}>
            <div>
              <label style={{fontSize:'0.7rem',color:'#555',display:'block',marginBottom:'0.3rem'}}>Humor Flavor</label>
              <select style={IS} value={form.humor_flavor_id} onChange={e => setForm(f => ({...f, humor_flavor_id: parseInt(e.target.value)}))}>
                <option value={0}>Select flavor...</option>
                {flavors.map(fl => <option key={fl.id} value={fl.id}>{fl.slug}</option>)}
              </select>
            </div>
            <div>
              <label style={{fontSize:'0.7rem',color:'#555',display:'block',marginBottom:'0.3rem'}}>Order</label>
              <input type="number" style={IS} value={form.order_by} onChange={e => setForm(f => ({...f, order_by: parseInt(e.target.value)||0}))} />
            </div>
            <div>
              <label style={{fontSize:'0.7rem',color:'#555',display:'block',marginBottom:'0.3rem'}}>LLM Model</label>
              <select style={IS} value={form.llm_model_id} onChange={e => setForm(f => ({...f, llm_model_id: parseInt(e.target.value)}))}>
                <option value={0}>Select model...</option>
                {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>

          {/* Row 2 */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:'0.75rem',marginBottom:'0.75rem'}}>
            <div>
              <label style={{fontSize:'0.7rem',color:'#555',display:'block',marginBottom:'0.3rem'}}>Temperature</label>
              <input type="number" step="0.1" min="0" max="2" style={IS} value={form.llm_temperature} onChange={e => setForm(f => ({...f, llm_temperature: e.target.value}))} placeholder="0.0–2.0" />
            </div>
            <div>
              <label style={{fontSize:'0.7rem',color:'#555',display:'block',marginBottom:'0.3rem'}}>Input Type ID</label>
              <input type="number" style={IS} value={form.llm_input_type_id} onChange={e => setForm(f => ({...f, llm_input_type_id: parseInt(e.target.value)||0}))} />
            </div>
            <div>
              <label style={{fontSize:'0.7rem',color:'#555',display:'block',marginBottom:'0.3rem'}}>Output Type ID</label>
              <input type="number" style={IS} value={form.llm_output_type_id} onChange={e => setForm(f => ({...f, llm_output_type_id: parseInt(e.target.value)||0}))} />
            </div>
            <div>
              <label style={{fontSize:'0.7rem',color:'#555',display:'block',marginBottom:'0.3rem'}}>Step Type ID</label>
              <input type="number" style={IS} value={form.humor_flavor_step_type_id} onChange={e => setForm(f => ({...f, humor_flavor_step_type_id: parseInt(e.target.value)||0}))} />
            </div>
          </div>

          {/* Description */}
          <div style={{marginBottom:'0.75rem'}}>
            <label style={{fontSize:'0.7rem',color:'#555',display:'block',marginBottom:'0.3rem'}}>Description</label>
            <input style={IS} value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} placeholder="Step description" />
          </div>

          {/* Prompts */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem',marginBottom:'1rem'}}>
            <div>
              <label style={{fontSize:'0.7rem',color:'#555',display:'block',marginBottom:'0.3rem'}}>System Prompt</label>
              <textarea style={{...IS,height:120,resize:'vertical'}} value={form.llm_system_prompt} onChange={e => setForm(f => ({...f, llm_system_prompt: e.target.value}))} placeholder="You are a..." />
            </div>
            <div>
              <label style={{fontSize:'0.7rem',color:'#555',display:'block',marginBottom:'0.3rem'}}>User Prompt</label>
              <textarea style={{...IS,height:120,resize:'vertical'}} value={form.llm_user_prompt} onChange={e => setForm(f => ({...f, llm_user_prompt: e.target.value}))} placeholder="Generate a caption..." />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !form.humor_flavor_id}
            style={{background:'#4ade8022',border:'1px solid #4ade8044',color:'#4ade80',padding:'0.5rem 1.25rem',borderRadius:4,fontFamily:"'IBM Plex Mono',monospace",fontSize:'0.78rem',cursor:saving||!form.humor_flavor_id?'not-allowed':'pointer',opacity:saving||!form.humor_flavor_id?0.4:1}}
          >
            {saving ? 'saving...' : editingId ? '$ update' : '$ insert'}
          </button>
        </div>
      )}

      {/* Table */}
      {loading ? <div style={{color:'#555',fontSize:'0.82rem'}}>Loading...</div> : (
        <div style={{background:'#111',border:'1px solid #1e1e1e',borderRadius:8,overflow:'hidden'}}>
          <table>
            <thead>
              <tr style={{background:'#0d0d0d'}}>
                {['#','Flavor','Order','Description','Model','Temp','Actions'].map(h => (
                  <th key={h} style={{padding:'0.75rem 1rem',textAlign:'left',fontSize:'0.7rem',color:'#555',textTransform:'uppercase',letterSpacing:'0.08em',fontWeight:500}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <>
                  <tr
                    key={r.id}
                    style={{borderBottom: expandedId === r.id ? 'none' : '1px solid #1a1a1a', cursor:'pointer'}}
                    onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                  >
                    <td style={{padding:'0.75rem 1rem',fontSize:'0.78rem',color:'#febc2e'}}>{r.id}</td>
                    <td style={{padding:'0.75rem 1rem',fontSize:'0.78rem',color:'#4ade80'}}>{flavorName(r.humor_flavor_id)}</td>
                    <td style={{padding:'0.75rem 1rem',fontSize:'0.78rem',color:'#e0e0e0'}}>{r.order_by}</td>
                    <td style={{padding:'0.75rem 1rem',fontSize:'0.78rem',color:'#aaa',maxWidth:200}}>
                      <div style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.description || '—'}</div>
                    </td>
                    <td style={{padding:'0.75rem 1rem',fontSize:'0.75rem',color:'#60a5fa'}}>{r.llm_model_id ? modelName(r.llm_model_id) : '—'}</td>
                    <td style={{padding:'0.75rem 1rem',fontSize:'0.75rem',color:'#f472b6'}}>{r.llm_temperature ?? '—'}</td>
                    <td style={{padding:'0.75rem 1rem'}} onClick={e => e.stopPropagation()}>
                      <div style={{display:'flex',gap:'0.5rem'}}>
                        <button onClick={() => handleEdit(r)} style={{fontSize:'0.7rem',padding:'0.25rem 0.6rem',background:'transparent',border:'1px solid #2a2a2a',color:'#888',borderRadius:3,fontFamily:"'IBM Plex Mono',monospace",cursor:'pointer'}}>edit</button>
                        <button onClick={() => handleDelete(r.id)} style={{fontSize:'0.7rem',padding:'0.25rem 0.6rem',background:'transparent',border:'1px solid #2a2a2a',color:'#888',borderRadius:3,fontFamily:"'IBM Plex Mono',monospace",cursor:'pointer'}}>delete</button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === r.id && (
                    <tr key={`${r.id}-expand`} style={{borderBottom:'1px solid #1a1a1a'}}>
                      <td colSpan={7} style={{padding:'0 1rem 1rem 2.5rem'}}>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
                          <div>
                            <div style={{fontSize:'0.65rem',color:'#555',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:'0.4rem'}}>System Prompt</div>
                            <pre style={{fontSize:'0.72rem',color:'#888',background:'#0a0a0a',border:'1px solid #1e1e1e',borderRadius:4,padding:'0.75rem',overflowX:'auto',whiteSpace:'pre-wrap',wordBreak:'break-word',margin:0,maxHeight:160,overflowY:'auto'}}>
                              {r.llm_system_prompt || '(empty)'}
                            </pre>
                          </div>
                          <div>
                            <div style={{fontSize:'0.65rem',color:'#555',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:'0.4rem'}}>User Prompt</div>
                            <pre style={{fontSize:'0.72rem',color:'#888',background:'#0a0a0a',border:'1px solid #1e1e1e',borderRadius:4,padding:'0.75rem',overflowX:'auto',whiteSpace:'pre-wrap',wordBreak:'break-word',margin:0,maxHeight:160,overflowY:'auto'}}>
                              {r.llm_user_prompt || '(empty)'}
                            </pre>
                          </div>
                        </div>
                        <div style={{display:'flex',gap:'2rem',marginTop:'0.75rem'}}>
                          <span style={{fontSize:'0.7rem',color:'#555'}}>input_type: <span style={{color:'#febc2e'}}>{r.llm_input_type_id ?? '—'}</span></span>
                          <span style={{fontSize:'0.7rem',color:'#555'}}>output_type: <span style={{color:'#febc2e'}}>{r.llm_output_type_id ?? '—'}</span></span>
                          <span style={{fontSize:'0.7rem',color:'#555'}}>step_type: <span style={{color:'#febc2e'}}>{r.humor_flavor_step_type_id ?? '—'}</span></span>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div style={{padding:'2rem',textAlign:'center',color:'#444',fontSize:'0.82rem'}}>No steps found</div>
          )}
        </div>
      )}
    </AdminShell>
  );
}