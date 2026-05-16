import { useState, useEffect, useCallback, useRef } from "react";
import Head from "next/head";

export default function Home() {
  const [html, setHtml] = useState("");
  const [title, setTitle] = useState("");
  const [deploying, setDeploying] = useState(false);
  const [result, setResult] = useState(null);
  const [recentSites, setRecentSites] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileName, setFileName] = useState("");
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetch("/api/sites")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setRecentSites(data);
      })
      .catch(() => {});
  }, []);

  const handleFile = useCallback(
    (file) => {
      if (!file) return;
      if (file.size > 1_048_576) {
        alert("File too large. Max 1 MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        setHtml(e.target.result);
        setFileName(file.name);
        if (!title) setTitle(file.name.replace(/\.html?$/i, ""));
      };
      reader.readAsText(file);
    },
    [title]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragOver(false);
      handleFile(e.dataTransfer.files[0]);
    },
    [handleFile]
  );

  const handleDeploy = async () => {
    if (!html.trim()) return;
    setDeploying(true);
    setResult(null);
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html, title: title || "Untitled" }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
        setHtml("");
        setTitle("");
        setFileName("");
        const sitesRes = await fetch("/api/sites");
        const sites = await sitesRes.json();
        if (Array.isArray(sites)) setRecentSites(sites);
      } else {
        alert(data.error || "Something went wrong");
      }
    } catch {
      alert("Network error — try again.");
    } finally {
      setDeploying(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    const full = window.location.origin + result.url;
    await navigator.clipboard.writeText(full);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const canDeploy = html.trim().length > 0 && !deploying;

  return (
    <>
      <Head>
        <title>FlashHost — Ship HTML in Seconds</title>
        <meta name="description" content="Drop a file. Get a live URL. No accounts. No fees. Ever." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>" />
      </Head>

      <div className="container">
        <header className="header animate-in">
          <div className="logo">
            <span className="logo-dot" />
            FlashHost
          </div>
          <span className="header-tag">Free forever</span>
        </header>

        <section className="hero animate-in delay-1">
          <h1>Ship HTML<br />in seconds.</h1>
          <p>Drop a file. Get a live URL.<br />No accounts. No fees. Ever.</p>
        </section>

        <section className="animate-in delay-2">
          <div
            className={`upload-zone ${isDragOver ? "dragover" : ""}`}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onClick={() => fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" accept=".html,.htm" hidden onChange={(e) => handleFile(e.target.files?.[0])} />
            {fileName ? (
              <>
                <div className="drop-icon">&#128196;</div>
                <div className="drop-text file-loaded">{fileName}</div>
                <div className="drop-hint">File loaded — ready to deploy</div>
              </>
            ) : (
              <>
                <div className="drop-icon">&#9729;&#65039;</div>
                <div className="drop-text">Drop your HTML file here</div>
                <div className="drop-hint">or click to browse · max 1 MB</div>
              </>
            )}
          </div>

          <div className="divider">or paste code</div>

          <textarea
            className="code-textarea"
            placeholder={'<!DOCTYPE html>\n<html>\n  <body>\n    <h1>Hello, world!</h1>\n  </body>\n</html>'}
            value={html}
            onChange={(e) => { setHtml(e.target.value); setFileName(""); }}
            rows={10}
          />

          <input className="title-input" type="text" placeholder="Site title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />

          <button className={`deploy-btn ${deploying ? "loading" : ""}`} onClick={handleDeploy} disabled={!canDeploy}>
            {deploying ? "Deploying..." : "Deploy →"}
          </button>

          {result && (
            <div className="result">
              <div className="result-header"><span>&#10003;</span> Your site is live</div>
              <div className="result-url">
                <code>{typeof window !== "undefined" ? window.location.origin : ""}{result.url}</code>
              </div>
              <div className="result-actions">
                <button className={`btn-secondary ${copied ? "copied" : ""}`} onClick={handleCopy}>
                  {copied ? "✓ Copied" : "Copy URL"}
                </button>
                <a className="btn-secondary" href={result.url} target="_blank" rel="noopener noreferrer">
                  Open site ↗
                </a>
              </div>
            </div>
          )}
        </section>

        {recentSites.length > 0 && (
          <section className="recent animate-in delay-3">
            <h2>Recently deployed</h2>
            <div className="sites-grid">
              {recentSites.map((site, i) => (
                <a key={site.id} href={`/s/${site.slug}`} target="_blank" rel="noopener noreferrer" className="site-card" style={{ animationDelay: `${0.35 + i * 0.06}s` }}>
                  <div className="site-card-title">{site.title || "Untitled"}</div>
                  <div className="site-card-slug">/s/{site.slug}</div>
                  <div className="site-card-time">
                    {new Date(site.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
