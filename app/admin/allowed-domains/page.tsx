'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AdminShell from '../AdminShell';

const AD = () => { const r = useRouter(); return <div style={{minHeight:'100vh',background:'#0a0a0a',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'IBM Plex Mono',monospace"}}><div style={{textAlign:'center'}}><div style={{fontSize:'2rem',marginBottom:'1rem'}}>⛔</div><h1 style={{color:'#f87171',marginBottom:'0.5rem',fontSize:'1.2rem'}}>Access Denied</h1><button onClick={()=>{supabase.auth.signOut();r.push('/');}} style={{background:'transparent',border:'1px solid #2a2a2a',color:'#888',padding:'0.5rem 1rem',borderRadius:4,fontFamily:"'IBM Plex Mono',monospace",fontSize:'0.78rem',cursor:'pointer'}}>$ sign_out</button></div></div>; };
const IS: React.CSSProperties = {background:'#0a0a0a',border:'1px solid #2a2a2a',borderRadius:4,padding:'0.5rem 0.75rem',color:'#e0e0e0',fontFamily:"'IBM Plex Mono',monospace",fontSize:'0.78rem',width:'100%'};

export default function AllowedDomainsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [domain, setDomain] = useState('');
  const [editingId, setEditingId] = useState<number|null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }
      const { data: p } = await supabase.from('profiles').select('is_superadmin').eq('id', session.user.id).single();
      if (!p?.is_superadmin) { setAccessDenied(true); setLoading(false); return; }
      fetchRows();
    };
    init();
  }, [router]);

  const fetchRows = async () => {
    setLoading(true);
    const { data } = await supabase.from('allowed_signup_domains').select('*').order('apex_domain');
    setRows(data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const now = new Date().toISOString();
    if (editingId) {
      await supabase.from('allowed_signup_domains').update({ apex_domain: domain }).eq('id', editingId);
    } else {
      await supabase.from('allowed_signup_domains').insert([{ apex_domain: domain, created_datetime_utc: now }]);
    }
    setDomain(''); setEditingId(null); setShowForm(false); setSaving(false);
    fetchRows();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Remove this domain?')) return;
    await supabase.from('allowed_signup_domains').delete().eq('id', id);
    fetchRows();
  };

  if (accessDenied) return <AD />;

  return (
    <AdminShell active="allowed-domains">
      <div style={{marginBottom:'1.5rem',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div><h1 style={{fontSize:'1.3rem',fontWeight:600,color:'#fff',marginBottom:'0.25rem'}}>Allowed Signup Domains</h1><p style={{fontSize:'0.78rem',color:'#555'}}>{rows.length} domains · CRUD</p></div>
        <button onClick={()=>{setDomain('');setEditingId(null);setShowForm(!showForm);}} style={{background:'#4ade8022',border:'1px solid #4ade8044',color:'#4ade80',padding:'0.5rem 1rem',borderRadius:6,fontFamily:"'IBM Plex Mono',monospace",fontSize:'0.78rem',cursor:'pointer'}}>{showForm?'✕ cancel':'+ add domain'}</button>
      </div>

      {showForm && (
        <div className="fade-up" style={{background:'#111',border:'1px solid #1e1e1e',borderRadius:8,padding:'1.25rem',marginBottom:'1.5rem'}}>
          <label style={{fontSize:'0.7rem',color:'#555',display:'block',marginBottom:'0.3rem'}}>Apex Domain</label>
          <input style={{...IS,marginBottom:'1rem'}} value={domain} onChange={e=>setDomain(e.target.value)} placeholder="e.g. university.edu" />
          <button onClick={handleSave} disabled={saving||!domain} style={{background:'#4ade8022',border:'1px solid #4ade8044',color:'#4ade80',padding:'0.5rem 1.25rem',borderRadius:4,fontFamily:"'IBM Plex Mono',monospace",fontSize:'0.78rem',cursor:saving||!domain?'not-allowed':'pointer',opacity:saving||!domain?0.4:1}}>{saving?'saving...':editingId?'$ update':'$ insert'}</button>
        </div>
      )}

      {loading ? <div style={{color:'#555',fontSize:'0.82rem'}}>Loading...</div> : (
        <div style={{background:'#111',border:'1px solid #1e1e1e',borderRadius:8,overflow:'hidden'}}>
          <table>
            <thead><tr style={{background:'#0d0d0d'}}>
              {['Domain','Created','Actions'].map(h=><th key={h} style={{padding:'0.75rem 1rem',textAlign:'left',fontSize:'0.7rem',color:'#555',textTransform:'uppercase',letterSpacing:'0.08em',fontWeight:500}}>{h}</th>)}
            </tr></thead>
            <tbody>{rows.map(r=>(
              <tr key={r.id} style={{borderBottom:'1px solid #1a1a1a'}}>
                <td style={{padding:'0.75rem 1rem',fontSize:'0.82rem',color:'#4ade80',fontFamily:"'IBM Plex Mono',monospace"}}>{r.apex_domain}</td>
                <td style={{padding:'0.75rem 1rem',fontSize:'0.72rem',color:'#555'}}>{r.created_datetime_utc?new Date(r.created_datetime_utc).toLocaleDateString():'—'}</td>
                <td style={{padding:'0.75rem 1rem'}}><div style={{display:'flex',gap:'0.5rem'}}>
                  <button onClick={()=>{setDomain(r.apex_domain);setEditingId(r.id);setShowForm(true);}} style={{fontSize:'0.7rem',padding:'0.25rem 0.6rem',background:'transparent',border:'1px solid #2a2a2a',color:'#888',borderRadius:3,fontFamily:"'IBM Plex Mono',monospace",cursor:'pointer'}}>edit</button>
                  <button onClick={()=>handleDelete(r.id)} style={{fontSize:'0.7rem',padding:'0.25rem 0.6rem',background:'transparent',border:'1px solid #2a2a2a',color:'#888',borderRadius:3,fontFamily:"'IBM Plex Mono',monospace",cursor:'pointer'}}>delete</button>
                </div></td>
              </tr>
            ))}</tbody>
          </table>
          {rows.length===0&&<div style={{padding:'2rem',textAlign:'center',color:'#444',fontSize:'0.82rem'}}>No domains found</div>}
        </div>
      )}
    </AdminShell>
  );
}