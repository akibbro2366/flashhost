import { supabase } from "../../../lib/supabase";

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

  // Get file info first
  const { data: media, error: fetchError } = await supabase
    .from("media")
    .select("storage_path")
    .eq("slug", slug)
    .single();

  if (fetchError || !media) {
    return res.status(404).json({ error: "Media not found." });
  }

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from("media")
    .remove([media.storage_path]);

  if (storageError) {
    console.error("Storage delete error:", storageError);
  }

  // Delete from database
  const { error: dbError } = await supabase
    .from("media")
    .delete()
    .eq("slug", slug);

  if (dbError) {
    console.error("DB delete error:", dbError);
    return res.status(500).json({ error: "Failed to delete." });
  }

  return res.status(200).json({ success: true });
}
