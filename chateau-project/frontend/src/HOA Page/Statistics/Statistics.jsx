// Statistics.jsx  —  React 19 compatible (no Recharts, no external chart libs)
// Path: src/HOA Page/Statistics/Statistics.jsx

import React, { useState } from 'react';
import {
  TrendingUp, TrendingDown, Users, Calendar, DollarSign, ShoppingCart,
  Wrench, AlertTriangle, CheckCircle, ChevronDown, RefreshCw,
  BarChart3, Activity, Shield, Volume2, Leaf, Lock, Car, HelpCircle,
  Building, User, PieChart,
} from 'lucide-react';
import {
  useMaintenanceStats,
  useReservationStats,
  usePaymentStats,
} from './useStatisticsData';

// ─── Design tokens ────────────────────────────────────────────────────────────
const BRAND        = '#006837';
const PALETTE      = ['#006837','#34a853','#fbbc04','#ea4335','#4285f4','#ab47bc','#00acc1','#ff7043'];
const STATUS_COLOR = {
  Pending:       '#f59e0b',
  'In Progress': '#3b82f6',
  Resolved:      '#10b981',
  'On Hold':     '#8b5cf6',
  Denied:        '#ef4444',
  approved:      '#10b981',
  Approved:      '#10b981',
  pending:       '#f59e0b',
  rejected:      '#ef4444',
  Rejected:      '#ef4444',
};
const CAT_ICON = {
  maintenance: Wrench,
  noise:       Volume2,
  cleanliness: Leaf,
  security:    Shield,
  roads:       Car,
  other:       HelpCircle,
};
const FILTERS = [
  { value: '7d',    label: 'Last 7 Days' },
  { value: 'month', label: 'This Month'  },
  { value: 'year',  label: 'This Year'   },
];

// ─── Pure-CSS chart primitives ────────────────────────────────────────────────

/** Vertical bar chart — no dependencies */
const BarChart = ({ data = [], valueKey = 'count', labelKey = 'label', color = BRAND, height = 180 }) => {
  const max = Math.max(...data.map((d) => d[valueKey] || 0), 1);
  return (
    <div className="w-full" style={{ height }}>
      <div className="flex items-end justify-between gap-1 h-[calc(100%-24px)]">
        {data.map((d, i) => {
          const pct = Math.round(((d[valueKey] || 0) / max) * 100);
          return (
            <div key={i} className="flex flex-col items-center justify-end flex-1 gap-1 h-full group relative">
              {/* Tooltip */}
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                {d[valueKey]}
              </div>
              <div
                className="w-full rounded-t-md transition-all duration-500"
                style={{ height: `${Math.max(pct, 2)}%`, backgroundColor: typeof color === 'function' ? color(i) : color }}
              />
            </div>
          );
        })}
      </div>
      {/* X-axis labels */}
      <div className="flex justify-between gap-1 mt-1">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center text-[9px] text-slate-400 font-medium truncate">
            {d[labelKey]}
          </div>
        ))}
      </div>
    </div>
  );
};

/** Horizontal bar chart */
const HBarChart = ({ data = [], valueKey = 'count', labelKey = 'name', height = 200 }) => {
  const max = Math.max(...data.map((d) => d[valueKey] || 0), 1);
  return (
    <div className="space-y-2.5" style={{ minHeight: height / 2 }}>
      {data.map((d, i) => {
        const pct = Math.round(((d[valueKey] || 0) / max) * 100);
        return (
          <div key={i} className="flex items-center gap-3">
            <span className="text-xs text-slate-500 font-medium w-24 truncate shrink-0">{d[labelKey]}</span>
            <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-1.5"
                style={{ width: `${Math.max(pct, 3)}%`, backgroundColor: PALETTE[i % PALETTE.length] }}
              >
                {pct > 20 && (
                  <span className="text-[9px] font-bold text-white">{d[valueKey]}</span>
                )}
              </div>
            </div>
            <span className="text-xs font-bold text-slate-700 w-6 text-right">{d[valueKey]}</span>
          </div>
        );
      })}
    </div>
  );
};

/** Area / line chart (SVG) */
const LineChart = ({ data = [], valueKey = 'count', color = BRAND, height = 160 }) => {
  const values = data.map((d) => d[valueKey] || 0);
  const max    = Math.max(...values, 1);
  const W      = 500;
  const H      = height - 28;
  const pad    = { l: 8, r: 8, t: 8, b: 4 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;

  if (values.every((v) => v === 0)) return (
    <div className="flex items-center justify-center text-slate-400 text-sm" style={{ height }}>
      No data for this period
    </div>
  );

  const pts = data.map((_, i) => ({
    x: pad.l + (i / (data.length - 1 || 1)) * innerW,
    y: pad.t + innerH - ((values[i] / max) * innerH),
  }));

  const polyline = pts.map((p) => `${p.x},${p.y}`).join(' ');
  const area     = `M${pts[0].x},${pad.t + innerH} ` +
                   pts.map((p) => `L${p.x},${p.y}`).join(' ') +
                   ` L${pts[pts.length - 1].x},${pad.t + innerH} Z`;

  return (
    <div style={{ height }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
        <defs>
          <linearGradient id={`lg_${valueKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={area}     fill={`url(#lg_${valueKey})`} />
        <polyline points={polyline} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3.5" fill={color} stroke="white" strokeWidth="1.5" />
        ))}
      </svg>
      {/* X-axis labels */}
      <div className="flex justify-between mt-1 px-1">
        {data.filter((_, i) => data.length <= 12 || i % 2 === 0).map((d, i) => (
          <span key={i} className="text-[9px] text-slate-400 font-medium">{d.label}</span>
        ))}
      </div>
    </div>
  );
};

/** Grouped bar chart for year comparison */
const ComparisonChart = ({ data = [], height = 160 }) => {
  const maxVal = Math.max(...data.flatMap((d) => [d['This Year'] || 0, d['Last Year'] || 0]), 1);
  return (
    <div style={{ height }}>
      <div className="flex items-end justify-between gap-0.5 h-[calc(100%-28px)]">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex items-end justify-center gap-0.5 h-full group relative">
            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">
              {d.label}: ₱{(d['This Year'] || 0).toLocaleString()}
            </div>
            <div className="flex-1 rounded-t-sm" style={{ height: `${Math.max(((d['Last Year'] || 0) / maxVal) * 100, 2)}%`, backgroundColor: '#cbd5e1' }} />
            <div className="flex-1 rounded-t-sm" style={{ height: `${Math.max(((d['This Year'] || 0) / maxVal) * 100, 2)}%`, backgroundColor: BRAND }} />
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-1">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center text-[9px] text-slate-400 font-medium">{d.label}</div>
        ))}
      </div>
    </div>
  );
};

/** Donut chart (SVG) */
const DonutChart = ({ data = [], size = 160 }) => {
  const filtered = data.filter((d) => d.value > 0);
  if (!filtered.length) return <div className="flex items-center justify-center text-slate-400 text-sm" style={{ height: size }}>No data</div>;

  const total  = filtered.reduce((s, d) => s + d.value, 0);
  const R = 60; const r = 36; const cx = size / 2; const cy = size / 2;
  let angle = -Math.PI / 2;

  const slices = filtered.map((d, i) => {
    const sweep   = (d.value / total) * 2 * Math.PI;
    const x1 = cx + R * Math.cos(angle);
    const y1 = cy + R * Math.sin(angle);
    angle += sweep;
    const x2 = cx + R * Math.cos(angle);
    const y2 = cy + R * Math.sin(angle);
    const large = sweep > Math.PI ? 1 : 0;
    // inner arc
    const ix2 = cx + r * Math.cos(angle - sweep);
    const iy2 = cy + r * Math.sin(angle - sweep);
    const ix1 = cx + r * Math.cos(angle);
    const iy1 = cy + r * Math.sin(angle);
    return {
      d: `M${x1},${y1} A${R},${R} 0 ${large},1 ${x2},${y2} L${ix1},${iy1} A${r},${r} 0 ${large},0 ${ix2},${iy2} Z`,
      color: STATUS_COLOR[d.name] || PALETTE[i % PALETTE.length],
      name: d.name,
      value: d.value,
    };
  });

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        {slices.map((s, i) => (
          <path key={i} d={s.d} fill={s.color} stroke="white" strokeWidth="1.5" />
        ))}
        <text x={cx} y={cy - 6}  textAnchor="middle" fontSize="18" fontWeight="900" fill="#1e293b">{total}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fontSize="9"  fontWeight="600" fill="#94a3b8">TOTAL</text>
      </svg>
      <div className="flex flex-col gap-1.5 min-w-0">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-xs text-slate-600 truncate">{s.name}</span>
            <span className="text-xs font-bold text-slate-800 ml-auto pl-2">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Shared UI ────────────────────────────────────────────────────────────────

const FilterDropdown = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const current = FILTERS.find((o) => o.value === value);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
      >
        <Calendar size={15} className="text-slate-400" />
        {current?.label}
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden min-w-[160px]">
          {FILTERS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer
                ${value === opt.value ? 'bg-green-50 text-[#006837] font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const KpiCard = ({ title, value, icon: Icon, iconBg, iconColor, delta, subtitle }) => (
  <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between">
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
        <p className="text-2xl font-black text-slate-900 truncate">{value ?? '—'}</p>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5 truncate">{subtitle}</p>}
      </div>
      <div className={`p-3 rounded-xl ${iconBg} shrink-0 ml-3`}>
        <Icon size={20} className={iconColor} />
      </div>
    </div>
    {delta != null && (
      <div className={`mt-3 flex items-center gap-1.5 text-xs font-bold
        ${delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-red-500' : 'text-slate-400'}`}>
        {delta > 0 ? <TrendingUp size={12} /> : delta < 0 ? <TrendingDown size={12} /> : null}
        <span>{delta > 0 ? '+' : ''}{delta}%</span>
        <span className="font-normal text-slate-400">vs last year</span>
      </div>
    )}
  </div>
);

const Tabs = ({ tabs, value, onChange }) => (
  <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
    {tabs.map((t) => (
      <button
        key={t.key}
        onClick={() => onChange(t.key)}
        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer
          ${value === t.key ? 'bg-white text-[#006837] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
      >
        {t.label}
      </button>
    ))}
  </div>
);

const KpiStrip = ({ items }) => (
  <div className={`grid grid-cols-${items.length} divide-x divide-slate-100 border-b border-slate-100`}>
    {items.map((k) => (
      <div key={k.label} className="py-3 px-4 text-center">
        <p className={`text-xl font-black ${k.color || 'text-slate-900'}`}>{k.value}</p>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{k.label}</p>
      </div>
    ))}
  </div>
);

const Skeleton = () => (
  <div className="space-y-3 animate-pulse">
    {[80, 65, 90, 55].map((w, i) => (
      <div key={i} className="h-3 bg-slate-100 rounded-full" style={{ width: `${w}%` }} />
    ))}
  </div>
);

const ErrState = ({ message, onRetry }) => (
  <div className="flex flex-col items-center justify-center py-10 text-center">
    <AlertTriangle size={28} className="text-amber-400 mb-2" />
    <p className="text-sm font-semibold text-slate-600 mb-3">{message || 'Failed to load'}</p>
    {onRetry && (
      <button onClick={onRetry} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg cursor-pointer">
        <RefreshCw size={12} /> Retry
      </button>
    )}
  </div>
);

const EmptyState = ({ msg = 'No data for this period' }) => (
  <div className="flex flex-col items-center justify-center py-10 text-slate-300">
    <BarChart3 size={32} className="mb-2" />
    <p className="text-sm">{msg}</p>
  </div>
);

// ─── Maintenance Widget ───────────────────────────────────────────────────────

const MaintenanceWidget = ({ filter }) => {
  const { data, loading, error, refetch } = useMaintenanceStats(filter);
  const [tab, setTab] = useState('categories');

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Wrench size={16} className="text-[#006837]" /> Maintenance Reports
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Category, trend & status breakdown</p>
        </div>
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[{ key: 'categories', label: 'Categories' }, { key: 'trend', label: 'Trend' }, { key: 'status', label: 'Status' }]}
        />
      </div>

      {data && (
        <KpiStrip items={[
          { label: 'Total',    value: data.kpi.total,          color: 'text-slate-900'   },
          { label: 'Pending',  value: data.kpi.pending,        color: 'text-amber-500'   },
          { label: 'Resolved', value: data.kpi.resolved,       color: 'text-emerald-600' },
          { label: 'Rate',     value: `${data.kpi.resolutionRate}%`, color: 'text-[#006837]' },
        ]} />
      )}

      <div className="p-5 min-h-[260px]">
        {loading && <Skeleton />}
        {error   && <ErrState message={error} onRetry={refetch} />}

        {!loading && !error && data && (
          <>
            {tab === 'categories' && (
              <div className="space-y-3">
                {data.categoryBreakdown.map((cat) => {
                  const Icon = CAT_ICON[cat.category] || HelpCircle;
                  const pct  = data.kpi.total > 0 ? Math.round((cat.total / data.kpi.total) * 100) : 0;
                  return (
                    <div key={cat.category}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Icon size={13} className="text-[#006837]" />
                          <span className="text-sm font-semibold text-slate-700 capitalize">{cat.category}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1 flex-wrap justify-end">
                            {['Pending','In Progress','Resolved','On Hold','Denied'].map((s) =>
                              cat[s] > 0 ? (
                                <span key={s} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                                  style={{ backgroundColor: (STATUS_COLOR[s] || '#94a3b8') + '22', color: STATUS_COLOR[s] || '#94a3b8' }}>
                                  {s.split(' ')[0]} {cat[s]}
                                </span>
                              ) : null
                            )}
                          </div>
                          <span className="text-sm font-bold text-slate-900 w-6 text-right">{cat.total}</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: BRAND }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {tab === 'trend' && (
              data.monthlyTrend.some((m) => m.count > 0)
                ? <LineChart data={data.monthlyTrend} valueKey="count" color={BRAND} height={200} />
                : <EmptyState />
            )}

            {tab === 'status' && (
              data.statusDist.some((s) => s.value > 0)
                ? <DonutChart data={data.statusDist} size={150} />
                : <EmptyState />
            )}
          </>
        )}
        {!loading && !error && !data && <EmptyState />}
      </div>
    </div>
  );
};

// ─── Reservation Widget ───────────────────────────────────────────────────────

const ReservationWidget = ({ filter }) => {
  const { data, loading, error, refetch } = useReservationStats(filter);
  const [tab, setTab] = useState('facilities');

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Building size={16} className="text-[#006837]" /> Facility Reservations
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Usage, time slots, trend & top reservers</p>
        </div>
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { key: 'facilities', label: 'Facilities' },
            { key: 'timeslots',  label: 'Time Slots' },
            { key: 'trend',      label: 'Trend'       },
            { key: 'users',      label: 'Top Users'   },
          ]}
        />
      </div>

      {data && (
        <KpiStrip items={[
          { label: 'Total',    value: data.kpi.total,      color: 'text-slate-900'   },
          { label: 'Approved', value: data.kpi.approved,   color: 'text-emerald-600' },
          { label: 'Pending',  value: data.kpi.pending,    color: 'text-amber-500'   },
          { label: 'Venues',   value: data.kpi.facilities, color: 'text-[#006837]'   },
        ]} />
      )}

      <div className="p-5 min-h-[260px]">
        {loading && <Skeleton />}
        {error   && <ErrState message={error} onRetry={refetch} />}

        {!loading && !error && data && (
          <>
            {tab === 'facilities' && (
              data.facilityBreakdown.length > 0
                ? <HBarChart data={data.facilityBreakdown} valueKey="count" labelKey="name" height={220} />
                : <EmptyState />
            )}

            {tab === 'timeslots' && (
              data.timeSlots.length > 0
                ? <BarChart data={data.timeSlots} valueKey="count" labelKey="hour"
                    color={(i) => PALETTE[i % PALETTE.length]} height={200} />
                : <EmptyState msg="No time slot data available" />
            )}

            {tab === 'trend' && (
              data.monthlyTrend.some((m) => m.count > 0)
                ? <LineChart data={data.monthlyTrend} valueKey="count" color="#34a853" height={200} />
                : <EmptyState />
            )}

            {tab === 'users' && (
              data.topUsers.length > 0
                ? (
                  <div className="space-y-3">
                    {data.topUsers.map((u, i) => (
                      <div key={u.name} className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0
                          ${i === 0 ? 'bg-[#006837] text-white' : 'bg-slate-100 text-slate-500'}`}>
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-semibold text-slate-700 truncate">{u.name}</span>
                            <span className="text-sm font-bold text-slate-900 ml-2 shrink-0">{u.count}</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full"
                              style={{ width: `${Math.round((u.count / data.topUsers[0].count) * 100)}%`, backgroundColor: PALETTE[i % PALETTE.length] }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
                : <EmptyState msg="No reservation data available" />
            )}
          </>
        )}
        {!loading && !error && !data && <EmptyState />}
      </div>
    </div>
  );
};

// ─── Revenue Widget ───────────────────────────────────────────────────────────

const RevenueWidget = ({ filter }) => {
  const { data, loading, error, refetch } = usePaymentStats(filter);
  const [tab, setTab] = useState('trend');

  const comparisonData = data
    ? data.monthlyRevenue.map((m, i) => ({
        label:       m.label,
        'This Year': Math.round(m.revenue),
        'Last Year': Math.round(data.prevMonthlyRevenue[i]?.revenue || 0),
      }))
    : [];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <DollarSign size={16} className="text-[#006837]" /> Revenue & Payments
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Monthly trend & year-over-year comparison</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {tab === 'comparison' && (
            <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: BRAND }} /> This Year</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block bg-slate-300" /> Last Year</span>
            </div>
          )}
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[{ key: 'trend', label: 'Revenue Trend' }, { key: 'comparison', label: 'YoY Comparison' }]}
          />
        </div>
      </div>

      <div className="p-5 min-h-[200px]">
        {loading && <Skeleton />}
        {error   && <ErrState message={error} onRetry={refetch} />}

        {!loading && !error && data && (
          <>
            {tab === 'trend' && (
              data.monthlyRevenue.some((m) => m.revenue > 0)
                ? <LineChart
                    data={data.monthlyRevenue.map((m) => ({ ...m, label: m.label, count: Math.round(m.revenue) }))}
                    valueKey="count"
                    color={BRAND}
                    height={200}
                  />
                : <EmptyState />
            )}
            {tab === 'comparison' && (
              comparisonData.some((d) => d['This Year'] > 0 || d['Last Year'] > 0)
                ? <ComparisonChart data={comparisonData} height={200} />
                : <EmptyState />
            )}
          </>
        )}
        {!loading && !error && !data && <EmptyState />}
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const Statistics = () => {
  const [filter, setFilter] = useState('year');

  const { data: payData,  loading: payLoading  } = usePaymentStats(filter);
  const { data: maintData, loading: maintLoading } = useMaintenanceStats(filter);
  const { data: resData,  loading: resLoading  } = useReservationStats(filter);

  const fmt         = (n) => n != null ? n.toLocaleString() : '—';
  const fmtCurrency = (n) => {
    if (n == null) return '—';
    if (n >= 1000000) return `₱${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000)    return `₱${(n / 1000).toFixed(1)}k`;
    return `₱${n.toFixed(0)}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <PieChart size={22} className="text-[#006837]" />
            Statistics
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Real-time insights across maintenance, reservations &amp; payments
          </p>
        </div>
        <FilterDropdown value={filter} onChange={setFilter} />
      </div>

      {/* KPI Row 1 — Revenue / Orders */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Revenue"    value={payLoading ? '…' : fmtCurrency(payData?.kpi?.totalRevenue)}  icon={DollarSign}   iconBg="bg-green-50"   iconColor="text-[#006837]" delta={payData?.kpi?.revDelta} />
        <KpiCard title="Active Users"     value={payLoading ? '…' : fmt(payData?.kpi?.activeUsers)}           icon={Users}        iconBg="bg-blue-50"    iconColor="text-blue-600"  subtitle="With transactions" />
        <KpiCard title="Total Orders"     value={payLoading ? '…' : fmt(payData?.kpi?.totalOrders)}           icon={ShoppingCart} iconBg="bg-amber-50"   iconColor="text-amber-600" subtitle="Payment records" />
        <KpiCard title="Avg. Order Value" value={payLoading ? '…' : fmtCurrency(payData?.kpi?.avgOrderValue)} icon={Activity}     iconBg="bg-purple-50"  iconColor="text-purple-600" />
      </div>

      {/* KPI Row 2 — Maintenance / Reservation */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Reports"   value={maintLoading ? '…' : fmt(maintData?.kpi?.total)}             icon={Wrench}        iconBg="bg-red-50"     iconColor="text-red-500"    delta={maintData?.kpi?.delta} />
        <KpiCard title="Resolution Rate" value={maintLoading ? '…' : `${maintData?.kpi?.resolutionRate ?? 0}%`} icon={CheckCircle} iconBg="bg-emerald-50" iconColor="text-emerald-600" subtitle="Maintenance resolved" />
        <KpiCard title="Reservations"    value={resLoading ? '…' : fmt(resData?.kpi?.total)}                 icon={Calendar}      iconBg="bg-sky-50"     iconColor="text-sky-600"    delta={resData?.kpi?.delta} />
        <KpiCard title="Top Reserver"    value={resLoading ? '…' : (resData?.kpi?.topUser ?? '—')}           icon={User}          iconBg="bg-indigo-50"  iconColor="text-indigo-600" subtitle={resData?.kpi?.topFacility ?? ''} />
      </div>

      {/* Revenue chart — full width */}
      <RevenueWidget filter={filter} />

      {/* Maintenance + Reservation side by side */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <MaintenanceWidget  filter={filter} />
        <ReservationWidget  filter={filter} />
      </div>
    </div>
  );
};

export default Statistics;
