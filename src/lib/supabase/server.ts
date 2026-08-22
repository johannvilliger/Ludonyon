import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Client Supabase avec la clé service_role : à n'utiliser que côté serveur
 * (Server Actions, Route Handlers, Server Components). Il contourne les
 * policies RLS, donc ne doit jamais être importé dans un composant client.
 */
export function createServiceClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définis (voir .env.local.example).",
    );
  }

  return createClient(url, key, { auth: { persistSession: false } });
}
