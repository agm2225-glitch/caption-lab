'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AdminShell from '../AdminShell';

const BLUE  = '#378ADD';
const AMBER = '#BA7517';
const CORAL = '#D85A30';
const TEAL  = '#1D9E75';
const GRAY  = '#888780';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardStats {
  totalCaptions: number;
  publicCaptions: number;
  featuredCaptions: number;
  totalLikes: number;
  activeUsers: number;
  uniqueImages: number;
}

interface DailyCount {
  date: string;
  public_count: number;
  private_count: number;
}

interface FlavorCount {
  humor_flavor_id: number;
  count: number;
}

interface ChainCount {
  llm_prompt_chain_id: number;
  count: number;
}

interface TopCaption {
  id: string;
  content: string;
  like_count: number;
}

interface RequestStatus {
  fulfilled: number;
  pending: number;
  failed: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString();
}

function pct(part: number, total: number): string {
  if (!total) return '0%';
  return Math.round((part / total) * 100) + '%';
}

function truncate(str: string, max = 28): string {
  return str.length > max ? str.slice(0, max) + '…' : str;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div style={{
      background: 'var(--color-background-secondary)',
      borderRadius: 'var(--border-radius-md)',
      padding: '14px 16px',
    }}>
      <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '0 0 4px' }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 500, color: 'var(--color-text-primary)', margin: 0 }}>
        {typeof value === 'number' ? fmt(value) : value}
      </p>
      {sub && (
        <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', margin: '4px 0 0' }}>{sub}</p>
      )}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--color-background-primary)',
      border: '0.5px solid var(--color-border-tertiary)',
      borderRadius: 'var(--border-radius-lg)',
      padding: '1rem 1.25rem',
    }}>
      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', margin: '0 0 1rem' }}>
        {title}
      </p>
      {children}
    </div>
  );
}

function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 10 }}>
      {items.map(({ color, label }) => (
        <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--color-text-secondary)' }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
          {label}
        </span>
      ))}
    </div>
  );
}

// ─── Bar chart (pure CSS) ─────────────────────────────────────────────────────

function HBarChart({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {data.map(({ label, value }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', width: 110, flexShrink: 0, textAlign: 'right' }}>
            {label}
          </span>
          <div style={{ flex: 1, background: 'var(--color-background-secondary)', borderRadius: 3, height: 20, overflow: 'hidden' }}>
            <div style={{
              width: `${(value / max) * 100}%`,
              height: '100%',
              background: color,
              borderRadius: 3,
              transition: 'width 0.6s ease',
            }} />
          </div>
          <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', width: 40, textAlign: 'right' }}>
            {fmt(value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function VBarChart({
  data,
  colors,
  stacked = false,
}: {
  data: { label: string; values: number[] }[];
  colors: string[];
  stacked?: boolean;
}) {
  const maxVal = stacked
    ? Math.max(...data.map(d => d.values.reduce((a, b) => a + b, 0)), 1)
    : Math.max(...data.flatMap(d => d.values), 1);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 150, paddingBottom: 20, position: 'relative' }}>
      {/* Y gridlines */}
      {[0.25, 0.5, 0.75, 1].map(f => (
        <div key={f} style={{
          position: 'absolute',
          bottom: 20 + f * 130,
          left: 0, right: 0,
          borderTop: '0.5px solid var(--color-border-tertiary)',
          pointerEvents: 'none',
        }} />
      ))}
      {data.map(({ label, values }) => {
        const total = stacked ? values.reduce((a, b) => a + b, 0) : Math.max(...values);
        return (
          <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, height: '100%', justifyContent: 'flex-end' }}>
            <div style={{ width: '100%', display: 'flex', flexDirection: stacked ? 'column-reverse' : 'row', alignItems: 'flex-end', gap: stacked ? 0 : 2, height: `${(total / maxVal) * 130}px` }}>
              {values.map((v, i) => (
                <div key={i} style={{
                  flex: stacked ? 'none' : 1,
                  height: stacked ? `${(v / total) * 100}%` : '100%',
                  background: colors[i] ?? GRAY,
                  borderRadius: stacked && i === values.length - 1 ? '3px 3px 0 0' : stacked ? 0 : 3,
                  minHeight: 2,
                  transition: 'height 0.6s ease',
                }} />
              ))}
            </div>
            <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 4, textAlign: 'center' }}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function DonutChart({ data }: { data: { value: number; color: string; label: string }[] }) {
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  const r = 50, cx = 60, cy = 60, stroke = 20;
  let cumulative = -0.25; // start at top

  const slices = data.map(({ value, color, label }) => {
    const frac = value / total;
    const start = cumulative;
    cumulative += frac;
    const startAngle = start * 2 * Math.PI;
    const endAngle = cumulative * 2 * Math.PI;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const large = frac > 0.5 ? 1 : 0;
    return { path: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`, color, label, pct: Math.round(frac * 100) };
  });

  return (
    <svg viewBox="0 0 120 120" width={120} height={120} style={{ overflow: 'visible' }}>
      {slices.map((s, i) => (
        <path key={i} d={s.path} fill={s.color} stroke="var(--color-background-primary)" strokeWidth={1.5} />
      ))}
      <circle cx={cx} cy={cy} r={r - stroke} fill="var(--color-background-primary)" />
    </svg>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<DashboardStats>({
    totalCaptions: 0,
    publicCaptions: 0,
    featuredCaptions: 0,
    totalLikes: 0,
    activeUsers: 0,
    uniqueImages: 0,
  });

  const [daily, setDaily] = useState<DailyCount[]>([]);
  const [flavors, setFlavors] = useState<FlavorCount[]>([]);
  const [chains, setChains] = useState<ChainCount[]>([]);
  const [topCaptions, setTopCaptions] = useState<TopCaption[]>([]);
  const [requestStatus, setRequestStatus] = useState<RequestStatus>({ fulfilled: 0, pending: 0, failed: 0 });

  useEffect(() => {
    async function fetchAll() {
      try {
        setLoading(true);

        // ── Overview counts ──
        const [
          { count: totalCaptions },
          { count: publicCaptions },
          { count: featuredCaptions },
          { data: likeData },
          { count: activeUsers },
          { count: uniqueImages },
        ] = await Promise.all([
          supabase.from('captions').select('*', { count: 'exact', head: true }),
          supabase.from('captions').select('*', { count: 'exact', head: true }).eq('is_public', true),
          supabase.from('captions').select('*', { count: 'exact', head: true }).eq('is_featured', true),
          supabase.from('captions').select('like_count'),
          supabase.from('captions').select('profile_id', { count: 'exact', head: true }),
          supabase.from('captions').select('image_id', { count: 'exact', head: true }),
        ]);

        const totalLikes = (likeData ?? []).reduce((sum, row) => sum + (row.like_count ?? 0), 0);

        setStats({
          totalCaptions: totalCaptions ?? 0,
          publicCaptions: publicCaptions ?? 0,
          featuredCaptions: featuredCaptions ?? 0,
          totalLikes,
          activeUsers: activeUsers ?? 0,
          uniqueImages: uniqueImages ?? 0,
        });

        // ── Daily captions (last 7 days) ──
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data: recentCaptions } = await supabase
          .from('captions')
          .select('created_datetime_utc, is_public')
          .gte('created_datetime_utc', sevenDaysAgo.toISOString());

        const dayMap: Record<string, { public_count: number; private_count: number }> = {};
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const key = d.toLocaleDateString('en-US', { weekday: 'short' });
          dayMap[key] = { public_count: 0, private_count: 0 };
        }
        (recentCaptions ?? []).forEach(row => {
          const key = new Date(row.created_datetime_utc).toLocaleDateString('en-US', { weekday: 'short' });
          if (dayMap[key]) {
            if (row.is_public) dayMap[key].public_count++;
            else dayMap[key].private_count++;
          }
        });
        setDaily(Object.entries(dayMap).map(([date, v]) => ({ date, ...v })));

        // ── Humor flavor breakdown ──
        const { data: flavorRows } = await supabase
          .from('captions')
          .select('humor_flavor_id')
          .not('humor_flavor_id', 'is', null);

        const flavorMap: Record<number, number> = {};
        (flavorRows ?? []).forEach(row => {
          flavorMap[row.humor_flavor_id] = (flavorMap[row.humor_flavor_id] ?? 0) + 1;
        });
        setFlavors(
          Object.entries(flavorMap)
            .map(([id, count]) => ({ humor_flavor_id: Number(id), count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)
        );

        // ── LLM prompt chain usage ──
        const { data: chainRows } = await supabase
          .from('captions')
          .select('llm_prompt_chain_id')
          .not('llm_prompt_chain_id', 'is', null);

        const chainMap: Record<number, number> = {};
        (chainRows ?? []).forEach(row => {
          chainMap[row.llm_prompt_chain_id] = (chainMap[row.llm_prompt_chain_id] ?? 0) + 1;
        });
        setChains(
          Object.entries(chainMap)
            .map(([id, count]) => ({ llm_prompt_chain_id: Number(id), count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)
        );

        // ── Top captions by likes ──
        const { data: topRows } = await supabase
          .from('captions')
          .select('id, content, like_count')
          .order('like_count', { ascending: false })
          .limit(5);
        setTopCaptions(topRows ?? []);

        // ── Caption request status ──
        const { data: reqRows } = await supabase
          .from('caption_requests')
          .select('status');

        const status = { fulfilled: 0, pending: 0, failed: 0 };
        (reqRows ?? []).forEach((row: { status: string }) => {
          const s = (row.status ?? '').toLowerCase();
          if (s === 'fulfilled' || s === 'completed' || s === 'done') status.fulfilled++;
          else if (s === 'failed' || s === 'error') status.failed++;
          else status.pending++;
        });
        setRequestStatus(status);

      } catch (e: any) {
        setError(e.message ?? 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }

    fetchAll();
  }, []);

  // ── Derived chart data ──

  const dailyChartData = daily.map(d => ({
    label: d.date,
    values: [d.public_count, d.private_count],
  }));

  const flavorColors = [TEAL, BLUE, AMBER, CORAL, GRAY];
  const flavorDonutData = flavors.map((f, i) => ({
    value: f.count,
    color: flavorColors[i] ?? GRAY,
    label: `Flavor ${f.humor_flavor_id}`,
  }));

  const chainBarData = chains.map(c => ({
    label: `Chain ${c.llm_prompt_chain_id}`,
    value: c.count,
  }));

  const topCaptionBarData = topCaptions.map(c => ({
    label: truncate(c.content ?? '', 22),
    value: c.like_count ?? 0,
  }));

  const requestDonutData = [
    { value: requestStatus.fulfilled, color: TEAL, label: `Fulfilled ${pct(requestStatus.fulfilled, requestStatus.fulfilled + requestStatus.pending + requestStatus.failed)}` },
    { value: requestStatus.pending,   color: AMBER, label: `Pending ${pct(requestStatus.pending, requestStatus.fulfilled + requestStatus.pending + requestStatus.failed)}` },
    { value: requestStatus.failed,    color: CORAL, label: `Failed ${pct(requestStatus.failed, requestStatus.fulfilled + requestStatus.pending + requestStatus.failed)}` },
  ];

  const totalRequests = requestStatus.fulfilled + requestStatus.pending + requestStatus.failed;

  // ── Render ──

  return (
    <AdminShell>
      <div style={{ padding: '1.5rem 0', fontFamily: 'var(--font-sans)' }}>

        {error && (
          <div style={{
            background: 'var(--color-background-danger)',
            border: '0.5px solid var(--color-border-danger)',
            borderRadius: 'var(--border-radius-md)',
            color: 'var(--color-text-danger)',
            padding: '10px 14px',
            fontSize: 13,
            marginBottom: '1.5rem',
          }}>
            {error}
          </div>
        )}

        {/* Section label */}
        <p style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.06em', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', margin: '0 0 10px' }}>
          Overview
        </p>

        {/* Metric cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: '1.75rem' }}>
          <MetricCard label="Total captions" value={loading ? '—' : stats.totalCaptions} />
          <MetricCard
            label="Public captions"
            value={loading ? '—' : stats.publicCaptions}
            sub={loading ? undefined : pct(stats.publicCaptions, stats.totalCaptions) + ' of total'}
          />
          <MetricCard
            label="Featured"
            value={loading ? '—' : stats.featuredCaptions}
            sub={loading ? undefined : pct(stats.featuredCaptions, stats.totalCaptions) + ' of total'}
          />
          <MetricCard
            label="Total likes"
            value={loading ? '—' : stats.totalLikes}
            sub={loading && stats.totalCaptions ? undefined : `avg ${stats.totalCaptions ? (stats.totalLikes / stats.totalCaptions).toFixed(1) : 0} per caption`}
          />
          <MetricCard label="Active users" value={loading ? '—' : stats.activeUsers} sub="profiles with captions" />
          <MetricCard label="Images used" value={loading ? '—' : stats.uniqueImages} sub="unique images" />
        </div>

        {/* Daily + Flavor row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>

          <ChartCard title="Captions created — last 7 days">
            <Legend items={[{ color: BLUE, label: 'Public' }, { color: GRAY, label: 'Private' }]} />
            {loading
              ? <div style={{ height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>Loading…</div>
              : <VBarChart data={dailyChartData} colors={[BLUE, GRAY]} stacked />
            }
          </ChartCard>

          <ChartCard title="Humor flavor distribution">
            <Legend items={flavorDonutData.map(d => ({ color: d.color, label: d.label }))} />
            {loading
              ? <div style={{ height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>Loading…</div>
              : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <DonutChart data={flavorDonutData} />
                  <div style={{ flex: 1 }}>
                    {flavorDonutData.map(d => (
                      <div key={d.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                        <span>{d.label}</span>
                        <span style={{ fontWeight: 500 }}>{pct(d.value, flavors.reduce((a, f) => a + f.count, 0))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            }
          </ChartCard>
        </div>

        {/* Top captions */}
        <ChartCard title="Top captions by likes">
          {loading
            ? <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>Loading…</div>
            : <HBarChart data={topCaptionBarData} color={BLUE} />
          }
        </ChartCard>

        {/* Chains + Requests row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginTop: '1.25rem' }}>

          <ChartCard title="Captions per LLM prompt chain">
            {loading
              ? <div style={{ height: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>Loading…</div>
              : <HBarChart data={chainBarData} color={TEAL} />
            }
          </ChartCard>

          <ChartCard title="Caption request status">
            <Legend items={requestDonutData.map(d => ({ color: d.color, label: d.label }))} />
            {loading
              ? <div style={{ height: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>Loading…</div>
              : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <DonutChart data={requestDonutData} />
                  <div>
                    {requestDonutData.map(d => (
                      <div key={d.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 24, fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                        <span>{d.label}</span>
                        <span style={{ fontWeight: 500 }}>{fmt(d.value)}</span>
                      </div>
                    ))}
                    <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', margin: '10px 0 0' }}>
                      {fmt(totalRequests)} total requests
                    </p>
                  </div>
                </div>
              )
            }
          </ChartCard>
        </div>
      </div>
    </AdminShell>
  );
}