// _worker.js – Final version: chặn toàn site + log realtime + nonce debug
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const startTime = Date.now();

    // Chỉ xử lý HTML
    const response = await fetch(request);
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) return response;

    let html = await response.text();

    // Tạo nonce siêu mạnh
    const nonce = btoa(crypto.getRandomValues(new Uint8Array(24)))
      .replace(/[+/=]/g, "")
      .slice(0, 32);

    const encoder = new TextEncoder();
    const scriptHashes = new Set();
    const styleHashes = new Set();

    // Helper tính hash
    const calcHash = async (content) => {
      if (!content.trim()) return null;
      const buf = await crypto.subtle.digest(
        "SHA-256",
        encoder.encode(content.trim())
      );
      return `'sha256-${btoa(String.fromCharCode(...new Uint8Array(buf)))}'`;
    };

    // Inject nonce + thu thập hash cho script/style có sẵn
    html = html.replace(/<script\b([^>]*)>/gi, (match, attrs) => {
      if (attrs.includes("nonce=")) return match;
      const newTag = `<script nonce="${nonce}"${attrs}>`;
      // Thu thập nội dung để hash
      const contentMatch = html.match(
        new RegExp(
          `${match.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")}(.*?)<\/script>`,
          "is"
        )
      );
      if (contentMatch?.[1]) {
        ctx.waitUntil(
          calcHash(contentMatch[1]).then((h) => h && scriptHashes.add(h))
        );
      }
      return newTag;
    });

    html = html.replace(/<style\b([^>]*)>/gi, (match, attrs) => {
      if (attrs.includes("nonce=")) return match;
      const newTag = `<style nonce="${nonce}"${attrs}>`;
      const contentMatch = html.match(
        new RegExp(
          `${match.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")}(.*?)<\/style>`,
          "is"
        )
      );
      if (contentMatch?.[1]) {
        ctx.waitUntil(
          calcHash(contentMatch[1]).then((h) => h && styleHashes.add(h))
        );
      }
      return newTag;
    });

    // Chèn script debug nonce vào <head> để bạn thấy nonce hiện tại
    const debugScript = `
      <script nonce="${nonce}">
        window.__CSP_NONCE__ = "${nonce}";
        console.log("%c CSP God Mode ACTIVE ", "background:#00aa00;color:white;font-size:14px;padding:4px 8px;border-radius:4px;", 
          "\\nCurrent nonce:", "${nonce}".substring(0,16) + "...", 
          "\\nTime:", new Date().toLocaleTimeString("vi-VN"),
          "\\nPage:", location.pathname
        );
        console.log("%c Test hợp lệ (có nonce):", "color:green;font-weight:bold;", 
          "const s = document.createElement('script'); s.nonce = window.__CSP_NONCE__; s.textContent = 'alert(\\'Allowed!\\')'; document.head.appendChild(s);"
        );
        console.log("%c Test bị chặn (không nonce):", "color:red;font-weight:bold;", 
          "const s = document.createElement('script'); s.textContent = 'alert(\\'Blocked!\\')'; document.head.appendChild(s);"
        );
      </script>
    `;

    html = html.replace("</head>", debugScript + "</head>");

    // CSP cực chặt
    const cspArray = [
      "default-src 'self' blob: data:",
      `script-src 'self' 'nonce-${nonce}' ${Array.from(scriptHashes).join(
        " "
      )}`,
      `style-src 'self' 'nonce-${nonce}' ${Array.from(styleHashes).join(" ")}`,
      "img-src 'self' data: blob: https:",
      "font-src 'self' https://fonts.gstatic.com data:",
      "connect-src 'self' https://suli-coffee.onrender.com https://*.supabase.co wss://suli-coffee.onrender.com https://accounts.google.com",
      "media-src 'self' blob: https://*.supabase.co",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://accounts.google.com",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
      "block-all-mixed-content",
    ];

    const csp = cspArray.join("; ");

    const newHeaders = new Headers(response.headers);
    newHeaders.set("Content-Security-Policy", csp);
    newHeaders.set("X-Content-Type-Options", "nosniff");
    newHeaders.set("X-Frame-Options", "DENY");
    newHeaders.set("X-XSS-Protection", "0");
    newHeaders.set("Referrer-Policy", "strict-origin-when-cross-origin");

    // Log realtime trong Worker
    console.log(
      `CSP ACTIVE | Nonce: ${nonce.slice(0, 12)}... | Page: ${
        url.pathname
      } | Time: ${Date.now() - startTime}ms`
    );

    return new Response(html, {
      status: response.status,
      headers: newHeaders,
    });
  },
};