import { supabase } from "../../lib/supabase";

export async function getServerSideProps({ params, res }) {
  const { slug } = params;

  const { data, error } = await supabase
    .from("sites")
    .select("html_content")
    .eq("slug", slug)
    .single();

  if (error || !data) {
    return { notFound: true };
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400");
  res.setHeader("X-Powered-By", "FlashHost");
  res.end(data.html_content);

  return { props: {} };
}

export default function HostedSite() {
  return null;
}
