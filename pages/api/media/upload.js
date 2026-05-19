import { nanoid } from "nanoid";
import { supabase } from "../../../lib/supabase";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "55mb",
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { fileData, fileName, mimeType, customSlug } = req.body;

  if (!fileData || !fileName || !mimeType) {
    return res.status(400).json({ error: "File data, name, and type are required." });
  }

  // Determine file type
  const isImage = mimeType.startsWith("image/");
  const isVideo = mimeType.startsWith("video/");

  if (!isImage && !isVideo) {
    return res.status(400).json({ error: "Only images and videos are allowed." });
  }

  // Check file size (base64 is ~33% larger than actual file)
  const buffer = Buffer.from(fileData, "base64");
  const fileSizeMB = buffer.length / (1024 * 1024);

  if (isImage && fileSizeMB > 10) {
    return res.status(413).json({ error: "Image too large. Max 10 MB." });
  }

  if (isVideo && fileSizeMB > 50) {
    return res.status(413).json({ error: "Video too large. Max 50 MB." });
  }

  // Generate slug
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
        error: "Custom URL must be at least 2 characters.",
      });
    }

    const { data: existingMedia } = await supabase
      .from("media")
      .select("slug")
      .eq("slug", cleaned)
      .single();

    const { data: existingSite } = await supabase
      .from("sites")
      .select("slug")
      .eq("slug", cleaned)
      .single();

    if (existingMedia || existingSite) {
      return res.status(409).json({
        error: `The URL /${isVideo ? "v" : "i"}/${cleaned} is already taken.`,
      });
    }

    slug = cleaned;
  } else {
    slug = nanoid(8);
  }

  // Determine file extension
  const ext = fileName.split(".").pop().toLowerCase();
  const storagePath = `${slug}/${fileName}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from("media")
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (uploadError) {
    console.error("Storage upload error:", uploadError);
    return res.status(500).json({ error: "Failed to upload file." });
  }

  // Save metadata to database
  const { data, error: dbError } = await supabase
    .from("media")
    .insert({
      slug,
      file_name: fileName,
      file_type: isVideo ? "video" : "image",
      mime_type: mimeType,
      storage_path: storagePath,
      file_size: buffer.length,
    })
    .select("slug, file_type")
    .single();

  if (dbError) {
    console.error("DB insert error:", dbError);
    return res.status(500).json({ error: "Failed to save file info." });
  }

  const prefix = data.file_type === "video" ? "v" : "i";

  return res.status(200).json({
    slug: data.slug,
    url: `/${prefix}/${data.slug}`,
    type: data.file_type,
  });
}
