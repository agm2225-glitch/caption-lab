'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AdminShell from '../AdminShell';

const AD = () => { const r = useRouter(); return <div style={{minHeight:'100vh',background:'#0a0a0a',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'IBM Plex Mono',monospace"}}><div style={{textAlign:'center'}}><div style={{fontSize:'2rem',marginBottom:'1rem'}}>⛔</div><h1 style={{color:'#f87171',marginBottom:'0.5rem',fontSize:'1.2rem'}}>Access Denied</h1><p style={{color:'#555',fontSize:'0.82rem',marginBottom:'1.5rem'}}>Superadmin required.</p><button onClick={()=>{supabase.auth.signOut();r.push('/');}} style={{background:'transparent',border:'1px solid #2a2a2a',color:'#888',padding:'0.5rem 1rem',borderRadius:4,fontFamily:"'IBM Plex Mono',monospace",fontSize:'0.78rem',cursor:'pointer'}}>$ sign_out</button></div></div>; };
const IS: React.CSSProperties = {background:'#0a0a0a',border:'1px solid #2a2a2a',borderRadius:4,padding:'0.5rem 0.75rem',color:'#e0e0e0',fontFamily:"'IBM Plex Mono',monospace",fontSize:'0.78rem',width:'100%'};

export default function HumorFlavorsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }
      const { data: p } = await supabase.from('profiles').select('is_superadmin').eq('id', session.user.id).single();
      if (!p?.is_superadmin) { setAccessDenied(true); setLoading(false); return; }
      const { data } = await supabase.from('humor_flavors').select('*').order('id');
      setRows(data || []);
      setLoading(false);
    };
    init();
  }, [router]);

  if (accessDenied) return <AD />;

  return (
    <AdminShell active="humor-flavors">
      <div style={{marginBottom:'1.5rem'}}><h1 style={{fontSize:'1.3rem',fontWeight:600,color:'#fff',marginBottom:'0.25rem'}}>Humor Flavors</h1><p style={{fontSize:'0.78rem',color:'#555'}}>{rows.length} flavors · READ only</p></div>
      {loading ? <div style={{color:'#555',fontSize:'0.82rem'}}>Loading...</div> : (
        <div style={{background:'#111',border:'1px solid #1e1e1e',borderRadius:8,overflow:'hidden'}}>
          <table>
            <thead><tr style={{background:'#0d0d0d'}}>
              {['ID','Slug','Description','Created'].map(h=><th key={h} style={{padding:'0.75rem 1rem',textAlign:'left',fontSize:'0.7rem',color:'#555',textTransform:'uppercase',letterSpacing:'0.08em',fontWeight:500}}>{h}</th>)}
            </tr></thead>
            <tbody>{rows.map(r=>(
              <tr key={r.id} style={{borderBottom:'1px solid #1a1a1a'}}>
                <td style={{padding:'0.75rem 1rem',fontSize:'0.78rem',color:'#febc2e'}}>{r.id}</td>
                <td style={{padding:'0.75rem 1rem',fontSize:'0.78rem',color:'#4ade80'}}>{r.slug}</td>
                <td style={{padding:'0.75rem 1rem',fontSize:'0.78rem',color:'#aaa',maxWidth:320}}><div style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.description||'—'}</div></td>
                <td style={{padding:'0.75rem 1rem',fontSize:'0.72rem',color:'#555'}}>{r.created_datetime_utc?new Date(r.created_datetime_utc).toLocaleDateString():'—'}</td>
              </tr>
            ))}</tbody>
          </table>
          {rows.length===0&&<div style={{padding:'2rem',textAlign:'center',color:'#444',fontSize:'0.82rem'}}>No humor flavors found</div>}
        </div>
      )}
    </AdminShell>
  );
}