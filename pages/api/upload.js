import { nanoid } from "nanoid";
import JSZip from "jszip";
import { supabase } from "../../lib/supabase";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "5mb",
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { html, title, customSlug, zipData } = req.body;

  let slug;

  if (customSlug && customSlug.trim().length > 0) {
    const cleaned = customSlug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 32);

    if (cleaned.length < 2) {
      return res.status(400).json({
        error: "Custom URL must be at least 2 characters (letters, numbers, dashes).",
      });
    }

    const { data: existing } = await supabase
      .from("sites")
      .select("slug")
      .eq("slug", cleaned)
      .single();

    if (existing) {
      return res.status(409).json({
        error: `The URL /s/${cleaned} is already taken. Try another.`,
      });
    }

    slug = cleaned;
  } else {
    slug = nanoid(8);
  }

  // Handle ZIP upload
  if (zipData) {
    try {
      const zipBuffer = Buffer.from(zipData, "base64");
      const zip = await JSZip.loadAsync(zipBuffer);

      const files = Object.keys(zip.files);
      const uploadPromises = [];

      for (const filePath of files) {
        const file = zip.files[filePath];
        if (file.dir) continue;

        const content = await file.async("nodebuffer");
        const storagePath = `${slug}/${filePath}`;

        let contentType = "application/octet-stream";
        if (filePath.endsWith(".html")) contentType = "text/html";
        else if (filePath.endsWith(".css")) contentType = "text/css";
        else if (filePath.endsWith(".js")) contentType = "application/javascript";
        else if (filePath.endsWith(".json")) contentType = "application/json";
        else if (filePath.endsWith(".svg")) contentType = "image/svg+xml";
        else if (filePath.endsWith(".png")) contentType = "image/png";
        else if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) contentType = "image/jpeg";
        else if (filePath.endsWith(".gif")) contentType = "image/gif";
        else if (filePath.endsWith(".webp")) contentType = "image/webp";
        else if (filePath.endsWith(".woff")) contentType = "font/woff";
        else if (filePath.endsWith(".woff2")) contentType = "font/woff2";
        else if (filePath.endsWith(".ttf")) contentType = "font/ttf";

        uploadPromises.push(
          supabase.storage.from("sites").upload(storagePath, content, {
            contentType,
            upsert: true,
          })
        );
      }

      await Promise.all(uploadPromises);

      const { error } = await supabase.from("sites").insert({
        slug,
        html_content: "",
        title: (title || "Untitled").slice(0, 255),
        type: "zip",
      });

      if (error) {
        console.error("Supabase insert error:", error);
        return res.status(500).json({ error: "Failed to deploy. Try again." });
      }

      return res.status(200).json({
        slug,
        url: `/s/${slug}`,
        title: (title || "Untitled").slice(0, 255),
        type: "zip",
      });
    } catch (err) {
      console.error("ZIP processing error:", err);
      return res.status(500).json({ error: "Failed to process ZIP file." });
    }
  }

  // Handle plain HTML upload
  if (!html || typeof html !== "string" || html.trim().length === 0) {
    return res.status(400).json({ error: "HTML content is required." });
  }

  if (html.length > 1_048_576) {
    return res.status(413).json({ error: "Content too large (max 1 MB)." });
  }

  const { data, error } = await supabase
    .from("sites")
    .insert({
      slug,
      html_content: html,
      title: (title || "Untitled").slice(0, 255),
      type: "html",
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
    type: "html",
  });
}
