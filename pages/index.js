import { useState, useEffect, useCallback, useRef } from "react";
import Head from "next/head";
import QRCode from "qrcode";

export default function Home() {
  const [activeTab, setActiveTab] = useState("website");

  // Website state
  const [html, setHtml] = useState("");
  const [title, setTitle] = useState("");
  const [customSlug, setCustomSlug] = useState("");
  const [deploying, setDeploying] = useState(false);
  const [result, setResult] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [recentSites, setRecentSites] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState("");
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef(null);

  // Media state
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaFileName, setMediaFileName] = useState("");
  const [mediaUploading, setMediaUploading] = useState(false);
  const [mediaResult, setMediaResult] = useState(null);
  const [mediaQrDataUrl, setMediaQrDataUrl] = useState("");
  const [mediaCustomSlug, setMediaCustomSlug] = useState("");
  const [mediaCopied, setMediaCopied] = useState(false);
  const [mediaDragOver, setMediaDragOver] = useState(false);
  const mediaInputRef = useRef(null);

  useEffect(() => {
    fetch("/api/sites")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setRecentSites(data);
      })
      .catch(() => {});
  }, []);

  // ─── Website handlers ───────────────────────────

  const handleFile = useCallback(
    (file) => {
      if (!file) return;
      const name = file.name.toLowerCase();

      if (name.endsWith(".html") || name.endsWith(".htm")) {
        if (file.size > 1_048_576) {
          alert("File too large. Max 1 MB for HTML files.");
          return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
          setHtml(e.target.result);
          setFileName(file.name);
          setFileType("html");
          if (!title) setTitle(file.name.replace(/\.html?$/i, ""));
        };
        reader.readAsText(file);
      } else if (name.endsWith(".zip")) {
        if (file.size > 5_242_880) {
          alert("File too large. Max 5 MB for ZIP files.");
          return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = e.target.result.split(",")[1];
          setHtml(base64);
          setFileName(file.name);
          setFileType("zip");
          if (!title) setTitle(file.name.replace(/\.zip$/i, ""));
        };
        reader.readAsDataURL(file);
      } else {
        alert("Please upload an HTML or ZIP file.");
      }
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

  const generateQR = async (url) => {
    try {
      const fullUrl = window.location.origin + url;
      const dataUrl = await QRCode.toDataURL(fullUrl, {
        width: 280,
        margin: 2,
        color: { dark: "#e8e8ec", light: "#00000000" },
        errorCorrectionLevel: "M",
      });
      setQrDataUrl(dataUrl);
    } catch (err) {
      console.error("QR generation failed:", err);
    }
  };

  const handleDeploy = async () => {
    if (fileType === "zip") {
      if (!html) return;
    } else {
      if (!html.trim()) return;
    }

    setDeploying(true);
    setResult(null);
    setQrDataUrl("");

    try {
      const body = {
        title: title || "Untitled",
        customSlug: customSlug.trim(),
      };

      if (fileType === "zip") {
        body.zipData = html;
      } else {
        body.html = html;
      }

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
        generateQR(data.url);
        setHtml("");
        setTitle("");
        setCustomSlug("");
        setFileName("");
        setFileType("");
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

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.download = `flashhost-${result?.slug || "qr"}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const canDeploy =
    (fileType === "zip" ? html.length > 0 : html.trim().length > 0) &&
    !deploying;

  // ─── Media handlers ─────────────────────────────

  const handleMediaSelect = useCallback((file) => {
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      alert("Only images and videos are allowed.");
      return;
    }

    if (isImage && file.size > 10_485_760) {
      alert("Image too large. Max 10 MB.");
      return;
    }

    if (isVideo && file.size > 52_428_800) {
      alert("Video too large. Max 50 MB.");
      return;
    }

    setMediaFile(file);
    setMediaFileName(file.name);
  }, []);

  const handleMediaDrop = useCallback(
    (e) => {
      e.preventDefault();
      setMediaDragOver(false);
      handleMediaSelect(e.dataTransfer.files[0]);
    },
    [handleMediaSelect]
  );

  const generateMediaQR = async (url) => {
    try {
      const fullUrl = window.location.origin + url;
      const dataUrl = await QRCode.toDataURL(fullUrl, {
        width: 280,
        margin: 2,
        color: { dark: "#e8e8ec", light: "#00000000" },
        errorCorrectionLevel: "M",
      });
      setMediaQrDataUrl(dataUrl);
    } catch (err) {
      console.error("QR generation failed:", err);
    }
  };

  const handleMediaUpload = async () => {
    if (!mediaFile) return;

    setMediaUploading(true);
    setMediaResult(null);
    setMediaQrDataUrl("");

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target.result.split(",")[1];

        const res = await fetch("/api/media/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileData: base64,
            fileName: mediaFile.name,
            mimeType: mediaFile.type,
            customSlug: mediaCustomSlug.trim(),
          }),
        });

        const data = await res.json();
        if (res.ok) {
          setMediaResult(data);
          generateMediaQR(data.url);
          setMediaFile(null);
          setMediaFileName("");
          setMediaCustomSlug("");
        } else {
          alert(data.error || "Upload failed.");
        }
        setMediaUploading(false);
      };
      reader.readAsDataURL(mediaFile);
    } catch {
      alert("Network error — try again.");
      setMediaUploading(false);
    }
  };

  const handleMediaCopy = async () => {
    if (!mediaResult) return;
    const full = window.location.origin + mediaResult.url;
    await navigator.clipboard.writeText(full);
    setMediaCopied(true);
    setTimeout(() => setMediaCopied(false), 2000);
  };

  const handleMediaDownloadQR = () => {
    if (!mediaQrDataUrl) return;
    const link = document.createElement("a");
    link.download = `flashhost-${mediaResult?.slug || "qr"}.png`;
    link.href = mediaQrDataUrl;
    link.click();
  };

  return (
    <>
      <Head>
        <title>FlashHost — Ship HTML in Seconds</title>
        <meta
          name="description"
          content="Drop a file. Get a live URL. No accounts. No fees. Ever."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>"
        />
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
          <h1>
            Ship HTML
            <br />
            in seconds.
          </h1>
          <p>
            Drop a file. Get a live URL.
            <br />
            No accounts. No fees. Ever.
          </p>
        </section>

        {/* ─── Tab Switcher ─── */}
        <div className="tabs animate-in delay-2">
          <button
            className={`tab ${activeTab === "website" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("website")}
          >
            Website
          </button>
          <button
            className={`tab ${activeTab === "media" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("media")}
          >
            Media
          </button>
        </div>

        {/* ─── Website Tab ─── */}
        {activeTab === "website" && (
          <section className="animate-in delay-2">
            <div
              className={`upload-zone ${isDragOver ? "dragover" : ""}`}
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".html,.htm,.zip"
                hidden
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              {fileName ? (
                <>
                  <div className="drop-icon">
                    {fileType === "zip" ? "\u{1F4E6}" : "\u{1F4C4}"}
                  </div>
                  <div className="drop-text file-loaded">{fileName}</div>
                  <div className="drop-hint">
                    {fileType === "zip"
                      ? "ZIP loaded \u2014 full website ready to deploy"
                      : "File loaded \u2014 ready to deploy"}
                  </div>
                </>
              ) : (
                <>
                  <div className="drop-icon">{"\u2601\uFE0F"}</div>
                  <div className="drop-text">
                    Drop your HTML or ZIP file here
                  </div>
                  <div className="drop-hint">
                    or click to browse {"\u00B7"} HTML max 1 MB {"\u00B7"} ZIP
                    max 5 MB
                  </div>
                </>
              )}
            </div>

            <div className="divider">or paste HTML code</div>

            <textarea
              className="code-textarea"
              placeholder={
                "<!DOCTYPE html>\n<html>\n  <body>\n    <h1>Hello, world!</h1>\n  </body>\n</html>"
              }
              value={fileType === "zip" ? "" : html}
              onChange={(e) => {
                setHtml(e.target.value);
                setFileName("");
                setFileType("");
              }}
              disabled={fileType === "zip"}
              style={
                fileType === "zip"
                  ? { opacity: 0.3, cursor: "not-allowed" }
                  : {}
              }
              rows={10}
            />

            {fileType === "zip" && (
              <p
                style={{
                  color: "var(--text-muted)",
                  fontSize: "0.75rem",
                  marginTop: "-8px",
                  marginBottom: "8px",
                  textAlign: "center",
                }}
              >
                Clear the ZIP to paste HTML code instead
              </p>
            )}

            <input
              className="title-input"
              type="text"
              placeholder="Site title (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <div style={{ position: "relative", marginTop: "16px" }}>
              <input
                className="title-input"
                type="text"
                placeholder="Custom URL (optional) e.g. myportfolio"
                value={customSlug}
                onChange={(e) => {
                  const val = e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9\-]/g, "");
                  setCustomSlug(val);
                }}
                style={{ marginTop: 0, paddingLeft: "130px" }}
              />
              <span
                style={{
                  position: "absolute",
                  left: "20px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                  fontSize: "0.82rem",
                  fontFamily: "'DM Mono', monospace",
                  pointerEvents: "none",
                  userSelect: "none",
                }}
              >
                /s/
              </span>
            </div>

            <button
              className={`deploy-btn ${deploying ? "loading" : ""}`}
              onClick={handleDeploy}
              disabled={!canDeploy}
            >
              {deploying ? "Deploying..." : "Deploy \u2192"}
            </button>

            {result && (
              <div className="result">
                <div className="result-header">
                  <span>{"\u2713"}</span> Your site is live
                  {result.type === "zip" && (
                    <span
                      style={{
                        fontSize: "0.7rem",
                        color: "var(--text-muted)",
                        fontWeight: 400,
                        fontFamily: "'DM Mono', monospace",
                        marginLeft: "8px",
                      }}
                    >
                      (full website)
                    </span>
                  )}
                </div>
                <div className="result-url">
                  <code>
                    {typeof window !== "undefined"
                      ? window.location.origin
                      : ""}
                    {result.url}
                  </code>
                </div>

                {qrDataUrl && (
                  <div className="qr-container">
                    <img src={qrDataUrl} alt="QR Code" className="qr-image" />
                    <button
                      className="btn-secondary qr-download"
                      onClick={handleDownloadQR}
                    >
                      Download QR
                    </button>
                  </div>
                )}

                <div className="result-actions">
                  <button
                    className={`btn-secondary ${copied ? "copied" : ""}`}
                    onClick={handleCopy}
                  >
                    {copied ? "\u2713 Copied" : "Copy URL"}
                  </button>
                  <a
                    className="btn-secondary"
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open site {"\u2197"}
                  </a>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ─── Media Tab ─── */}
        {activeTab === "media" && (
          <section className="animate-in delay-2">
            <div
              className={`upload-zone ${mediaDragOver ? "dragover" : ""}`}
              onDrop={handleMediaDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setMediaDragOver(true);
              }}
              onDragLeave={() => setMediaDragOver(false)}
              onClick={() => mediaInputRef.current?.click()}
            >
              <input
                ref={mediaInputRef}
                type="file"
                accept="image/*,video/*"
                hidden
                onChange={(e) => handleMediaSelect(e.target.files?.[0])}
              />
              {mediaFileName ? (
                <>
                  <div className="drop-icon">
                    {mediaFile?.type?.startsWith("video/")
                      ? "\u{1F3AC}"
                      : "\u{1F5BC}\uFE0F"}
                  </div>
                  <div className="drop-text file-loaded">{mediaFileName}</div>
                  <div className="drop-hint">
                    {(mediaFile?.size / (1024 * 1024)).toFixed(1)} MB {"\u00B7"}{" "}
                    Ready to upload
                  </div>
                </>
              ) : (
                <>
                  <div className="drop-icon">{"\u{1F3AC}"}</div>
                  <div className="drop-text">
                    Drop an image or video here
                  </div>
                  <div className="drop-hint">
                    Images max 10 MB {"\u00B7"} Videos max 50 MB {"\u00B7"} 10
                    min max
                  </div>
                </>
              )}
            </div>

            <div style={{ position: "relative", marginTop: "16px" }}>
              <input
                className="title-input"
                type="text"
                placeholder="Custom URL (optional) e.g. myclip"
                value={mediaCustomSlug}
                onChange={(e) => {
                  const val = e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9\-]/g, "");
                  setMediaCustomSlug(val);
                }}
                style={{ marginTop: 0, paddingLeft: "52px" }}
              />
              <span
                style={{
                  position: "absolute",
                  left: "20px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                  fontSize: "0.82rem",
                  fontFamily: "'DM Mono', monospace",
                  pointerEvents: "none",
                  userSelect: "none",
                }}
              >
                /{mediaFile?.type?.startsWith("video/") ? "v/" : "i/"}
              </span>
            </div>

            <button
              className={`deploy-btn ${mediaUploading ? "loading" : ""}`}
              onClick={handleMediaUpload}
              disabled={!mediaFile || mediaUploading}
            >
              {mediaUploading ? "Uploading..." : "Upload \u2192"}
            </button>

            {mediaResult && (
              <div className="result">
                <div className="result-header">
                  <span>{"\u2713"}</span>{" "}
                  {mediaResult.type === "video"
                    ? "Video uploaded"
                    : "Image uploaded"}
                </div>
                <div className="result-url">
                  <code>
                    {typeof window !== "undefined"
                      ? window.location.origin
                      : ""}
                    {mediaResult.url}
                  </code>
                </div>

                {mediaQrDataUrl && (
                  <div className="qr-container">
                    <img
                      src={mediaQrDataUrl}
                      alt="QR Code"
                      className="qr-image"
                    />
                    <button
                      className="btn-secondary qr-download"
                      onClick={handleMediaDownloadQR}
                    >
                      Download QR
                    </button>
                  </div>
                )}

                <div className="result-actions">
                  <button
                    className={`btn-secondary ${
                      mediaCopied ? "copied" : ""
                    }`}
                    onClick={handleMediaCopy}
                  >
                    {mediaCopied ? "\u2713 Copied" : "Copy URL"}
                  </button>
                  <a
                    className="btn-secondary"
                    href={mediaResult.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open {"\u2197"}
                  </a>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ─── Recent Sites ─── */}
        {recentSites.length > 0 && (
          <section className="recent animate-in delay-3">
            <h2>Recently deployed</h2>
            <div className="sites-grid">
              {recentSites.map((site, i) => (
                <a
                  key={site.id}
                  href={`/s/${site.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="site-card"
                  style={{ animationDelay: `${0.35 + i * 0.06}s` }}
                >
                  <div className="site-card-title">
                    {site.title || "Untitled"}
                  </div>
                  <div className="site-card-slug">/s/{site.slug}</div>
                  <div className="site-card-time">
                    {new Date(site.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
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
