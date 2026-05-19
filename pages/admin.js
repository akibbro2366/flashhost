import { useState } from "react";
import Head from "next/head";

export default function Admin() {
  const [secret, setSecret] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [sites, setSites] = useState([]);
  const [media, setMedia] = useState([]);
  const [activeTab, setActiveTab] = useState("sites");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [sitesRes, mediaRes] = await Promise.all([
        fetch("/api/admin/sites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ secret }),
        }),
        fetch("/api/media/list", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ secret }),
        }),
      ]);

      const sitesData = await sitesRes.json();
      const mediaData = await mediaRes.json();

      if (sitesRes.ok) {
        setSites(sitesData);
      } else {
        setError(sitesData.error || "Access denied.");
        setLoading(false);
        return;
      }

      if (mediaRes.ok) {
        setMedia(mediaData);
      }

      setAuthenticated(true);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSite = async (slug) => {
    if (!confirm(`Delete website /s/${slug}? This cannot be undone.`)) return;
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

  const handleDeleteMedia = async (slug) => {
    if (!confirm(`Delete media /${slug}? This cannot be undone.`)) return;
    setDeleting(slug);
    try {
      const res = await fetch("/api/media/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, slug }),
      });
      if (res.ok) {
        setMedia((prev) => prev.filter((m) => m.slug !== slug));
      } else {
        alert("Failed to delete.");
      }
    } catch {
      alert("Network error.");
    } finally {
      setDeleting(null);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return "—";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ─── Login screen ───────────────────────────

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
              onKeyDown={(e) => e.key === "Enter" && fetchData()}
            />
            <button
              className="deploy-btn"
              onClick={fetchData}
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

  // ─── Admin panel ────────────────────────────

  const totalItems = sites.length + media.length;

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
          <span className="header-tag">{totalItems} items</span>
        </header>

        {/* ─── Admin Tabs ─── */}
        <div className="tabs animate-in delay-1" style={{ marginBottom: "28px" }}>
          <button
            className={`tab ${activeTab === "sites" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("sites")}
          >
            Websites ({sites.length})
          </button>
          <button
            className={`tab ${activeTab === "media" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("media")}
          >
            Media ({media.length})
          </button>
        </div>

        {/* ─── Websites List ─── */}
        {activeTab === "sites" && (
          <section className="animate-in delay-1">
            {sites.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", paddingBottom: "80px" }}>
                No websites deployed yet.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", paddingBottom: "80px" }}>
                {sites.map((site) => (
                  <div
                    key={site.id}
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius)",
                      padding: "20px",
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
                      <div className="site-card-time">{formatDate(site.created_at)}</div>
                    </a>
                    <button
                      onClick={() => handleDeleteSite(site.slug)}
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
        )}

        {/* ─── Media List ─── */}
        {activeTab === "media" && (
          <section className="animate-in delay-1">
            {media.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", paddingBottom: "80px" }}>
                No media uploaded yet.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", paddingBottom: "80px" }}>
                {media.map((item) => {
                  const prefix = item.file_type === "video" ? "v" : "i";
                  return (
                    <div
                      key={item.id}
                      style={{
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius)",
                        padding: "20px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "16px",
                      }}
                    >
                      <a
                        href={`/${prefix}/${item.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ flex: 1, minWidth: 0, textDecoration: "none", color: "inherit" }}
                      >
                        <div className="site-card-title">
                          {item.file_type === "video" ? "\u{1F3AC}" : "\u{1F5BC}\uFE0F"} {item.file_name}
                        </div>
                        <div className="site-card-slug">
                          /{prefix}/{item.slug}
                        </div>
                        <div className="site-card-time">
                          {formatSize(item.file_size)} {"\u00B7"} {formatDate(item.created_at)}
                        </div>
                      </a>
                      <button
                        onClick={() => handleDeleteMedia(item.slug)}
                        disabled={deleting === item.slug}
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
                          opacity: deleting === item.slug ? 0.5 : 1,
                        }}
                        onMouseOver={(e) => {
                          e.target.style.background = "rgba(255, 60, 60, 0.25)";
                        }}
                        onMouseOut={(e) => {
                          e.target.style.background = "rgba(255, 60, 60, 0.1)";
                        }}
                      >
                        {deleting === item.slug ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </>
  );
}
