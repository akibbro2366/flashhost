import { supabase } from "../../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { data, error } = await supabase
    .from("sites")
    .select("id, slug, title, created_at")
    .order("created_at", { ascending: false })
    .limit(24);

  if (error) {
    return res.status(500).json({ error: "Failed to fetch sites." });
  }

  return res.status(200).json(data);
}
