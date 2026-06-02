// hooks/useStatisticsData.js
// All Supabase queries live here. UI components stay clean.
// Path: src/HOA Page/Statistics/useStatisticsData.js

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseAdmin';

// ─── Table name constants (edit here if your Supabase names differ) ───────────
const TABLE_REPORTS     = 'reports';
const TABLE_RESERVATION = 'reservations'; // ← fixed: was 'reservation' (no s)
const TABLE_PAYMENTS    = 'payments';
const TABLE_FACILITIES  = 'facilities';
const TABLE_PROFILES    = 'profiles';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getDateRange = (filter) => {
  const now = new Date();
  const to = now.toISOString();
  switch (filter) {
    case '7d': {
      const from = new Date(now);
      from.setDate(from.getDate() - 7);
      return { from: from.toISOString(), to };
    }
    case 'month': {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: from.toISOString(), to };
    }
    case 'year': {
      const from = new Date(now.getFullYear(), 0, 1);
      return { from: from.toISOString(), to };
    }
    case 'prev_year': {
      const from  = new Date(now.getFullYear() - 1, 0, 1);
      const toEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
      return { from: from.toISOString(), to: toEnd.toISOString() };
    }
    default:
      return { from: null, to };
  }
};

export const groupByMonth = (rows, dateKey) => {
  const months = Array.from({ length: 12 }, (_, i) => ({
    month: i,
    label: new Date(0, i).toLocaleString('default', { month: 'short' }),
    count: 0,
  }));
  rows.forEach((row) => {
    const val = row[dateKey];
    if (!val) return;
    const m = new Date(val).getMonth();
    if (m >= 0 && m < 12) months[m].count += 1;
  });
  return months;
};

// ─── Maintenance (Reports) Hook ───────────────────────────────────────────────

export const useMaintenanceStats = (filter) => {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const categories = ['maintenance', 'noise', 'cleanliness', 'security', 'roads', 'other'];
  const statuses   = ['Pending', 'In Progress', 'Resolved', 'On Hold', 'Denied'];

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { from } = getDateRange(filter);
      let q = supabase.from(TABLE_REPORTS).select('id, category, status, created_at');
      if (from) q = q.gte('created_at', from);
      const { data: rows, error: err } = await q;
      if (err) throw err;

      const safeRows = rows || [];

      // Category breakdown
      const categoryBreakdown = categories.map((cat) => {
        const catRows   = safeRows.filter((r) => r.category?.toLowerCase() === cat);
        const statusCounts = {};
        statuses.forEach((s) => { statusCounts[s] = catRows.filter((r) => r.status === s).length; });
        return { category: cat, total: catRows.length, ...statusCounts };
      });

      // Monthly trend
      const monthlyTrend = groupByMonth(safeRows, 'created_at');

      // Status distribution
      const statusDist = statuses.map((s) => ({
        name: s,
        value: safeRows.filter((r) => r.status === s).length,
      }));

      // Delta vs previous year
      const { from: pf, to: pt } = getDateRange('prev_year');
      const { count: prevTotal } = await supabase
        .from(TABLE_REPORTS)
        .select('id', { count: 'exact', head: true })
        .gte('created_at', pf)
        .lte('created_at', pt);

      const currentTotal  = safeRows.length;
      const delta         = prevTotal > 0 ? Math.round(((currentTotal - prevTotal) / prevTotal) * 100) : null;
      const resolvedCount = safeRows.filter((r) => r.status === 'Resolved').length;

      setData({
        categoryBreakdown,
        monthlyTrend,
        statusDist,
        kpi: {
          total: currentTotal,
          delta,
          resolved: resolvedCount,
          resolutionRate: currentTotal > 0 ? Math.round((resolvedCount / currentTotal) * 100) : 0,
          pending: safeRows.filter((r) => r.status === 'Pending').length,
        },
      });
    } catch (e) {
      console.error('[useMaintenanceStats]', e);
      setError(e.message || 'Failed to load maintenance data');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);
  return { data, loading, error, refetch: load };
};

// ─── Reservation Hook ─────────────────────────────────────────────────────────

export const useReservationStats = (filter) => {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { from } = getDateRange(filter);

      // Try to join facilities + profiles; fall back gracefully if columns differ
      let q = supabase
        .from(TABLE_RESERVATION)
        .select(`id, user_id, facility_id, date, start_time, end_time, status, created_at`);
      if (from) q = q.gte('created_at', from);
      const { data: rows, error: err } = await q;
      if (err) throw err;

      const safeRows = rows || [];

      // Facility usage
      const facilityMap = {};
      safeRows.forEach((r) => {
        const name = r.facility_id ? `Facility ${r.facility_id}` : 'Unknown';
        facilityMap[name] = (facilityMap[name] || 0) + 1;
      });

      // Try to fetch facility names separately
      try {
        const facilityIds = [...new Set(safeRows.map((r) => r.facility_id).filter(Boolean))];
        if (facilityIds.length > 0) {
          const { data: facs } = await supabase
            .from(TABLE_FACILITIES)
            .select('id, name')
            .in('id', facilityIds);
          if (facs) {
            const facMap = {};
            facs.forEach((f) => { facMap[f.id] = f.name; });
            // Rebuild with real names
            Object.keys(facilityMap).forEach((k) => delete facilityMap[k]);
            safeRows.forEach((r) => {
              const name = facMap[r.facility_id] || `Facility ${r.facility_id}`;
              facilityMap[name] = (facilityMap[name] || 0) + 1;
            });
          }
        }
      } catch (_) { /* facilities table optional */ }

      const facilityBreakdown = Object.entries(facilityMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      // Monthly trend (use date column, fall back to created_at)
      const monthlyTrend = groupByMonth(safeRows, 'date');

      // Popular time slots
      const hourMap = {};
      safeRows.forEach((r) => {
        if (r.start_time) {
          const hour  = parseInt(r.start_time.slice(0, 2), 10);
          const label = `${hour % 12 || 12}${hour < 12 ? 'am' : 'pm'}`;
          hourMap[label] = (hourMap[label] || 0) + 1;
        }
      });
      const timeSlots = Object.entries(hourMap)
        .map(([hour, count]) => ({ hour, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

      // Top reservers (user_id only since we skipped the join)
      const userMap = {};
      safeRows.forEach((r) => {
        const name = r.user_id ? r.user_id.slice(0, 8) : 'Unknown';
        userMap[name] = (userMap[name] || 0) + 1;
      });

      // Try to fetch profile names
      try {
        const userIds = [...new Set(safeRows.map((r) => r.user_id).filter(Boolean))];
        if (userIds.length > 0) {
          const { data: profs } = await supabase
            .from(TABLE_PROFILES)
            .select('id, full_name')
            .in('id', userIds);
          if (profs) {
            const profMap = {};
            profs.forEach((p) => { profMap[p.id] = p.full_name || p.id.slice(0, 8); });
            Object.keys(userMap).forEach((k) => delete userMap[k]);
            safeRows.forEach((r) => {
              const name = profMap[r.user_id] || (r.user_id ? r.user_id.slice(0, 8) : 'Unknown');
              userMap[name] = (userMap[name] || 0) + 1;
            });
          }
        }
      } catch (_) { /* profiles table optional */ }

      const topUsers = Object.entries(userMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Status distribution
      const statusMap = {};
      safeRows.forEach((r) => {
        const s = r.status || 'Unknown';
        statusMap[s] = (statusMap[s] || 0) + 1;
      });
      const statusDist = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

      // Delta
      const { from: pf, to: pt } = getDateRange('prev_year');
      const { count: prevTotal } = await supabase
        .from(TABLE_RESERVATION)
        .select('id', { count: 'exact', head: true })
        .gte('created_at', pf)
        .lte('created_at', pt);

      const currentTotal = safeRows.length;

      setData({
        facilityBreakdown,
        monthlyTrend,
        timeSlots,
        topUsers,
        statusDist,
        kpi: {
          total: currentTotal,
          delta: prevTotal > 0 ? Math.round(((currentTotal - prevTotal) / prevTotal) * 100) : null,
          approved: safeRows.filter((r) => ['approved', 'Approved'].includes(r.status)).length,
          pending:  safeRows.filter((r) => ['pending',  'Pending' ].includes(r.status)).length,
          facilities: facilityBreakdown.length,
          topFacility: facilityBreakdown[0]?.name || '—',
          topUser: topUsers[0]?.name || '—',
        },
      });
    } catch (e) {
      console.error('[useReservationStats]', e);
      setError(e.message || 'Failed to load reservation data');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);
  return { data, loading, error, refetch: load };
};

// ─── Payment / Revenue Hook ───────────────────────────────────────────────────

export const usePaymentStats = (filter) => {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { from }           = getDateRange(filter);
      const { from: pf, to: pt } = getDateRange('prev_year');

      let q = supabase.from(TABLE_PAYMENTS).select('id, amount, status, created_at, user_id');
      if (from) q = q.gte('created_at', from);
      const { data: rows, error: err } = await q;
      if (err) throw err;

      const { data: prevRows } = await supabase
        .from(TABLE_PAYMENTS)
        .select('id, amount, status, created_at')
        .gte('created_at', pf)
        .lte('created_at', pt);

      const safeRows  = rows     || [];
      const safePrev  = prevRows || [];

      const paid      = safeRows.filter((r) => ['paid', 'Paid'].includes(r.status));
      const prevPaid  = safePrev.filter( (r) => ['paid', 'Paid'].includes(r.status));

      const totalRevenue = paid.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
      const prevRevenue  = prevPaid.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

      // Monthly revenue trend
      const monthlyRevenue = Array.from({ length: 12 }, (_, i) => ({
        month: i,
        label: new Date(0, i).toLocaleString('default', { month: 'short' }),
        revenue: 0,
        count: 0,
      }));
      paid.forEach((r) => {
        const m = new Date(r.created_at).getMonth();
        if (m >= 0 && m < 12) {
          monthlyRevenue[m].revenue += parseFloat(r.amount) || 0;
          monthlyRevenue[m].count   += 1;
        }
      });

      // Prev year monthly
      const prevMonthlyRevenue = Array.from({ length: 12 }, (_, i) => ({
        month: i,
        label: new Date(0, i).toLocaleString('default', { month: 'short' }),
        revenue: 0,
      }));
      prevPaid.forEach((r) => {
        const m = new Date(r.created_at).getMonth();
        if (m >= 0 && m < 12) prevMonthlyRevenue[m].revenue += parseFloat(r.amount) || 0;
      });

      const activeUsers   = new Set(safeRows.map((r) => r.user_id).filter(Boolean)).size;
      const avgOrderValue = paid.length > 0 ? totalRevenue / paid.length : 0;

      setData({
        kpi: {
          totalRevenue,
          revDelta:      prevRevenue > 0 ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100) : null,
          totalOrders:   safeRows.length,
          activeUsers,
          avgOrderValue,
        },
        monthlyRevenue,
        prevMonthlyRevenue,
      });
    } catch (e) {
      console.error('[usePaymentStats]', e);
      setError(e.message || 'Failed to load payment data');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);
  return { data, loading, error, refetch: load };
};
