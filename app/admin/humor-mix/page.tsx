'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AdminShell from '../AdminShell';

const AD = () => { const r = useRouter(); return <div style={{minHeight:'100vh',background:'#0a0a0a',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'IBM Plex Mono',monospace"}}><div style={{textAlign:'center'}}><div style={{fontSize:'2rem',marginBottom:'1rem'}}>⛔</div><h1 style={{color:'#f87171',marginBottom:'0.5rem',fontSize:'1.2rem'}}>Access Denied</h1><button onClick={()=>{supabase.auth.signOut();r.push('/');}} style={{background:'transparent',border:'1px solid #2a2a2a',color:'#888',padding:'0.5rem 1rem',borderRadius:4,fontFamily:"'IBM Plex Mono',monospace",fontSize:'0.78rem',cursor:'pointer'}}>$ sign_out</button></div></div>; };

export default function HumorMixPage() {
  const router = useRouter();
  const [rows, setRows] = useState<any[]>([]);
  const [flavors, setFlavors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [editingId, setEditingId] = useState<number|null>(null);
  const [editVal, setEditVal] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }
      const { data: p } = await supabase.from('profiles').select('is_superadmin').eq('id', session.user.id).single();
      if (!p?.is_superadmin) { setAccessDenied(true); setLoading(false); return; }
      const [{ data: mix }, { data: fl }] = await Promise.all([
        supabase.from('humor_flavor_mix').select('*').order('id'),
        supabase.from('humor_flavors').select('id, slug'),
      ]);
      setRows(mix || []);
      setFlavors(fl || []);
      setLoading(false);
    };
    init();
  }, [router]);

  const flavorName = (id: number) => flavors.find(f => f.id === id)?.slug || id;

  const handleUpdate = async (id: number) => {
    setSaving(true);
    await supabase.from('humor_flavor_mix').update({ caption_count: parseInt(editVal) }).eq('id', id);
    const { data } = await supabase.from('humor_flavor_mix').select('*').order('id');
    setRows(data || []);
    setEditingId(null);
    setSaving(false);
  };

  if (accessDenied) return <AD />;

  return (
    <AdminShell active="humor-mix">
      <div style={{marginBottom:'1.5rem'}}><h1 style={{fontSize:'1.3rem',fontWeight:600,color:'#fff',marginBottom:'0.25rem'}}>Humor Mix</h1><p style={{fontSize:'0.78rem',color:'#555'}}>{rows.length} entries · READ / UPDATE caption_count</p></div>
      {loading ? <div style={{color:'#555',fontSize:'0.82rem'}}>Loading...</div> : (
        <div style={{background:'#111',border:'1px solid #1e1e1e',borderRadius:8,overflow:'hidden'}}>
          <table>
            <thead><tr style={{background:'#0d0d0d'}}>
              {['ID','Humor Flavor','Caption Count','Created','Actions'].map(h=><th key={h} style={{padding:'0.75rem 1rem',textAlign:'left',fontSize:'0.7rem',color:'#555',textTransform:'uppercase',letterSpacing:'0.08em',fontWeight:500}}>{h}</th>)}
            </tr></thead>
            <tbody>{rows.map(r=>(
              <tr key={r.id} style={{borderBottom:'1px solid #1a1a1a'}}>
                <td style={{padding:'0.75rem 1rem',fontSize:'0.78rem',color:'#febc2e'}}>{r.id}</td>
                <td style={{padding:'0.75rem 1rem',fontSize:'0.78rem',color:'#4ade80'}}>{flavorName(r.humor_flavor_id)}</td>
                <td style={{padding:'0.75rem 1rem',fontSize:'0.78rem',color:'#e0e0e0'}}>
                  {editingId===r.id ? (
                    <input value={editVal} onChange={e=>setEditVal(e.target.value)} style={{background:'#0a0a0a',border:'1px solid #4ade80',borderRadius:4,padding:'0.25rem 0.5rem',color:'#e0e0e0',fontFamily:"'IBM Plex Mono',monospace",fontSize:'0.78rem',width:80}} />
                  ) : r.caption_count}
                </td>
                <td style={{padding:'0.75rem 1rem',fontSize:'0.72rem',color:'#555'}}>{r.created_datetime_utc?new Date(r.created_datetime_utc).toLocaleDateString():'—'}</td>
                <td style={{padding:'0.75rem 1rem'}}>
                  {editingId===r.id ? (
                    <div style={{display:'flex',gap:'0.5rem'}}>
                      <button onClick={()=>handleUpdate(r.id)} disabled={saving} style={{fontSize:'0.7rem',padding:'0.25rem 0.6rem',background:'#4ade8022',border:'1px solid #4ade8044',color:'#4ade80',borderRadius:3,fontFamily:"'IBM Plex Mono',monospace",cursor:'pointer'}}>{saving?'...':'save'}</button>
                      <button onClick={()=>setEditingId(null)} style={{fontSize:'0.7rem',padding:'0.25rem 0.6rem',background:'transparent',border:'1px solid #2a2a2a',color:'#888',borderRadius:3,fontFamily:"'IBM Plex Mono',monospace",cursor:'pointer'}}>cancel</button>
                    </div>
                  ) : (
                    <button onClick={()=>{setEditingId(r.id);setEditVal(String(r.caption_count));}} style={{fontSize:'0.7rem',padding:'0.25rem 0.6rem',background:'transparent',border:'1px solid #2a2a2a',color:'#888',borderRadius:3,fontFamily:"'IBM Plex Mono',monospace",cursor:'pointer'}}>edit</button>
                  )}
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}