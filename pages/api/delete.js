import { supabase } from "../../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { secret, slug } = req.body;

  if (secret !== process.env.admin_secret) {
    return res.status(403).json({ error: "Invalid secret." });
  }

  if (!slug) {
    return res.status(400).json({ error: "Slug is required." });
  }

  const { error } = await supabase
    .from("sites")
    .delete()
    .eq("slug", slug);

  if (error) {
    console.error("Delete error:", error);
    return res.status(500).json({ error: "Failed to delete." });
  }

  return res.status(200).json({ success: true });
}
