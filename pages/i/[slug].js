import { supabase } from "../../lib/supabase";

export async function getServerSideProps({ params, res }) {
  const { slug } = params;

  const { data: media, error } = await supabase
    .from("media")
    .select("file_name, mime_type, storage_path, file_type")
    .eq("slug", slug)
    .eq("file_type", "image")
    .single();

  if (error || !media) {
    return { notFound: true };
  }

  const storageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${media.storage_path}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta property="og:image" content="${storageUrl}">
  <meta property="og:type" content="image">
  <meta property="twitter:card" content="summary_large_image">
  <meta property="twitter:image" content="${storageUrl}">
  <title>${media.file_name} - FlashHost</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      min-height: 100vh;
      background: #060608;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    img {
      max-width: 100vw;
      max-height: 100vh;
      object-fit: contain;
      cursor: zoom-in;
    }
    img.zoomed {
      max-width: none;
      max-height: none;
      cursor: zoom-out;
    }
    .watermark {
      position: fixed;
      bottom: 12px;
      right: 16px;
      font-family: monospace;
      font-size: 11px;
      color: rgba(255,255,255,0.15);
      text-decoration: none;
      letter-spacing: 0.06em;
      transition: opacity 0.3s;
      z-index: 10;
    }
    .watermark:hover { opacity: 1; color: rgba(0,255,136,0.5); }
  </style>
</head>
<body>
  <img src="${storageUrl}" alt="${media.file_name}" onclick="this.classList.toggle('zoomed')" />
  <a class="watermark" href="/">FlashHost</a>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800");
  res.setHeader("X-Powered-By", "FlashHost");
  res.end(html);

  return { props: {} };
}

export default function ImageViewer() {
  return null;
}
