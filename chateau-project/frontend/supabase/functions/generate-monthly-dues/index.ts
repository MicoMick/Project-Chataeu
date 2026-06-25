// supabase/functions/generate-monthly-dues/index.ts
//
// Server-side version of Payment.jsx's runGenerateDues() + runDelinquencyCheck().
// Meant to be triggered by Supabase Cron (pg_cron), NOT by a logged-in user —
// so it has no user JWT and instead checks a shared CRON_SECRET.
//
// Idempotent: safe to run multiple times a day. It only actually inserts dues
// the first time it runs after a new month has started (checked via the
// "does a payment row already exist for this month's due_date?" query).

import { createClient } from 'npm:@supabase/supabase-js@2'

const MONTHLY_DUE_AMOUNT = 150
const DELINQUENT_THRESHOLD = MONTHLY_DUE_AMOUNT * 3 // ₱450 (3 months unpaid)

const BILL_LINE_ITEMS_BASE = [
  { label: 'Security Guard',  category: 'Salaries',    fixedTotal: 22000 },
  { label: 'Electricity',     category: 'Utilities',   fixedTotal: 14000 },
  { label: 'Street Sweepers', category: 'Maintenance', fixedTotal: 1200  },
  { label: 'Water',           category: 'Utilities',   fixedTotal: 400   },
]

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function buildLineItemBreakdown() {
  const totalBase = BILL_LINE_ITEMS_BASE.reduce((s, i) => s + i.fixedTotal, 0)
  return BILL_LINE_ITEMS_BASE.map((item) => ({
    label: item.label,
    category: item.category,
    amount: Math.round((item.fixedTotal / totalBase) * MONTHLY_DUE_AMOUNT * 100) / 100,
  }))
}

function generateRefNo(month: number, year: number) {
  const mm = String(month + 1).padStart(2, '0')
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `HOA-${mm}${year}-${rand}`
}

// ── Manila-time "today" ─────────────────────────────────────────────────────
// The Edge Function runtime thinks in UTC. We shift the clock forward 8 hours
// (PHT = UTC+8) and then read the UTC-getter fields off that shifted instant —
// this avoids depending on whatever the runtime's "local" timezone happens to
// be, so the date math is correct no matter where this actually executes.
function manilaDateParts() {
  const shifted = new Date(Date.now() + 8 * 60 * 60 * 1000)
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(), // 0-indexed, matches Payment.jsx's getMonth()
    date: shifted.getUTCDate(),
  }
}

function ymd(year: number, month: number, date: number) {
  const mm = String(month + 1).padStart(2, '0')
  const dd = String(date).padStart(2, '0')
  return `${year}-${mm}-${dd}`
}

Deno.serve(async (req: Request) => {
  // ── Auth: this function is called by pg_cron, which has no user session.
  // Supabase's platform-level JWT check inspects the "Authorization" header
  // before our code runs — so a shared secret must go in "apikey" instead,
  // which only our own code checks. (See: Supabase "Securing Edge Functions"
  // guide, "Service-to-service calls" pattern.) Set this with:
  //   supabase secrets set CRON_SECRET=<some-long-random-string>
  const CRON_SECRET = Deno.env.get('CRON_SECRET')
  const providedKey = req.headers.get('apikey') ?? ''
  if (CRON_SECRET && providedKey !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    const { year, month, date } = manilaDateParts()
    const statementDate = ymd(year, month, date)
    const monthStart = ymd(year, month, 1)
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
    const monthEnd = ymd(year, month, lastDay)

    // ── Task 1: generate this month's dues (idempotent) ───────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let duesResult: Record<string, any> = { skipped: true, reason: 'Already generated for this month.' }

    const { data: existing, error: existingErr } = await supabase
      .from('payments')
      .select('id')
      .gte('due_date', monthStart)
      .lte('due_date', monthEnd)
      .limit(1)

    if (existingErr) {
      duesResult = { success: false, error: existingErr.message }
    } else if (!existing?.length) {
      const { data: residents, error: residentsErr } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('account_status', 'active')
        .order('full_name')

      if (residentsErr) {
        duesResult = { success: false, error: residentsErr.message }
      } else if (residents?.length) {
        const lineItems = buildLineItemBreakdown()
        const rows = residents.map((r: { id: string }) => ({
          user_id: r.id,
          amount: MONTHLY_DUE_AMOUNT,
          statement_date: statementDate,
          due_date: monthEnd,
          status: 'unpaid',
          reference_no: generateRefNo(month, year),
          line_items: lineItems,
        }))

        const { error: insertErr } = await supabase.from('payments').insert(rows)
        if (insertErr) {
          duesResult = { success: false, error: insertErr.message }
        } else {
          duesResult = { success: true, count: rows.length, month: MONTHS[month], year }
          try {
            await supabase.from('system_logs').insert({
              action: 'AUTO_MONTHLY_DUE',
              details: `Generated ₱${MONTHLY_DUE_AMOUNT} monthly dues for ${rows.length} residents — ${MONTHS[month]} ${year}. Statement: ${statementDate}, Due: ${monthEnd}.`,
            })
          } catch (_e) {
            // Audit logging is best-effort — a schema mismatch here must not
            // block the actual dues generation above.
          }
        }
      } else {
        duesResult = { skipped: true, reason: 'No active residents found.' }
      }
    }

    // ── Task 2: delinquency check (₱450+ unpaid balance) ───────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let delinquencyResult: Record<string, any> = { success: true, count: 0 }

    const { data: unpaidPayments, error: unpaidErr } = await supabase
      .from('payments')
      .select('user_id, amount')
      .in('status', ['unpaid', 'overdue', 'pending'])

    if (unpaidErr) {
      delinquencyResult = { success: false, error: unpaidErr.message }
    } else if (unpaidPayments?.length) {
      const balanceMap: Record<string, number> = {}
      unpaidPayments.forEach((p: { user_id: string; amount: number }) => {
        balanceMap[p.user_id] = (balanceMap[p.user_id] || 0) + Number(p.amount || 0)
      })

      const eligibleIds = Object.entries(balanceMap)
        .filter(([, bal]) => bal >= DELINQUENT_THRESHOLD)
        .map(([id]) => id)

      if (eligibleIds.length) {
        const { data: activeResidents, error: activeErr } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', eligibleIds)
          .eq('account_status', 'active')

        if (activeErr) {
          delinquencyResult = { success: false, error: activeErr.message }
        } else if (activeResidents?.length) {
          const idsToFlag = activeResidents.map((r: { id: string }) => r.id)
          const { error: updateErr } = await supabase
            .from('profiles')
            .update({ account_status: 'delinquent' })
            .in('id', idsToFlag)

          if (updateErr) {
            delinquencyResult = { success: false, error: updateErr.message }
          } else {
            delinquencyResult = {
              success: true,
              count: idsToFlag.length,
              names: activeResidents.map((r: { full_name: string }) => r.full_name),
            }
            try {
              await supabase.from('system_logs').insert({
                action: 'AUTO_DELINQUENT',
                details: `Marked ${idsToFlag.length} resident(s) as delinquent — unpaid balance ≥ ₱${DELINQUENT_THRESHOLD}. Residents: ${activeResidents
                  .map((r: { full_name: string }) => r.full_name)
                  .join(', ')}`,
              })
            } catch (_e) {
              // Best-effort, same as above.
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ dues: duesResult, delinquency: delinquencyResult }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
})
