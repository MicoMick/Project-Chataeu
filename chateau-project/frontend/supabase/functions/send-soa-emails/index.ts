// supabase/functions/send-soa-emails/index.ts
//
// Sends a Statement of Account (SOA) email to every resident who currently
// has an outstanding balance, using Resend.
//
// Deploy with:   supabase functions deploy send-soa-emails
// Set secret:    supabase secrets set RESEND_API_KEY=your_resend_api_key
//
// Call from the frontend with:
//   await supabase.functions.invoke('send-soa-emails')
//
// Or schedule it to run automatically every 1st of the month via
// Supabase's pg_cron (see the SQL snippet at the bottom of this file).

import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const MONTHLY_DUE_AMOUNT = 150;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const fmtCurrency = (n: number) =>
  `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const fmtMonth = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—';

// Builds the same itemized breakdown email-friendly HTML, mirroring printSOA()
// in Payment.jsx so residents see a consistent format whether they print or
// receive it by email.
function buildSoaEmailHtml(resident: any, unpaidList: any[]) {
  const totalDue = unpaidList.reduce((s, p) => s + Number(p.amount || 0), 0);
  const earliestDueDate = unpaidList[0]?.due_date;
  const latestStatementDate = unpaidList.reduce(
    (latest, p) => (p.statement_date && p.statement_date > latest ? p.statement_date : latest),
    unpaidList[0]?.statement_date || null
  );

  const rows = unpaidList
    .map(
      (p, i) => `
      <tr style="background:${i % 2 === 0 ? '#fef2f2' : '#fff'}">
        <td style="padding:8px;">${fmtMonth(p.due_date)}</td>
        <td style="padding:8px;">${fmtDate(p.due_date)}</td>
        <td style="padding:8px;text-align:right;font-weight:bold;">${fmtCurrency(p.amount)}</td>
      </tr>`
    )
    .join('');

  return `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1e293b;">
    <div style="border-bottom:3px solid #006837;padding-bottom:14px;margin-bottom:20px;">
      <h1 style="font-size:18px;color:#006837;margin:0;">HOA Statement of Account</h1>
      <p style="font-size:12px;color:#64748b;margin:4px 0 0;">
        Chateau Real Executive Village Homeowners Association Inc. (CREVHAI)
      </p>
    </div>

    <p style="font-size:14px;">Hi <strong>${resident.full_name}</strong>,</p>
    <p style="font-size:13px;line-height:1.6;color:#334155;">
      This is your monthly Statement of Account. Please see your outstanding balance below.
    </p>

    <div style="background:linear-gradient(135deg,#fef2f2,#fff);border:2px solid #fecaca;border-radius:14px;padding:18px 22px;margin:20px 0;">
      <p style="font-size:10px;font-weight:700;color:#b91c1c;text-transform:uppercase;margin:0 0 4px;">Total Outstanding Balance</p>
      <p style="font-size:26px;font-weight:900;color:#dc2626;margin:0;">${fmtCurrency(totalDue)}</p>
      <p style="font-size:11px;color:#991b1b;margin:8px 0 0;">
        Statement Date: <strong>${fmtDate(latestStatementDate)}</strong> &nbsp;·&nbsp;
        Due Date: <strong>${fmtDate(earliestDueDate)}</strong>
      </p>
    </div>

    <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px;">
      <thead>
        <tr style="background:#006837;color:#fff;">
          <th style="padding:8px;text-align:left;">Period</th>
          <th style="padding:8px;text-align:left;">Due Date</th>
          <th style="padding:8px;text-align:right;">Amount</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <p style="font-size:12px;color:#64748b;line-height:1.6;">
      Please settle your balance on or before the due date at the HOA office or through your designated treasurer.
      For questions, contact the HOA Treasurer's office.
    </p>

    <p style="font-size:11px;color:#94a3b8;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:12px;">
      This is an automated message from the CREVHAI billing system. Please do not reply directly to this email.
    </p>
  </div>`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ── 1. Pull every unpaid/overdue payment, joined with the resident's profile ──
    const { data: unpaidPayments, error: fetchErr } = await supabase
      .from('payments')
      .select('id, user_id, amount, due_date, statement_date, status, profiles(full_name, email)')
      .in('status', ['unpaid', 'overdue', 'pending']);

    if (fetchErr) throw fetchErr;
    if (!unpaidPayments?.length) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No outstanding balances to email.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── 2. Group by resident ──────────────────────────────────────────────
    const byResident: Record<string, { resident: any; items: any[] }> = {};
    for (const p of unpaidPayments) {
      const uid = p.user_id;
      if (!byResident[uid]) {
        byResident[uid] = { resident: p.profiles, items: [] };
      }
      byResident[uid].items.push(p);
    }

    // ── 3. Send one email per resident via Resend ─────────────────────────
    // TEST MODE: while using Resend's resend.dev test domain, every email can
    // only be delivered to the address on your own Resend account. Set
    // TEST_OVERRIDE_EMAIL below to your own email so this function works
    // today without errors. Once you verify your own domain, delete this
    // override block and emails will go to each resident's real address.
    const TEST_OVERRIDE_EMAIL = Deno.env.get('TEST_OVERRIDE_EMAIL') || null;

    const results: { user_id: string; email: string | null; success: boolean; error?: string }[] = [];

    for (const [userId, { resident, items }] of Object.entries(byResident)) {
      const realEmail = resident?.email;
      if (!realEmail) {
        results.push({ user_id: userId, email: null, success: false, error: 'No email on file' });
        continue;
      }

      // While testing: send to your own email instead of the resident's, but
      // still label clearly who it was meant for in the subject line.
      const email = TEST_OVERRIDE_EMAIL || realEmail;

      const html = buildSoaEmailHtml(resident, items);

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // TESTING with Resend's shared test domain (onboarding@resend.dev).
          // This only delivers to the email address on YOUR Resend account —
          // it will NOT reach actual residents until you verify your own
          // domain. Once you buy a domain and verify it in Resend, change
          // this line to e.g. 'CREVHAI Billing <billing@chateaureal.org>'.
          from: 'CREVHAI Billing (TEST) <onboarding@resend.dev>',
          to: email,
          subject: TEST_OVERRIDE_EMAIL
            ? `[TEST — meant for ${resident?.full_name || realEmail}] Your HOA Statement of Account`
            : `Your HOA Statement of Account — ${fmtMonth(new Date().toISOString())}`,
          html,
        }),
      });

      if (!res.ok) {
        const errBody = await res.text();
        results.push({ user_id: userId, email: realEmail, success: false, error: errBody });
        continue;
      }

      results.push({ user_id: userId, email: realEmail, success: true });

      // ── 4. Log that this resident's SOA was emailed, to avoid duplicate sends ──
      // Logs the REAL resident email even in test mode, so the log stays
      // accurate once you switch off TEST_OVERRIDE_EMAIL later.
      await supabase.from('soa_email_log').insert({
        user_id: userId,
        email: realEmail,
        sent_at: new Date().toISOString(),
        total_due: items.reduce((s, p) => s + Number(p.amount || 0), 0),
      });
    }

    const sentCount = results.filter((r) => r.success).length;
    const failedCount = results.length - sentCount;

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        failed: failedCount,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/*
─── Optional: run this automatically every 1st of the month ──────────────────

Supabase supports scheduled Edge Function calls via pg_cron + pg_net.
Run this once in the Supabase SQL Editor (requires the pg_cron and pg_net
extensions, enabled under Database → Extensions):

  select cron.schedule(
    'send-soa-emails-monthly',
    '0 9 1 * *', -- 9:00 AM on the 1st of every month
    $$
    select net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-soa-emails',
      headers := jsonb_build_object(
        'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
        'Content-Type', 'application/json'
      )
    );
    $$
  );

Replace YOUR_PROJECT_REF and YOUR_SERVICE_ROLE_KEY with your actual project
values from Supabase → Project Settings → API.
*/
