import { supabase } from "@/lib/supabaseClient";
import { getPfpUrl } from "@/lib/userProfile";

export type MemberRosterEntry = {
  id: string;
  nickname_th: string;
  url: string;
};

export async function fetchMemberRoster(): Promise<MemberRosterEntry[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, nickname_th")
    .order("id", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row, index) => ({
    id: String(row.id),
    nickname_th: row.nickname_th?.trim() || `สมาชิก ${row.id}`,
    url: getPfpUrl(index),
  }));
}
