'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AdminShell from '../AdminShell';

const BLUE   = '#378ADD';
const AMBER  = '#BA7517';
const CORAL  = '#D85A30';
const TEAL   = '#1D9E75';
const GRAY   = '#888780';
const PURPLE = '#7F77DD';
const GREEN  = '#639922';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardStats {
  totalUsers: number;
  totalImages: number;
  totalCaptions: number;
  captionRequests: number;
  avgLikes: number;
  llmResponses: number;
  topCaptions: { content: string; like_count: number }[];
  flavorMix: { humor_flavor_id: number; caption_count: number; humor_flavors: { slug: string; description: string } | null }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function truncate(str: string, max = 52): string {
  return str && str.length > max ? str.slice(0, max) + '…' : (str ?? '');
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color = TEAL }: {
  label: string; value: number | string; sub?: string; color?: string;
}) {
  return (
    <div style={{
      background: 'var(--color-background-secondary, #111)',
      border: '0.5px solid var(--color-border-tertiary, #1e1e1e)',
      borderRadius: '8px',
      padding: '16px 18px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: color }} />
      <div style={{ fontSize: 26, fontWeight: 500, color: '#fff', marginBottom: 4, fontVariantNumeric: 'tabular-nums' }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div style={{ fontSize: 12, color: '#888' }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: '#555', marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function SectionCard({ title, badge, children }: {
  title: string; badge?: string; children: React.ReactNode;
}) {
  return (
    <div style={{
      background: 'var(--color-background-primary, #0d0d0d)',
      border: '0.5px solid var(--color-border-tertiary, #1e1e1e)',
      borderRadius: '8px',
    }}>
      <div style={{
        padding: '14px 18px',
        borderBottom: '0.5px solid var(--color-border-tertiary, #1e1e1e)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <h2 style={{ fontSize: 13, fontWeight: 500, color: '#fff', margin: 0 }}>{title}</h2>
        {badge && <span style={{ fontSize: 11, color: '#555', letterSpacing: '0.05em' }}>{badge}</span>}
      </div>
      {children}
    </div>
  );
}

function SystemActivityBar({ items }: { items: { label: string; value: number; color: string }[] }) {
  const maxVal = Math.max(...items.map(i => i.value), 1);
  return (
    <div style={{ padding: '16px 18px' }}>
      {items.map(({ label, value, color }) => (
        <div key={label} style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
            <span style={{ color: '#888' }}>{label}</span>
            <span style={{ color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{value.toLocaleString()}</span>
          </div>
          <div style={{ height: 6, background: '#1a1a1a', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(value / maxVal) * 100}%`, background: color, borderRadius: 3 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function PipelineBar({ items }: { items: { label: string; value: number; color: string }[] }) {
  const total = items[0]?.value || 1;
  return (
    <div>
      <div style={{ display: 'flex', height: 28, borderRadius: 6, overflow: 'hidden', marginBottom: 14, background: '#1a1a1a' }}>
        {items.map(({ label, value, color }) => (
          <div key={label} title={`${label}: ${value.toLocaleString()}`}
            style={{ width: `${Math.max((value / total) * 100, 1.5)}%`, background: color, height: '100%', minWidth: 4 }} />
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px' }}>
        {items.map(({ label, value, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: '#888' }}>{label}</span>
            <span style={{ fontSize: 12, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
              {(value ?? 0).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_superadmin')
        .eq('id', session.user.id)
        .single();
      if (!profile?.is_superadmin) { router.push('/'); return; }
      await fetchStats();
    };
    init();
  }, [router]);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        { count: totalUsers },
        { count: totalImages },
        { count: totalCaptions },
        { count: captionRequests },
        { count: llmResponses },
        { data: rawCaptions },
        { data: definedFlavors },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('images').select('*', { count: 'exact', head: true }),
        supabase.from('captions').select('*', { count: 'exact', head: true }),
        supabase.from('caption_requests').select('*', { count: 'exact', head: true }),
        supabase.from('llm_model_responses').select('*', { count: 'exact', head: true }),
        supabase.from('captions').select('id, caption_text, content, like_count, flavor'),
        supabase.from('humor_flavors').select('id, slug, description'),
      ]);

      const captionsList = rawCaptions || [];
      const totalLikes = captionsList.reduce((acc, c) => acc + (c.like_count || 0), 0);
      const avgLikes = captionsList.length > 0 ? (totalLikes / captionsList.length) : 0;

      // Top 5 Captions
      const topCaptions = [...captionsList]
        .sort((a, b) => (b.like_count ?? 0) - (a.like_count ?? 0))
        .slice(0, 5)
        .map(c => ({
          content: c.content || c.caption_text || '(no content)',
          like_count: c.like_count ?? 0,
        }));

      // Calculate Flavor Mix dynamically
      const flavorCounts: Record<string, number> = {};
      captionsList.forEach(c => {
        const fl = c.flavor || 'default';
        flavorCounts[fl] = (flavorCounts[fl] || 0) + 1;
      });

      const flavorMix = Object.entries(flavorCounts).map(([slug, count], idx) => {
        const matchingDef = (definedFlavors || []).find(f => f.slug === slug);
        return {
          humor_flavor_id: matchingDef?.id || idx + 1,
          caption_count: count,
          humor_flavors: {
            slug,
            description: matchingDef?.description || `${slug} humor style`,
          },
        };
      });

      setStats({
        totalUsers: totalUsers ?? 0,
        totalImages: totalImages ?? 0,
        totalCaptions: totalCaptions ?? 0,
        captionRequests: (captionRequests && captionRequests > 0) ? captionRequests : (totalImages ?? 0),
        avgLikes: parseFloat(avgLikes.toFixed(1)),
        llmResponses: (llmResponses && llmResponses > 0) ? llmResponses : (totalCaptions ?? 0),
        topCaptions,
        flavorMix,
      });
    } catch (e: any) {
      setError(e.message ?? 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <AdminShell active="dashboard">
      <div style={{ color: '#555', fontSize: 13, padding: '2rem 0' }}>
        Loading…
      </div>
    </AdminShell>
  );

  const s = stats!;
  const topLikes = Math.max(...s.topCaptions.map(c => c.like_count ?? 0), 1);
  const maxFlavorCount = Math.max(...s.flavorMix.map(f => f.caption_count ?? 0), 1);
  const flavorColors = [TEAL, BLUE, AMBER, CORAL, PURPLE, GRAY];

  return (
    <AdminShell active="dashboard">
      <div style={{ padding: '28px 32px', maxWidth: 1200, fontFamily: 'var(--font-sans)' }}>

        {/* Header */}
        <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 500, color: '#fff', margin: '0 0 4px' }}>
              Dashboard
            </h1>
            <p style={{ fontSize: 13, color: '#888', margin: 0 }}>
              Humor caption pipeline — system overview
            </p>
          </div>
          <button onClick={fetchStats} style={{
            background: 'transparent',
            border: '0.5px solid #2a2a2a',
            color: '#888',
            padding: '6px 14px',
            borderRadius: '4px',
            fontSize: 12,
            cursor: 'pointer',
          }}>
            ↻ Refresh
          </button>
        </div>

        {error && (
          <div style={{
            background: '#f8717122',
            border: '0.5px solid #f8717144',
            borderRadius: '4px',
            color: '#f87171',
            padding: '10px 14px', fontSize: 13, marginBottom: '1.5rem',
          }}>
            {error}
          </div>
        )}

        {/* Stat grid — row 1 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
          <StatCard label="Total users"         value={s.totalUsers}       color={BLUE} />
          <StatCard label="Images"              value={s.totalImages}      color={TEAL} />
          <StatCard label="Captions generated"  value={s.totalCaptions}    color={GREEN} />
          <StatCard label="Caption requests"    value={s.captionRequests}  color={AMBER} />
        </div>

        {/* Stat grid — row 2 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
          <StatCard label="LLM API calls"       value={s.llmResponses}     color={PURPLE} />
          <StatCard label="Avg likes / caption" value={s.avgLikes}         color={CORAL} sub="User engagement" />
          <StatCard label="Images per user"     value={s.totalUsers > 0 ? (s.totalImages / s.totalUsers).toFixed(1) : 0} color={GREEN} />
        </div>

        {/* Middle row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

          <SectionCard title="System activity breakdown" badge="ENTITY COUNTS">
            <SystemActivityBar items={[
              { label: 'Captions Generated', value: s.totalCaptions, color: GREEN },
              { label: 'LLM API Responses',  value: s.llmResponses,   color: PURPLE },
              { label: 'Caption Requests',   value: s.captionRequests, color: AMBER },
              { label: 'Uploaded Images',     value: s.totalImages,    color: TEAL },
              { label: 'Registered Users',    value: s.totalUsers,     color: BLUE },
            ]} />
          </SectionCard>

          <SectionCard title="Top captions by likes" badge="TOP 5">
            {s.topCaptions.map((c, i) => (
              <div key={i} style={{
                padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 10,
                borderBottom: i < 4 ? '0.5px solid #1e1e1e' : 'none',
              }}>
                <span style={{ fontSize: 11, color: i === 0 ? CORAL : '#555', width: 18, flexShrink: 0 }}>
                  #{i + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: '#fff', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {truncate(c.content)}
                  </div>
                  <div style={{ height: 3, background: '#111', borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${((c.like_count ?? 0) / topLikes) * 100}%`, background: CORAL, borderRadius: 2 }} />
                  </div>
                </div>
                <span style={{ fontSize: 12, color: CORAL, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                  ♥ {(c.like_count ?? 0).toLocaleString()}
                </span>
              </div>
            ))}
          </SectionCard>
        </div>

        {/* Bottom row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          <SectionCard title="Active humor mix" badge="FLAVOR CONFIG">
            {s.flavorMix.length === 0 && (
              <div style={{ padding: 20, fontSize: 13, color: '#555' }}>No flavor mix configured</div>
            )}
            {s.flavorMix.map((f, i) => (
              <div key={f.humor_flavor_id} style={{
                borderBottom: i < s.flavorMix.length - 1 ? '0.5px solid #1e1e1e' : 'none',
              }}>
                <div style={{ padding: '8px 18px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>
                      {f.humor_flavors?.slug || `Flavor #${f.humor_flavor_id}`}
                    </div>
                    {f.humor_flavors?.description && (
                      <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>
                        {f.humor_flavors.description.slice(0, 60)}
                      </div>
                    )}
                  </div>
                  <span style={{
                    fontSize: 12, color: flavorColors[i % flavorColors.length],
                    border: `0.5px solid ${flavorColors[i % flavorColors.length]}`,
                    borderRadius: 4, padding: '2px 8px', flexShrink: 0,
                  }}>×{f.caption_count}</span>
                </div>
                <div style={{ padding: '0 18px 8px' }}>
                  <div style={{ height: 3, background: '#111', borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${((f.caption_count ?? 0) / maxFlavorCount) * 100}%`, background: flavorColors[i % flavorColors.length], borderRadius: 2 }} />
                  </div>
                </div>
              </div>
            ))}
          </SectionCard>

          <SectionCard title="Pipeline conversion">
            <div style={{ padding: '16px 18px' }}>
              <PipelineBar items={[
                { label: 'Requests',  value: s.captionRequests,  color: BLUE },
                { label: 'LLM calls', value: s.llmResponses,     color: PURPLE },
                { label: 'Captions',  value: s.totalCaptions,    color: GREEN },
              ]} />
            </div>
          </SectionCard>

        </div>
      </div>
    </AdminShell>
  );
}