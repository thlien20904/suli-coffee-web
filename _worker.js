// File: _worker.js (đặt ở root repo)
export default {
  async fetch(request, env, ctx) {
    const response = await fetch(request);

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) return response;

    let html = await response.text();

    // Tạo nonce
    const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16)))).slice(0, 24);

    const encoder = new TextEncoder();
    const scriptHashes = new Set();
    const styleHashes = new Set();

    const addHash = async (content, set) => {
      if (!content.trim()) return;
      const buf = await crypto.subtle.digest("SHA-256", encoder.encode(content.trim()));
      const hash = "sha256-" + btoa(String.fromCharCode(...new Uint8Array(buf)));
      set.add(`'${hash}'`);
    };

    // Inject nonce + hash cho script
    html = html.replace(/<script\b/gi, match => `${match} nonce="${nonce}"`);
    html = html.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, async (match, content) => {
      await addHash(content, scriptHashes);
      return match;
    });

    // Inject nonce + hash cho style
    html = html.replace(/<style\b/gi, match => `${match} nonce="${nonce}"`);
    html = html.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, async (match, content) => {
      await addHash(content, styleHashes);
      return match;
    });

    const csp = [
      "default-src 'self' blob: data:",
      `script-src 'self' 'nonce-${nonce}' ${Array.from(scriptHashes).join(" ")}`,
      `style-src 'self' 'nonce-${nonce}' ${Array.from(styleHashes).join(" ")} 'unsafe-inline'`, // React cần unsafe-inline cho style
      "img-src * data: blob:",
      "connect-src *",
      "font-src * data:",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join("; ");

    const newHeaders = new Headers(response.headers);
    newHeaders.set("Content-Security-Policy", csp);
    newHeaders.set("X-Content-Type-Options", "nosniff");
    newHeaders.set("X-Frame-Options", "DENY");

    return new Response(html, response);
  }
};