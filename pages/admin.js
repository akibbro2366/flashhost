import { useState } from "react";
import Head from "next/head";

export default function Admin() {
  const [secret, setSecret] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState("");

  const fetchSites = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret }),
      });
      const data = await res.json();
      if (res.ok) {
        setSites(data);
        setAuthenticated(true);
      } else {
        setError(data.error || "Access denied.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (slug) => {
    if (!confirm(`Delete /s/${slug}? This cannot be undone.`)) return;
    setDeleting(slug);
    try {
      const res = await fetch("/api/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, slug }),
      });
      if (res.ok) {
        setSites((prev) => prev.filter((s) => s.slug !== slug));
      } else {
        alert("Failed to delete.");
      }
    } catch {
      alert("Network error.");
    } finally {
      setDeleting(null);
    }
  };

  if (!authenticated) {
    return (
      <>
        <Head>
          <title>FlashHost — Admin</title>
        </Head>
        <div className="container" style={{ paddingTop: "15vh" }}>
          <div className="animate-in" style={{ maxWidth: "400px", margin: "0 auto" }}>
            <h1 style={{ fontSize: "1.6rem", marginBottom: "8px" }}>Admin Access</h1>
            <p style={{ color: "var(--text-muted)", marginBottom: "28px", fontSize: "0.85rem" }}>
              Enter your secret to continue.
            </p>
            <input
              className="title-input"
              type="password"
              placeholder="Secret key"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchSites()}
            />
            <button
              className="deploy-btn"
              onClick={fetchSites}
              disabled={!secret || loading}
              style={{ marginTop: "16px" }}
            >
              {loading ? "Checking..." : "Enter →"}
            </button>
            {error && (
              <p style={{ color: "#ff4444", marginTop: "16px", fontSize: "0.85rem", textAlign: "center" }}>
                {error}
              </p>
            )}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>FlashHost — Admin Panel</title>
      </Head>
      <div className="container">
        <header className="header animate-in">
          <div className="logo">
            <span className="logo-dot" />
            FlashHost Admin
          </div>
          <span className="header-tag">{sites.length} sites</span>
        </header>

        <section className="animate-in delay-1">
          <h2 style={{ fontSize: "1.2rem", color: "var(--text-secondary)", marginBottom: "24px", fontWeight: 600 }}>
            All Deployed Sites
          </h2>

          {sites.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>No sites deployed yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", paddingBottom: "80px" }}>
              {sites.map((site, i) => (
                <div
                  key={site.id}
                  className="site-card"
                  style={{
                    opacity: 1,
                    animation: "none",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "16px",
                  }}
                >
                  <a
                    href={`/s/${site.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ flex: 1, minWidth: 0, textDecoration: "none", color: "inherit" }}
                  >
                    <div className="site-card-title">{site.title || "Untitled"}</div>
                    <div className="site-card-slug">/s/{site.slug}</div>
                    <div className="site-card-time">
                      {new Date(site.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </a>
                  <button
                    onClick={() => handleDelete(site.slug)}
                    disabled={deleting === site.slug}
                    style={{
                      background: "rgba(255, 60, 60, 0.1)",
                      border: "1px solid rgba(255, 60, 60, 0.3)",
                      borderRadius: "var(--radius)",
                      color: "#ff4444",
                      padding: "10px 16px",
                      cursor: "pointer",
                      fontSize: "0.8rem",
                      fontFamily: "'DM Mono', monospace",
                      transition: "all 0.25s",
                      whiteSpace: "nowrap",
                      opacity: deleting === site.slug ? 0.5 : 1,
                    }}
                    onMouseOver={(e) => {
                      e.target.style.background = "rgba(255, 60, 60, 0.25)";
                    }}
                    onMouseOut={(e) => {
                      e.target.style.background = "rgba(255, 60, 60, 0.1)";
                    }}
                  >
                    {deleting === site.slug ? "Deleting..." : "Delete"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
