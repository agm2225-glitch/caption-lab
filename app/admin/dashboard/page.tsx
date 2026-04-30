import { createServerSupabaseClient } from '@/lib/supabase-server';
import AdminShell from '../AdminShell';

const BLUE   = '#378ADD';
const AMBER  = '#BA7517';
const CORAL  = '#D85A30';
const TEAL   = '#1D9E75';
const GRAY   = '#888780';
const PURPLE = '#7F77DD';
const GREEN  = '#639922';

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getStats(supabase: any) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [
    { count: totalUsers },
    { count: totalImages },
    { count: totalCaptions },
    { count: captionRequests },
    { count: publicCaptions },
    { count: featuredCaptions },
    { count: llmResponses },
    { data: topCaptions },
    { data: flavorMix },
    { data: recentCaptions },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('images').select('*', { count: 'exact', head: true }),
    supabase.from('captions').select('*', { count: 'exact', head: true }),
    supabase.from('caption_requests').select('*', { count: 'exact', head: true }),
    supabase.from('captions').select('*', { count: 'exact', head: true }).eq('is_public', true),
    supabase.from('captions').select('*', { count: 'exact', head: true }).eq('is_featured', true),
    supabase.from('llm_model_responses').select('*', { count: 'exact', head: true }),
    supabase
      .from('captions')
      .select('content, like_count')
      .order('like_count', { ascending: false })
      .limit(5),
    supabase
      .from('humor_flavor_mix')
      .select('humor_flavor_id, caption_count, humor_flavors(slug, description)'),
    supabase
      .from('captions')
      .select('created_datetime_utc, is_public')
      .gte('created_datetime_utc', sevenDaysAgo.toISOString()),
  ]);

  return {
    totalUsers, totalImages, totalCaptions, captionRequests,
    publicCaptions, featuredCaptions, llmResponses,
    topCaptions, flavorMix, recentCaptions,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(part: number | null, total: number | null): string {
  if (!total || !part) return '0%';
  return Math.round((part / total) * 100) + '%';
}

function truncate(str: string, max = 52): string {
  return str && str.length > max ? str.slice(0, max) + '…' : (str ?? '');
}

function buildDailyData(recentCaptions: any[]) {
  const dayMap: Record<string, { label: string; pub: number; priv: number }> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('en-US', { weekday: 'short' });
    dayMap[key] = { label, pub: 0, priv: 0 };
  }
  (recentCaptions ?? []).forEach((row: any) => {
    const key = new Date(row.created_datetime_utc).toISOString().slice(0, 10);
    if (dayMap[key]) {
      if (row.is_public) dayMap[key].pub++;
      else dayMap[key].priv++;
    }
  });
  return Object.values(dayMap);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color = TEAL }: {
  label: string;
  value: number | null | undefined;
  sub?: string;
  color?: string;
}) {
  return (
    <div style={{
      background: 'var(--color-background-secondary)',
      border: '0.5px solid var(--color-border-tertiary)',
      borderRadius: 'var(--border-radius-md)',
      padding: '16px 18px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: color }} />
      <div style={{ fontSize: 26, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 4, fontVariantNumeric: 'tabular-nums' }}>
        {value?.toLocaleString() ?? '—'}
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function SectionCard({ title, badge, children }: {
  title: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      background: 'var(--color-background-primary)',
      border: '0.5px solid var(--color-border-tertiary)',
      borderRadius: 'var(--border-radius-lg)',
    }}>
      <div style={{
        padding: '14px 18px',
        borderBottom: '0.5px solid var(--color-border-tertiary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <h2 style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', margin: 0 }}>{title}</h2>
        {badge && (
          <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', letterSpacing: '0.05em' }}>{badge}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function VBarGroup({ data }: { data: { label: string; pub: number; priv: number }[] }) {
  const maxVal = Math.max(...data.map(d => d.pub + d.priv), 1);
  const barH = 120;
  return (
    <div style={{ padding: '12px 18px 0' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: barH + 20 }}>
        {data.map(({ label, pub, priv }) => {
          const total = pub + priv;
          const totalH = (total / maxVal) * barH;
          const pubH = total > 0 ? (pub / total) * totalH : 0;
          const privH = totalH - pubH;
          return (
            <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: barH + 20 }}>
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column-reverse', height: totalH }}>
                <div style={{ height: pubH, background: BLUE, borderRadius: privH === 0 ? '3px 3px 0 0' : 0, minHeight: pub > 0 ? 2 : 0 }} />
                <div style={{ height: privH, background: GRAY, borderRadius: '3px 3px 0 0', minHeight: priv > 0 ? 2 : 0 }} />
              </div>
              <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 5 }}>{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PipelineBar({ items }: { items: { label: string; value: number; color: string }[] }) {
  const total = items[0]?.value || 1;
  return (
    <div>
      <div style={{ display: 'flex', height: 28, borderRadius: 6, overflow: 'hidden', marginBottom: 14 }}>
        {items.map(({ label, value, color }) => (
          <div
            key={label}
            title={`${label}: ${value.toLocaleString()}`}
            style={{ width: `${Math.max((value / total) * 100, 1.5)}%`, background: color, height: '100%', minWidth: 4 }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px' }}>
        {items.map(({ label, value, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{label}</span>
            <span style={{ fontSize: 12, color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>
              {value?.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient();
  const stats = await getStats(supabase);

  const dailyData = buildDailyData(stats.recentCaptions ?? []);
  const topLikes = Math.max(...(stats.topCaptions ?? []).map((c: any) => c.like_count ?? 0), 1);
  const maxFlavorCount = Math.max(...(stats.flavorMix ?? []).map((f: any) => f.caption_count ?? 0), 1);
  const flavorColors = [TEAL, BLUE, AMBER, CORAL, PURPLE, GRAY];

  return (
    <AdminShell>
      <div style={{ padding: '28px 32px', maxWidth: 1200, fontFamily: 'var(--font-sans)' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 4px' }}>
            Dashboard
          </h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>
            Humor caption pipeline — system overview
          </p>
        </div>

        {/* Stat grid — row 1 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
          <StatCard label="Total users"         value={stats.totalUsers}      color={BLUE} />
          <StatCard label="Images"              value={stats.totalImages}     color={TEAL} />
          <StatCard
            label="Captions generated"
            value={stats.totalCaptions}
            sub={`${pct(stats.publicCaptions, stats.totalCaptions)} public`}
            color={GREEN}
          />
          <StatCard label="Caption requests"    value={stats.captionRequests} color={AMBER} />
        </div>

        {/* Stat grid — row 2 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
          <StatCard label="LLM API calls"       value={stats.llmResponses}    color={PURPLE} />
          <StatCard
            label="Featured captions"
            value={stats.featuredCaptions}
            sub={`${pct(stats.featuredCaptions, stats.totalCaptions)} of total`}
            color={CORAL}
          />
          <StatCard label="Public captions"     value={stats.publicCaptions}  color={GREEN} />
          <StatCard
            label="Private captions"
            value={(stats.totalCaptions ?? 0) - (stats.publicCaptions ?? 0)}
            color={GRAY}
          />
        </div>

        {/* Middle row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

          <SectionCard title="Captions — last 7 days" badge="PUBLIC / PRIVATE">
            <div style={{ padding: '6px 18px 2px', display: 'flex', gap: 14 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--color-text-secondary)' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: BLUE, display: 'inline-block' }} />Public
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--color-text-secondary)' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: GRAY, display: 'inline-block' }} />Private
              </span>
            </div>
            <VBarGroup data={dailyData} />
            <div style={{ height: 12 }} />
          </SectionCard>

          <SectionCard title="Top captions by likes" badge="TOP 5">
            {(stats.topCaptions ?? []).map((c: any, i: number) => (
              <div key={i} style={{
                padding: '10px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                borderBottom: i < 4 ? '0.5px solid var(--color-border-tertiary)' : 'none',
              }}>
                <span style={{ fontSize: 11, color: i === 0 ? CORAL : 'var(--color-text-tertiary)', width: 18, flexShrink: 0 }}>
                  #{i + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: 'var(--color-text-primary)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {truncate(c.content ?? '(no content)')}
                  </div>
                  <div style={{ height: 3, background: 'var(--color-background-secondary)', borderRadius: 2 }}>
                    <div style={{
                      height: '100%',
                      width: `${((c.like_count ?? 0) / topLikes) * 100}%`,
                      background: CORAL,
                      borderRadius: 2,
                    }} />
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
            {(stats.flavorMix ?? []).length === 0 && (
              <div style={{ padding: 20, fontSize: 13, color: 'var(--color-text-tertiary)' }}>
                No flavor mix configured
              </div>
            )}
            {(stats.flavorMix ?? []).map((f: any, i: number) => (
              <div key={f.humor_flavor_id} style={{
                borderBottom: i < (stats.flavorMix?.length ?? 0) - 1
                  ? '0.5px solid var(--color-border-tertiary)'
                  : 'none',
              }}>
                <div style={{ padding: '8px 18px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                      {f.humor_flavors?.slug || `Flavor #${f.humor_flavor_id}`}
                    </div>
                    {f.humor_flavors?.description && (
                      <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                        {f.humor_flavors.description.slice(0, 60)}
                      </div>
                    )}
                  </div>
                  <span style={{
                    fontSize: 12,
                    color: flavorColors[i % flavorColors.length],
                    border: `0.5px solid ${flavorColors[i % flavorColors.length]}`,
                    borderRadius: 4,
                    padding: '2px 8px',
                    flexShrink: 0,
                  }}>
                    ×{f.caption_count}
                  </span>
                </div>
                <div style={{ padding: '0 18px 8px' }}>
                  <div style={{ height: 3, background: 'var(--color-background-secondary)', borderRadius: 2 }}>
                    <div style={{
                      height: '100%',
                      width: `${((f.caption_count ?? 0) / maxFlavorCount) * 100}%`,
                      background: flavorColors[i % flavorColors.length],
                      borderRadius: 2,
                    }} />
                  </div>
                </div>
              </div>
            ))}
          </SectionCard>

          <SectionCard title="Pipeline conversion">
            <div style={{ padding: '16px 18px' }}>
              <PipelineBar items={[
                { label: 'Requests',  value: stats.captionRequests ?? 0,  color: BLUE },
                { label: 'LLM calls', value: stats.llmResponses ?? 0,     color: PURPLE },
                { label: 'Captions',  value: stats.totalCaptions ?? 0,    color: GREEN },
                { label: 'Public',    value: stats.publicCaptions ?? 0,   color: TEAL },
                { label: 'Featured',  value: stats.featuredCaptions ?? 0, color: CORAL },
              ]} />
            </div>
          </SectionCard>

        </div>
      </div>
    </AdminShell>
  );
}