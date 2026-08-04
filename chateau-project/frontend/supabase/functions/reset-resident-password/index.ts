// supabase/functions/reset-resident-password/index.ts
// Lets a Super Admin reset a resident's password. Runs server-side so the
// service role key never has to live in the browser (the new sb_secret_ key
// format actively refuses browser-origin requests, and even the legacy key
// shouldn't be shipped to the client).
//
// Caller must be an authenticated, existing super_admin — verified below via
// their JWT before any privileged action runs.

import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '')
    if (!jwt) return json({ error: 'Missing authorization' }, 401)

    const { data: { user: caller }, error: callerErr } = await admin.auth.getUser(jwt)
    if (callerErr || !caller) return json({ error: 'Invalid session' }, 401)

    const { data: callerAdmin } = await admin
      .from('admins')
      .select('role')
      .eq('id', caller.id)
      .maybeSingle()

    if (callerAdmin?.role !== 'super_admin') {
      return json({ error: 'Forbidden: super admin access required' }, 403)
    }

    const { residentId, newPassword } = await req.json()
    if (!residentId || !newPassword) {
      return json({ error: 'Missing required fields' }, 400)
    }
    if (newPassword.length < 8) {
      return json({ error: 'Password must be at least 8 characters.' }, 400)
    }

    const { error: pwErr } = await admin.auth.admin.updateUserById(residentId, { password: newPassword })
    if (pwErr) return json({ error: pwErr.message }, 400)

    return json({ success: true }, 200)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return json({ error: msg }, 500)
  }
})
