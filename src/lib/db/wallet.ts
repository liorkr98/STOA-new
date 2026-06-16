import { createClient } from "@/lib/supabase/server";
import type { Wallet, WalletTransaction } from "@/lib/types";

export async function getWallet(ownerId: string): Promise<Wallet | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("wallets")
    .select("*")
    .eq("owner_id", ownerId)
    .maybeSingle();
  return (data as Wallet) ?? null;
}

export async function listTransactions(
  ownerId: string,
  limit = 50,
): Promise<WalletTransaction[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("wallet_transactions")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as WalletTransaction[]) ?? [];
}
