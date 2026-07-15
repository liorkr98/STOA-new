import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type ContactTopic =
  | "general"
  | "support"
  | "sales"
  | "press"
  | "accessibility"
  | "other";

export type ContactStatus = "new" | "read" | "archived";

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  topic: ContactTopic;
  subject: string;
  message: string;
  user_id: string | null;
  status: ContactStatus;
  submitted_at: string;
}

export interface SubmitContactInput {
  name: string;
  email: string;
  topic: ContactTopic;
  subject: string;
  message: string;
  userId?: string | null;
}

const TOPICS = new Set<ContactTopic>([
  "general",
  "support",
  "sales",
  "press",
  "accessibility",
  "other",
]);

export function parseContactTopic(value: string): ContactTopic {
  return TOPICS.has(value as ContactTopic) ? (value as ContactTopic) : "general";
}

export async function insertContactMessage(
  input: SubmitContactInput,
): Promise<ContactMessage> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contact_messages")
    .insert({
      name: input.name,
      email: input.email,
      topic: input.topic,
      subject: input.subject,
      message: input.message,
      user_id: input.userId ?? null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as ContactMessage;
}

export async function listContactMessages(): Promise<ContactMessage[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contact_messages")
    .select("*")
    .order("submitted_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as ContactMessage[]) ?? [];
}

export async function updateContactMessageStatus(
  id: string,
  status: ContactStatus,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("contact_messages").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function assertContactRateLimit(email: string): Promise<boolean> {
  const admin = createAdminClient();
  const rateKey = `contact:${email.toLowerCase()}`;
  const { data, error } = await admin.rpc("check_rate_limit", {
    p_rate_key: rateKey,
    p_window_seconds: 3600,
    p_max_requests: 5,
  });

  if (error) throw new Error(error.message);
  return Boolean(data);
}
