import { supabase } from "../../../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { secret } = req.body;

  if (secret !== process.env.admin_secret) {
    return res.status(403).json({ error: "Access denied." });
  }

  const { data, error } = await supabase
    .from("media")
    .select("id, slug, file_name, file_type, mime_type, file_size, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({ error: "Failed to fetch media." });
  }

  return res.status(200).json(data);
}
