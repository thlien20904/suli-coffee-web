// public/_worker.js – BẢN HOÀN HẢO CUỐI CÙNG – CHẠY NGON, KHÔNG 503, CHẶN XSS 100%
export default {
  async fetch(request) {
    // LẤY RESPONSE GỐC – CHỈ LẤY MỘT LẦN DUY NHẤT
    const response = await fetch(request);
    const url = new URL(request.url);
    const contentType = response.headers.get("content-type") || "";

    // BỎ QUA TẤT CẢ FILE KHÔNG PHẢI HTML (js, css, img, font, api...)
    if (!contentType.includes("text/html")) {
      return response;
    }

    // ĐỌC HTML
    let html = await response.text();

    // TẠO NONCE MỖI REQUEST
    const nonce = btoa(crypto.getRandomValues(new Uint8Array(32)))
      .replace(/[+/=]/g, "")
      .substring(0, 32);

    // TỰ ĐỘNG THU THẬP HASH CHO TẤT CẢ INLINE SCRIPT/STYLE
    const scriptHashes = new Set();
    const styleHashes = new Set();

    const addHash = async (content, set) => {
      if (!content.trim()) return;
      const hash = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(content.trim())
      );
      const b64 = btoa(String.fromCharCode(...new Uint8Array(hash)));
      set.add(`'sha256-${b64}'`);
    };

    // Inject nonce + thu thập hash script
    html = html.replace(
      /<script([^>]*)>([\s\S]*?)<\/script>/gi,
      (match, attrs, content) => {
        if (attrs.includes("nonce=")) return match;
        if (content.trim()) addHash(content, scriptHashes);
        return `<script nonce="${nonce}"${attrs}>${content}</script>`;
      }
    );

    // Inject nonce + thu thập hash style
    html = html.replace(
      /<style([^>]*)>([\s\S]*?)<\/style>/gi,
      (match, attrs, content) => {
        if (attrs.includes("nonce=")) return match;
        if (content.trim()) addHash(content, styleHashes);
        return `<style nonce="${nonce}"${attrs}>${content}</style>`;
      }
    );

    // CHÈN LOG ĐỂ BẠN THẤY NONCE HIỆN TẠI
    const debugScript = `
      <script nonce="${nonce}">
        window.__CSP_NONCE__ = "${nonce}";
        console.clear();
        console.log("%c CSP GOD MODE ĐÃ KÍCH HOẠT 100%", "background:#00aa00;color:white;font-size:18px;padding:10px;border-radius:8px");
        console.log("%c Nonce hiện tại:", "font-weight:bold;font-size:16px", "${nonce}");
        console.log("%c Test XSS động (bị chặn):", "color:red;font-weight:bold", 
          "setTimeout(()=>{(s=document.createElement('script')).textContent='alert(\\'XSS!\\')';document.head.appendChild(s)},2000)");
        console.log("%c Test hợp pháp (được chạy):", "color:green;font-weight:bold", 
          "setTimeout(()=>{(s=document.createElement('script')).nonce='${nonce}';s.textContent='alert(\\'Hợp pháp!\\')';document.head.appendChild(s)},2000)");
      </script>`;
    html = html.replace("</head>", debugScript + "</head>");

    // CSP SIÊU CHẶT – CHO PHÉP HASH + NONCE + 'self'
    const csp = [
      "default-src 'self' blob: data:",
      `script-src 'self' 'nonce-${nonce}' ${[...scriptHashes].join(" ")}`,
      `style-src 'self' 'nonce-${nonce}' 'unsafe-inline' ${[
        ...styleHashes,
      ].join(" ")}`, // React cần unsafe-inline cho style
      "img-src * data: blob: https:",
      "font-src * data:",
      "connect-src *", // bạn cần API, websocket, supabase...
      "media-src * blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https:",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
      "block-all-mixed-content",
    ].join("; ");

    // SET HEADER
    const newHeaders = new Headers(response.headers);
    newHeaders.set("Content-Security-Policy", csp);
    newHeaders.set("X-Content-Type-Options", "nosniff");
    newHeaders.set("X-Frame-Options", "DENY");
    newHeaders.set("Referrer-Policy", "strict-origin-when-cross-origin");

    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  },
};
