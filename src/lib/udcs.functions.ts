import { createServerFn } from "@tanstack/react-start";
import { getRequest, getRequestIP } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type StudentInput = {
  first_name: string;
  last_name: string;
  matric_number: string;
  faculty: string;
  department: string;
  level: string;
  email: string;
  phone: string;
  password?: string;
};

/**
 * Idempotently provisions the demo admin + login accounts for the seeded students.
 * Safe to call repeatedly: existing accounts are skipped.
 */
export const provisionDemoAccounts = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const adminEmail = "admin@unidel.edu.ng";
  const adminPassword = "admin1234";

  const { data: existingAdmin } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("role", "admin")
    .limit(1);

  if (!existingAdmin || existingAdmin.length === 0) {
    const created = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { name: "UDCS Administrator" },
    });
    let adminId = created.data.user?.id;
    if (!adminId) {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      adminId = list?.users.find((u) => u.email === adminEmail)?.id;
    }
    if (adminId) {
      await supabaseAdmin.from("user_roles").insert({ user_id: adminId, role: "admin" });
    }
  }

  const { data: students } = await supabaseAdmin
    .from("students")
    .select("id, email")
    .is("user_id", null);

  for (const student of students ?? []) {
    const created = await supabaseAdmin.auth.admin.createUser({
      email: student.email,
      password: "student1234",
      email_confirm: true,
    });
    let uid = created.data.user?.id;
    if (!uid) {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      uid = list?.users.find((u) => u.email === student.email)?.id;
    }
    if (uid) {
      await supabaseAdmin.from("students").update({ user_id: uid }).eq("id", student.id);
      await supabaseAdmin.from("user_roles").upsert(
        { user_id: uid, role: "student" },
        { onConflict: "user_id,role" },
      );
    }
  }

  return { ok: true, adminEmail, adminPassword, studentPassword: "student1234" };
});

/** Records a login event (browser + IP captured server-side). Returns the log id. */
export const recordLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const request = getRequest();
    const browser = request?.headers.get("user-agent") ?? "Unknown";
    let ip = "unknown";
    try {
      ip = getRequestIP({ xForwardedFor: true }) ?? "unknown";
    } catch {
      ip = "unknown";
    }

    const { data: student } = await context.supabase
      .from("students")
      .select("id")
      .eq("user_id", context.userId)
      .maybeSingle();

    const { data, error } = await context.supabase
      .from("login_logs")
      .insert({
        user_id: context.userId,
        student_id: student?.id ?? null,
        browser,
        ip_address: ip,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return { logId: data.id as string };
  });

/** Stamps logout_time on a login log row owned by the caller. */
export const recordLogout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { logId: string }) => z.object({ logId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await context.supabase
      .from("login_logs")
      .update({ logout_time: new Date().toISOString() })
      .eq("id", data.logId)
      .eq("user_id", context.userId);
    return { ok: true };
  });

/** Admin: create a student record together with its login account. */
export const createStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: StudentInput) =>
    z
      .object({
        first_name: z.string().trim().min(1).max(80),
        last_name: z.string().trim().min(1).max(80),
        matric_number: z.string().trim().min(3).max(40),
        faculty: z.string().trim().min(2).max(120),
        department: z.string().trim().min(2).max(120),
        level: z.string().trim().min(1).max(10),
        email: z.string().trim().email().max(255),
        phone: z.string().trim().max(30),
        password: z.string().min(8).max(72),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const created = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (created.error) throw new Error(created.error.message);
    const uid = created.data.user!.id;

    const { error } = await supabaseAdmin.from("students").insert({
      user_id: uid,
      first_name: data.first_name,
      last_name: data.last_name,
      matric_number: data.matric_number,
      faculty: data.faculty,
      department: data.department,
      level: data.level,
      email: data.email,
      phone: data.phone,
    });
    if (error) {
      await supabaseAdmin.auth.admin.deleteUser(uid);
      throw new Error(error.message);
    }
    await supabaseAdmin.from("user_roles").upsert(
      { user_id: uid, role: "student" },
      { onConflict: "user_id,role" },
    );
    return { ok: true };
  });

/** Admin: delete a student record and its login account. */
export const deleteStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: student } = await supabaseAdmin
      .from("students")
      .select("user_id")
      .eq("id", data.id)
      .maybeSingle();

    await supabaseAdmin.from("students").delete().eq("id", data.id);
    if (student?.user_id) {
      await supabaseAdmin.auth.admin.deleteUser(student.user_id);
    }
    return { ok: true };
  });
