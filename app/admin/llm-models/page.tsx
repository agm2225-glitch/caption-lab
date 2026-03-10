'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AdminShell from '../AdminShell';

const AD = () => { const r = useRouter(); return <div style={{minHeight:'100vh',background:'#0a0a0a',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'IBM Plex Mono',monospace"}}><div style={{textAlign:'center'}}><div style={{fontSize:'2rem',marginBottom:'1rem'}}>⛔</div><h1 style={{color:'#f87171',marginBottom:'0.5rem',fontSize:'1.2rem'}}>Access Denied</h1><button onClick={()=>{supabase.auth.signOut();r.push('/');}} style={{background:'transparent',border:'1px solid #2a2a2a',color:'#888',padding:'0.5rem 1rem',borderRadius:4,fontFamily:"'IBM Plex Mono',monospace",fontSize:'0.78rem',cursor:'pointer'}}>$ sign_out</button></div></div>; };
const IS: React.CSSProperties = {background:'#0a0a0a',border:'1px solid #2a2a2a',borderRadius:4,padding:'0.5rem 0.75rem',color:'#e0e0e0',fontFamily:"'IBM Plex Mono',monospace",fontSize:'0.78rem',width:'100%'};
const empty = { name:'', llm_provider_id:0, provider_model_id:'', is_temperature_supported:true };

export default function LLMModelsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<number|null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }
      const { data: p } = await supabase.from('profiles').select('is_superadmin').eq('id', session.user.id).single();
      if (!p?.is_superadmin) { setAccessDenied(true); setLoading(false); return; }
      const [{ data: models }, { data: prov }] = await Promise.all([
        supabase.from('llm_models').select('*').order('id'),
        supabase.from('llm_providers').select('id, name'),
      ]);
      setRows(models || []);
      setProviders(prov || []);
      setLoading(false);
    };
    init();
  }, [router]);

  const fetchRows = async () => {
    const { data } = await supabase.from('llm_models').select('*').order('id');
    setRows(data || []);
  };

  const providerName = (id: number) => providers.find(p => p.id === id)?.name || id;

  const handleSave = async () => {
    setSaving(true);
    const now = new Date().toISOString();
    if (editingId) {
      await supabase.from('llm_models').update({ name: form.name, llm_provider_id: Number(form.llm_provider_id), provider_model_id: form.provider_model_id, is_temperature_supported: form.is_temperature_supported }).eq('id', editingId);
    } else {
      await supabase.from('llm_models').insert([{ ...form, llm_provider_id: Number(form.llm_provider_id), created_datetime_utc: now }]);
    }
    setForm(empty); setEditingId(null); setShowForm(false); setSaving(false);
    fetchRows();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this model?')) return;
    await supabase.from('llm_models').delete().eq('id', id);
    fetchRows();
  };

  if (accessDenied) return <AD />;

  return (
    <AdminShell active="llm-models">
      <div style={{marginBottom:'1.5rem',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div><h1 style={{fontSize:'1.3rem',fontWeight:600,color:'#fff',marginBottom:'0.25rem'}}>LLM Models</h1><p style={{fontSize:'0.78rem',color:'#555'}}>{rows.length} models · CRUD</p></div>
        <button onClick={()=>{setForm(empty);setEditingId(null);setShowForm(!showForm);}} style={{background:'#4ade8022',border:'1px solid #4ade8044',color:'#4ade80',padding:'0.5rem 1rem',borderRadius:6,fontFamily:"'IBM Plex Mono',monospace",fontSize:'0.78rem',cursor:'pointer'}}>{showForm?'✕ cancel':'+ new model'}</button>
      </div>

      {showForm && (
        <div className="fade-up" style={{background:'#111',border:'1px solid #1e1e1e',borderRadius:8,padding:'1.25rem',marginBottom:'1.5rem'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem',marginBottom:'0.75rem'}}>
            <div><label style={{fontSize:'0.7rem',color:'#555',display:'block',marginBottom:'0.3rem'}}>Model Name</label><input style={IS} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. GPT-4o" /></div>
            <div><label style={{fontSize:'0.7rem',color:'#555',display:'block',marginBottom:'0.3rem'}}>Provider</label>
              <select style={{...IS}} value={form.llm_provider_id} onChange={e=>setForm(f=>({...f,llm_provider_id:parseInt(e.target.value)}))}>
                <option value={0}>Select provider...</option>
                {providers.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{marginBottom:'0.75rem'}}><label style={{fontSize:'0.7rem',color:'#555',display:'block',marginBottom:'0.3rem'}}>Provider Model ID</label><input style={IS} value={form.provider_model_id} onChange={e=>setForm(f=>({...f,provider_model_id:e.target.value}))} placeholder="e.g. gpt-4o-2024-08-06" /></div>
          <label style={{display:'flex',alignItems:'center',gap:'0.4rem',fontSize:'0.78rem',color:'#888',cursor:'pointer',marginBottom:'1rem'}}>
            <input type="checkbox" checked={form.is_temperature_supported} onChange={e=>setForm(f=>({...f,is_temperature_supported:e.target.checked}))} />
            Temperature Supported
          </label>
          <button onClick={handleSave} disabled={saving||!form.name} style={{background:'#4ade8022',border:'1px solid #4ade8044',color:'#4ade80',padding:'0.5rem 1.25rem',borderRadius:4,fontFamily:"'IBM Plex Mono',monospace",fontSize:'0.78rem',cursor:saving||!form.name?'not-allowed':'pointer',opacity:saving||!form.name?0.4:1}}>{saving?'saving...':editingId?'$ update':'$ insert'}</button>
        </div>
      )}

      {loading ? <div style={{color:'#555',fontSize:'0.82rem'}}>Loading...</div> : (
        <div style={{background:'#111',border:'1px solid #1e1e1e',borderRadius:8,overflow:'hidden'}}>
          <table>
            <thead><tr style={{background:'#0d0d0d'}}>
              {['ID','Name','Provider','Model ID','Temp','Actions'].map(h=><th key={h} style={{padding:'0.75rem 1rem',textAlign:'left',fontSize:'0.7rem',color:'#555',textTransform:'uppercase',letterSpacing:'0.08em',fontWeight:500}}>{h}</th>)}
            </tr></thead>
            <tbody>{rows.map(r=>(
              <tr key={r.id} style={{borderBottom:'1px solid #1a1a1a'}}>
                <td style={{padding:'0.75rem 1rem',fontSize:'0.78rem',color:'#febc2e'}}>{r.id}</td>
                <td style={{padding:'0.75rem 1rem',fontSize:'0.82rem',color:'#fff',fontWeight:500}}>{r.name}</td>
                <td style={{padding:'0.75rem 1rem',fontSize:'0.78rem',color:'#60a5fa'}}>{providerName(r.llm_provider_id)}</td>
                <td style={{padding:'0.75rem 1rem',fontSize:'0.72rem',color:'#666'}}>{r.provider_model_id}</td>
                <td style={{padding:'0.75rem 1rem',fontSize:'0.72rem',color:r.is_temperature_supported?'#4ade80':'#555'}}>{r.is_temperature_supported?'yes':'no'}</td>
                <td style={{padding:'0.75rem 1rem'}}><div style={{display:'flex',gap:'0.5rem'}}>
                  <button onClick={()=>{setForm({name:r.name,llm_provider_id:r.llm_provider_id,provider_model_id:r.provider_model_id||'',is_temperature_supported:r.is_temperature_supported});setEditingId(r.id);setShowForm(true);}} style={{fontSize:'0.7rem',padding:'0.25rem 0.6rem',background:'transparent',border:'1px solid #2a2a2a',color:'#888',borderRadius:3,fontFamily:"'IBM Plex Mono',monospace",cursor:'pointer'}}>edit</button>
                  <button onClick={()=>handleDelete(r.id)} style={{fontSize:'0.7rem',padding:'0.25rem 0.6rem',background:'transparent',border:'1px solid #2a2a2a',color:'#888',borderRadius:3,fontFamily:"'IBM Plex Mono',monospace",cursor:'pointer'}}>delete</button>
                </div></td>
              </tr>
            ))}</tbody>
          </table>
          {rows.length===0&&<div style={{padding:'2rem',textAlign:'center',color:'#444',fontSize:'0.82rem'}}>No models found</div>}
        </div>
      )}
    </AdminShell>
  );
}