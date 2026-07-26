import { supabase } from "@/integrations/supabase/client";
import { recordLogout } from "./udcs.functions";

const LOG_KEY = "udcs_login_log_id";

export function storeLogId(id: string) {
  try {
    localStorage.setItem(LOG_KEY, id);
  } catch {
    /* ignore */
  }
}

export async function signOutWithLogging() {
  let logId: string | null = null;
  try {
    logId = localStorage.getItem(LOG_KEY);
    localStorage.removeItem(LOG_KEY);
  } catch {
    logId = null;
  }
  if (logId) {
    try {
      await recordLogout({ data: { logId } });
    } catch {
      /* logging is best-effort */
    }
  }
  await supabase.auth.signOut();
}

export async function isAdminUser(userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return Boolean(data);
}
