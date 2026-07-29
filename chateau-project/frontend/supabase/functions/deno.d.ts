// Ambient type declarations for the Deno Edge Function runtime.
//
// This file only exists to stop VS Code's TypeScript language service from
// flagging `Deno` and the `npm:` module specifier as unknown when editing
// these files without the Deno VS Code extension installed. Supabase's
// actual Edge Function runtime provides both of these at deploy time — this
// declares no new behavior, it just describes what's already there.

declare const Deno: {
  env: {
    get(key: string): string | undefined
  }
  serve(handler: (req: Request) => Response | Promise<Response>): void
}

declare module 'npm:@supabase/supabase-js@2' {
  export * from '@supabase/supabase-js'
}
