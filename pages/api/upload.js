import { nanoid } from "nanoid";
import { supabase } from "../../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { html, title } = req.body;

  if (!html || typeof html !== "string" || html.trim().length === 0) {
    return res.status(400).json({ error: "HTML content is required." });
  }

  if (html.length > 1_048_576) {
    return res.status(413).json({ error: "Content too large (max 1 MB)." });
  }

  const slug = nanoid(8);

  const { data, error } = await supabase
    .from("sites")
    .insert({
      slug,
      html_content: html,
      title: (title || "Untitled").slice(0, 255),
    })
    .select("slug, title")
    .single();

  if (error) {
    console.error("Supabase insert error:", error);
    return res.status(500).json({ error: "Failed to deploy. Try again." });
  }

  return res.status(200).json({
    slug: data.slug,
    url: `/s/${data.slug}`,
    title: data.title,
  });
}
