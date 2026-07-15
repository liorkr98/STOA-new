"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  assertContactRateLimit,
  insertContactMessage,
  parseContactTopic,
  updateContactMessageStatus,
  type ContactStatus,
} from "@/lib/db/contact";
import { sendContactSlackAlert } from "@/lib/slack/contact-alert";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in to continue");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") throw new Error("Admin only");
  return { supabase, userId: user.id };
}

export async function submitContactMessage(formData: FormData) {
  const honeypot = String(formData.get("company_website") ?? "").trim();
  if (honeypot) {
    redirect("/contact?submitted=1");
  }

  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const email = String(formData.get("email") ?? "").trim().slice(0, 320).toLowerCase();
  const topic = parseContactTopic(String(formData.get("topic") ?? "general"));
  const subject = String(formData.get("subject") ?? "").trim().slice(0, 200);
  const message = String(formData.get("message") ?? "").trim().slice(0, 5000);

  if (!name || !email || !subject || message.length < 10) {
    throw new Error("Please fill in all required fields");
  }
  if (!email.includes("@")) {
    throw new Error("Enter a valid email address");
  }

  const allowed = await assertContactRateLimit(email);
  if (!allowed) {
    throw new Error("Too many messages from this email. Try again in an hour.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const row = await insertContactMessage({
    name,
    email,
    topic,
    subject,
    message,
    userId: user?.id ?? null,
  });

  await sendContactSlackAlert({
    id: row.id,
    name: row.name,
    email: row.email,
    topic: row.topic,
    subject: row.subject,
    message: row.message,
    submittedAt: row.submitted_at,
  });

  redirect("/contact?submitted=1");
}

export async function markContactMessageStatus(id: string, status: ContactStatus) {
  await requireAdmin();
  await updateContactMessageStatus(id, status);
  revalidatePath("/admin/contact");
}
