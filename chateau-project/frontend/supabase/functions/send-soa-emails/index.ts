// supabase/functions/send-soa-emails/index.ts
// Sends a full SOA HTML email (matching the print SOA layout) to every resident
// with an outstanding balance, via Resend.
//
// No server-side PDF generation — the rich HTML email itself IS the SOA.
// Recipients can File → Print → Save as PDF from their email client if needed.
//
// Secrets required:
//   RESEND_API_KEY=re_...
//   TEST_OVERRIDE_EMAIL=your@email.com  ← remove once domain is verified

import { createClient } from 'npm:@supabase/supabase-js@2'

const MONTHLY = 150

// ── CORS ──────────────────────────────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fc  = (n: number) => `&#8369;${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
const fd  = (d: string | null) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '&mdash;'
const fm  = (d: string | null) => d ? new Date(d).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '&mdash;'

function phtToday() {
  const s = new Date(Date.now() + 8 * 60 * 60 * 1000)
  const y = s.getUTCFullYear()
  const m = String(s.getUTCMonth() + 1).padStart(2, '0')
  const d = String(s.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function buildLineItemBreakdown() {
  const base = [
    { label: 'Security Guard',  category: 'Salaries',    fixedTotal: 22000 },
    { label: 'Electricity',     category: 'Utilities',   fixedTotal: 14000 },
    { label: 'Street Sweepers', category: 'Maintenance', fixedTotal: 1200  },
    { label: 'Water',           category: 'Utilities',   fixedTotal: 400   },
  ]
  const tot = base.reduce((s, i) => s + i.fixedTotal, 0)
  return base.map(i => ({
    label: i.label, category: i.category,
    amount: Math.round((i.fixedTotal / tot) * MONTHLY * 100) / 100,
  }))
}

// ── Full SOA HTML email (mirrors printSOA from Payment.jsx) ───────────────────
function buildEmailHtml(
  resident: { full_name: string; fullAddress: string },
  unpaidList: Array<{ amount: number; due_date: string; statement_date: string|null; reference_no: string|null; status: string; line_items?: Array<{ label:string; category:string; amount:number }>|null }>,
  paidHistory: Array<{ amount: number; due_date: string; paid_at: string|null; payer_reference_no: string|null; reference_no: string|null }>,
): string {
  const today = phtToday()
  const sorted = [...unpaidList].sort((a, b) => new Date(a.due_date || 0).getTime() - new Date(b.due_date || 0).getTime())
  const totalDue = sorted.reduce((s, p) => s + Number(p.amount || 0), 0)
  const isSettled = sorted.length === 0
  const monthsUnpaid = sorted.length

  const latestStmt = isSettled ? null
    : sorted.reduce((l, p) => p.statement_date && p.statement_date > l ? p.statement_date : l, sorted[0]?.statement_date || today)
  const earliestDue = isSettled ? null : sorted[0]?.due_date

  const lineItems = sorted.find(p => Array.isArray(p.line_items) && p.line_items!.length)?.line_items
    || buildLineItemBreakdown()

  // Breakdown rows
  const brkRows = isSettled ? '' : lineItems.map((item, i) => `
    <tr>
      <td style="padding:7px 8px;border-bottom:1px solid #f1f5f9;background:${i%2===0?'#f8fafc':'#fff'};">${item.label}</td>
      <td style="padding:7px 8px;border-bottom:1px solid #f1f5f9;background:${i%2===0?'#f8fafc':'#fff'};">${item.category}</td>
      <td style="padding:7px 8px;border-bottom:1px solid #f1f5f9;text-align:right;background:${i%2===0?'#f8fafc':'#fff'};">${fc(item.amount)}</td>
      <td style="padding:7px 8px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:bold;background:${i%2===0?'#f8fafc':'#fff'};">${fc(item.amount * monthsUnpaid)}</td>
    </tr>`).join('')

  // Outstanding charge rows
  const chgRows = sorted.map((p, i) => `
    <tr>
      <td style="padding:7px 8px;border-bottom:1px solid #f1f5f9;background:${i%2===0?'#fef2f2':'#fff'};">${fm(p.due_date)}</td>
      <td style="padding:7px 8px;border-bottom:1px solid #f1f5f9;background:${i%2===0?'#fef2f2':'#fff'};">Monthly HOA Dues</td>
      <td style="padding:7px 8px;border-bottom:1px solid #f1f5f9;background:${i%2===0?'#fef2f2':'#fff'};">${fd(p.statement_date)}</td>
      <td style="padding:7px 8px;border-bottom:1px solid #f1f5f9;background:${i%2===0?'#fef2f2':'#fff'};">${fd(p.due_date)}</td>
      <td style="padding:7px 8px;border-bottom:1px solid #f1f5f9;background:${i%2===0?'#fef2f2':'#fff'};">${p.reference_no || '&mdash;'}</td>
      <td style="padding:7px 8px;border-bottom:1px solid #f1f5f9;text-align:center;font-weight:bold;color:${p.status==='overdue'?'#dc2626':'#d97706'};text-transform:capitalize;background:${i%2===0?'#fef2f2':'#fff'};">${p.status||'unpaid'}</td>
      <td style="padding:7px 8px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:bold;background:${i%2===0?'#fef2f2':'#fff'};">${fc(p.amount)}</td>
    </tr>`).join('')

  // Payment history rows (last 12)
  const hisRows = paidHistory.slice(0, 12).map((p, i) => `
    <tr>
      <td style="padding:7px 8px;border-bottom:1px solid #f1f5f9;background:${i%2===0?'#f0fdf4':'#fff'};">${fm(p.due_date)}</td>
      <td style="padding:7px 8px;border-bottom:1px solid #f1f5f9;background:${i%2===0?'#f0fdf4':'#fff'};">${fd(p.paid_at)}</td>
      <td style="padding:7px 8px;border-bottom:1px solid #f1f5f9;background:${i%2===0?'#f0fdf4':'#fff'};">${p.payer_reference_no || '&mdash;'}</td>
      <td style="padding:7px 8px;border-bottom:1px solid #f1f5f9;background:${i%2===0?'#f0fdf4':'#fff'};">${p.reference_no || '&mdash;'}</td>
      <td style="padding:7px 8px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:bold;color:#166534;background:${i%2===0?'#f0fdf4':'#fff'};">${fc(p.amount)}</td>
    </tr>`).join('')

  const TH = `background:#006837;color:#fff;text-align:left;padding:8px;font-size:10px;text-transform:uppercase;letter-spacing:.03em;`
  const SEC = `font-size:13px;font-weight:700;color:#006837;margin:22px 0 8px;border-bottom:1px solid #e2e8f0;padding-bottom:6px;`

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Statement of Account &mdash; ${resident.full_name}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;color:#1e293b;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;">
<tr><td align="center" style="padding:32px 16px;">
<table width="680" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);max-width:100%;">

  <!-- HEADER -->
  <tr><td style="background:#006837;padding:24px 32px;">
    <p style="margin:0;font-size:20px;font-weight:900;color:#fff;">HOA Statement of Account</p>
    <p style="margin:4px 0 0;font-size:11px;color:#a7f3d0;">Chateau Real Executive Village Homeowners Association Inc. (CREVHAI) &middot; Generated ${fd(today)}</p>
  </td></tr>

  <tr><td style="padding:28px 32px;">

    <!-- Resident + Address -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      <tr>
        <td width="50%" style="padding-right:8px;">
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 16px;">
            <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;">Resident</div>
            <div style="font-size:13px;font-weight:700;color:#1e293b;margin-top:2px;">${resident.full_name}</div>
          </div>
        </td>
        <td width="50%" style="padding-left:8px;">
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 16px;">
            <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;">Address</div>
            <div style="font-size:13px;font-weight:700;color:#1e293b;margin-top:2px;">${resident.fullAddress || 'N/A'}</div>
          </div>
        </td>
      </tr>
    </table>

    <!-- Date boxes -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td width="50%" style="padding-right:8px;">
          <div style="background:${isSettled?'#f0fdf4':'#eff6ff'};border:1px solid ${isSettled?'#bbf7d0':'#bfdbfe'};border-radius:10px;padding:12px 16px;">
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:${isSettled?'#15803d':'#1d4ed8'};">Statement Date &mdash; Bill Issued</div>
            <div style="font-size:15px;font-weight:900;margin-top:2px;color:${isSettled?'#166534':'#1e3a8a'};">${isSettled?'N/A &mdash; Fully Settled':fd(latestStmt)}</div>
          </div>
        </td>
        <td width="50%" style="padding-left:8px;">
          <div style="background:${isSettled?'#f0fdf4':'#fef2f2'};border:1px solid ${isSettled?'#bbf7d0':'#fecaca'};border-radius:10px;padding:12px 16px;">
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:${isSettled?'#15803d':'#b91c1c'};">Due Date &mdash; Payment Deadline</div>
            <div style="font-size:15px;font-weight:900;margin-top:2px;color:${isSettled?'#166534':'#991b1b'};">${isSettled?'No Pending Dues':fd(earliestDue)}</div>
          </div>
        </td>
      </tr>
    </table>

    <!-- Balance banner -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#fef2f2,#fff);border:2px solid #fecaca;border-radius:14px;margin-bottom:24px;">
      <tr>
        <td style="padding:18px 22px;">
          <div style="font-size:11px;font-weight:700;color:#b91c1c;text-transform:uppercase;letter-spacing:.05em;">Total Outstanding Balance</div>
          <div style="font-size:28px;font-weight:900;color:#dc2626;">${fc(totalDue)}</div>
        </td>
        <td style="padding:18px 22px;text-align:right;">
          <div style="font-size:11px;font-weight:700;color:#b91c1c;text-transform:uppercase;letter-spacing:.05em;">Months Unpaid</div>
          <div style="font-size:22px;font-weight:900;color:#b91c1c;">${monthsUnpaid}</div>
        </td>
      </tr>
    </table>

    <!-- Monthly Due Breakdown -->
    <div style="${SEC}">Monthly Due Breakdown &mdash; What Your &#8369;${MONTHLY}/month Covers</div>
    ${isSettled
      ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 18px;font-size:12px;color:#166534;">No outstanding months to bill right now. Next month's &#8369;${MONTHLY} due will be itemized here once issued.</div>`
      : `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:11px;">
          <thead><tr>
            <th style="${TH}">Item</th><th style="${TH}">Category</th>
            <th style="${TH}text-align:right;">Per Month</th>
            <th style="${TH}text-align:right;">&times; ${monthsUnpaid} Month${monthsUnpaid!==1?'s':''}</th>
          </tr></thead>
          <tbody>${brkRows}</tbody>
          <tfoot><tr>
            <td colspan="3" style="padding:7px 8px;text-align:right;font-weight:bold;background:#f8fafc;">Total:</td>
            <td style="padding:7px 8px;text-align:right;font-weight:900;background:#f8fafc;color:#006837;">${fc(totalDue)}</td>
          </tr></tfoot>
        </table>`}

    <!-- Outstanding Charges -->
    <div style="${SEC}">Outstanding Charges</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:11px;">
      <thead><tr>
        <th style="${TH}">Period</th><th style="${TH}">Description</th>
        <th style="${TH}">Statement Date</th><th style="${TH}">Due Date</th>
        <th style="${TH}">Reference #</th>
        <th style="${TH}text-align:center;">Status</th>
        <th style="${TH}text-align:right;">Amount</th>
      </tr></thead>
      <tbody>${chgRows || `<tr><td colspan="7" style="padding:14px;text-align:center;color:#16a34a;font-weight:bold;">No outstanding balance &mdash; account is fully settled.</td></tr>`}</tbody>
      ${chgRows?`<tfoot><tr>
        <td colspan="6" style="padding:7px 8px;text-align:right;font-weight:bold;background:#fef2f2;">Total Amount Due:</td>
        <td style="padding:7px 8px;text-align:right;font-weight:900;background:#fef2f2;color:#dc2626;">${fc(totalDue)}</td>
      </tr></tfoot>`:''}
    </table>

    ${paidHistory.length?`
    <!-- Recent Payment History -->
    <div style="${SEC}">Recent Payment History</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:11px;">
      <thead><tr>
        <th style="${TH}">Period</th><th style="${TH}">Date Paid</th>
        <th style="${TH}">Your Payment Ref #</th><th style="${TH}">HOA Ref #</th>
        <th style="${TH}text-align:right;">Amount</th>
      </tr></thead>
      <tbody>${hisRows}</tbody>
    </table>`:''}

    <!-- Footer -->
    <p style="margin-top:28px;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:10px;line-height:1.6;">
      This statement reflects account balance as of ${fd(today)}. The statement date shows when this bill was issued;
      the due date is your payment deadline. Please settle outstanding dues at the HOA office or through your
      designated treasurer on or before the due date. For questions, contact the HOA Treasurer's office.
    </p>
    <p style="font-size:10px;color:#cbd5e1;text-align:center;margin-top:8px;">This is an automated message from the CREVHAI billing system. Please do not reply directly to this email.</p>

  </td></tr>
</table>
</td></tr></table>
</body></html>`
}

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
  const RESEND_KEY    = Deno.env.get('RESEND_API_KEY')!
  const TEST_OVERRIDE = Deno.env.get('TEST_OVERRIDE_EMAIL') || null
  const today         = phtToday()

  try {
    // 1. Fetch all unpaid payments
    const { data: unpaidPayments, error: uErr } = await supabase
      .from('payments')
      .select('id, user_id, amount, due_date, statement_date, reference_no, status, line_items')
      .in('status', ['unpaid', 'overdue', 'pending'])
      .order('due_date', { ascending: true })
    if (uErr) { console.error('Fetch unpaid error:', uErr.message); throw new Error(uErr.message) }

    if (!unpaidPayments?.length) {
      return new Response(JSON.stringify({ sent: 0, failed: 0, note: 'No outstanding balances.' }), {
        status: 200, headers: { 'Content-Type': 'application/json', ...CORS },
      })
    }

    const userIds = [...new Set(unpaidPayments.map((p: { user_id: string }) => p.user_id))]

    // 2. Fetch resident profiles
    const { data: residents, error: rErr } = await supabase
      .from('profiles')
      .select('id, full_name, email, block, lot, street')
      .in('id', userIds)
    if (rErr) { console.error('Fetch profiles error:', rErr.message); throw new Error(rErr.message) }

    // 3. Fetch paid history
    const { data: paidPayments, error: pErr } = await supabase
      .from('payments')
      .select('user_id, amount, due_date, paid_at, payer_reference_no, reference_no')
      .in('user_id', userIds)
      .eq('status', 'paid')
      .order('paid_at', { ascending: false })
    if (pErr) { console.error('Fetch paid error:', pErr.message); throw new Error(pErr.message) }

    // 4. Build per-user maps
    const unpaidMap: Record<string, typeof unpaidPayments> = {}
    unpaidPayments.forEach((p: { user_id: string }) => {
      if (!unpaidMap[p.user_id]) unpaidMap[p.user_id] = []
      unpaidMap[p.user_id].push(p)
    })
    const paidMap: Record<string, typeof paidPayments> = {}
    ;(paidPayments || []).forEach((p: { user_id: string }) => {
      if (!paidMap[p.user_id]) paidMap[p.user_id] = []
      if (paidMap[p.user_id].length < 12) paidMap[p.user_id].push(p)
    })

    // 5. Send emails
    let sent = 0, failed = 0
    const errors: string[] = []

    for (const resident of (residents || [])) {
      const unpaidList  = unpaidMap[resident.id] || []
      const paidHistory = paidMap[resident.id]   || []
      if (!unpaidList.length) continue

      const addrParts = [
        resident.block  ? `Blk ${resident.block}` : null,
        resident.lot    ? `Lot ${resident.lot}`   : null,
        resident.street || null,
      ].filter(Boolean)
      const fullAddress = addrParts.join(', ') || 'N/A'
      const totalDue = unpaidList.reduce((s: number, p: { amount: number }) => s + Number(p.amount || 0), 0)
      const recipient = TEST_OVERRIDE || resident.email
      if (!recipient) { failed++; continue }

      console.log(`Sending SOA to ${resident.full_name} (${recipient}) — ${unpaidList.length} unpaid month(s)`)

      const htmlBody = buildEmailHtml(
        { full_name: resident.full_name, fullAddress },
        unpaidList,
        paidHistory,
      )
      const amtStr = `\u20B1${Number(totalDue).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`

      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_KEY}` },
        body: JSON.stringify({
          from: 'CREVHAI Billing (TEST) <onboarding@resend.dev>',
          to: [recipient],
          subject: `HOA Statement of Account \u2014 ${resident.full_name} (${amtStr} due)`,
          html: htmlBody,
        }),
      })

      if (resendRes.ok) {
        sent++
        try {
          await supabase.from('soa_email_log').insert({
            user_id: resident.id, sent_to: recipient, amount_due: totalDue,
          })
        } catch (_e) { /* best-effort audit log */ }
      } else {
        failed++
        const body = await resendRes.text()
        console.error(`Send failed for ${resident.full_name}:`, body)
        errors.push(`${resident.full_name}: ${body}`)
      }
    }

    console.log(`Done. Sent: ${sent}, Failed: ${failed}`)
    return new Response(JSON.stringify({ sent, failed, errors: errors.length ? errors : undefined }), {
      status: 200, headers: { 'Content-Type': 'application/json', ...CORS },
    })

  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error('HANDLER_ERROR:', errMsg)
    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS } },
    )
  }
})
