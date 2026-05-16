import { supabase } from "../../lib/supabase";

export async function getServerSideProps({ params, res }) {
  const { slug } = params;

  const { data, error } = await supabase
    .from("sites")
    .select("html_content, type")
    .eq("slug", slug)
    .single();

  if (error || !data) {
    return { notFound: true };
  }

  // Handle ZIP site
  if (data.type === "zip") {
    const { data: fileList } = await supabase.storage
      .from("sites")
      .list(slug, { limit: 100, sortBy: { column: "name", order: "asc" } });

    if (!fileList || fileList.length === 0) {
      return { notFound: true };
    }

    // Find index.html at root or in any subfolder
    let indexPath = null;

    const rootIndex = fileList.find((f) => f.name === "index.html");
    if (rootIndex) {
      indexPath = `${slug}/index.html`;
    } else {
      // Search in subfolders
      for (const file of fileList) {
        if (file.id === null) {
          // It's a folder, check inside
          const { data: subFiles } = await supabase.storage
            .from("sites")
            .list(`${slug}/${file.name}`, { limit: 100 });

          if (subFiles) {
            const subIndex = subFiles.find((f) => f.name === "index.html");
            if (subIndex) {
              indexPath = `${slug}/${file.name}/index.html`;
              break;
            }
          }
        }
      }
    }

    if (!indexPath) {
      // Use first HTML file found
      const firstHtml = fileList.find((f) => f.name.endsWith(".html"));
      if (firstHtml) {
        indexPath = `${slug}/${firstHtml.name}`;
      } else {
        return { notFound: true };
      }
    }

    const { data: htmlFile } = await supabase.storage
      .from("sites")
      .download(indexPath);

    if (!htmlFile) {
      return { notFound: true };
    }

    let htmlText = await htmlFile.text();

    // Rewrite relative URLs to point to Supabase Storage
    const storageBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/sites/${slug}/`;

    // Fix src="..." and href="..." that are relative paths
    htmlText = htmlText.replace(
      /(src|href)=(["'])(?!https?:\/\/|data:|#|\/\/)([^"']*?)\2/g,
      `$1=$2${storageBase}$3$2`
    );

    // Fix url() in inline styles
    htmlText = htmlText.replace(
      /url$$(["']?)(?!https?:\/\/|data:|#|\/\/)([^"')]*?)\1$$/g,
      `url($1${storageBase}$2$1)`
    );

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400");
    res.setHeader("X-Powered-By", "FlashHost");
    res.end(htmlText);

    return { props: {} };
  }

  // Handle plain HTML site
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400");
  res.setHeader("X-Powered-By", "FlashHost");
  res.end(data.html_content);

  return { props: {} };
}

export default function HostedSite() {
  return null;
}
