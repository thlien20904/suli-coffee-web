// public/_worker.js – VERSION CUỐI CÙNG: FIX STYLE BLOCK + FULL CSP NÂNG CAO (HASH/NONCE SCRIPT, UNSAFE-INLINE STYLE)
export default {
  async fetch(request, env, ctx) {
    try {
      // CORE FIX: FETCH TỪ ASSETS (NO RECURSIVE LOOP!)
      const response = await env.ASSETS.fetch(request);
      const contentType = response.headers.get("content-type") || "";

      // SKIP NON-HTML (JS/CSS/IMG/FAVICON/API OK, NO 503)
      if (!contentType.includes("text/html")) {
        return response;
      }

      let html = await response.text();

      // NONCE UNIQUE PER REQUEST (RANDOM 32 CHARS BASE64)
      const nonce = btoa(
        String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))
      )
        .replace(/[+/=]/g, "")
        .substring(0, 32);

      const scriptHashes = new Set();
      const styleHashes = new Set();

      // HASH HELPER (SHA-256 CHO INLINE CONTENT)
      const addHash = async (content, set) => {
        if (!content.trim()) return;
        try {
          const encoder = new TextEncoder();
          const hashBuffer = await crypto.subtle.digest(
            "SHA-256",
            encoder.encode(content.trim())
          );
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashB64 = btoa(String.fromCharCode(...hashArray));
          set.add(`'sha256-${hashB64}'`);
        } catch (e) {
          console.error("Hash error:", e);
        }
      };

      // ASYNC INJECT SCRIPTS: NONCE + HASH (CHẶN INLINE JS ĐỘNG)
      const scriptPromises = [];
      html = html.replace(
        /<script([^>]*)>([\s\S]*?)<\/script>/gi,
        (match, attrs, content) => {
          if (attrs.includes("nonce=")) return match;
          const newTag = `<script nonce="${nonce}"${attrs}>${content}</script>`;
          if (content.trim()) {
            scriptPromises.push(addHash(content, scriptHashes));
          }
          return newTag;
        }
      );
      await Promise.all(scriptPromises);

      // ASYNC INJECT STYLES: CHỈ HASH (KHÔNG NONCE, CHO UNSAFE-INLINE DYNAMIC)
      const stylePromises = [];
      html = html.replace(
        /<style([^>]*)>([\s\S]*?)<\/style>/gi,
        (match, attrs, content) => {
          if (attrs.includes("nonce=")) return match;
          const newTag = `<style${attrs}>${content}</style>`; // BỎ NONCE CHO STYLE
          if (content.trim()) {
            stylePromises.push(addHash(content, styleHashes));
          }
          return newTag;
        }
      );
      await Promise.all(stylePromises);

      // Chèn script debug nonce + bắt sự kiện CSP vào <head>
      const debugScript = `
        <script nonce="${nonce}">
          window.__CSP_NONCE__ = "${nonce}";
          window.addEventListener("securitypolicyviolation", function(e) {
            const logs = JSON.parse(localStorage.getItem("cspLogs") || "[]");
            logs.push({
              time: new Date().toISOString(),
              documentURI: e.documentURI,
              violatedDirective: e.violatedDirective,
              blockedURI: e.blockedURI,
              sourceFile: e.sourceFile,
              lineNumber: e.lineNumber,
              columnNumber: e.columnNumber,
              disposition: e.disposition
            });
            localStorage.setItem("cspLogs", JSON.stringify(logs));
          });
          console.log("%c CSP God Mode ACTIVE ", "background:#00aa00;color:white;font-size:14px;padding:4px 8px;border-radius:4px;", 
            "\nCurrent nonce:", "${nonce}".substring(0,16) + "...", 
            "\nTime:", new Date().toLocaleTimeString("vi-VN"),
            "\nPage:", location.pathname
          );
          console.log("%c Test hợp lệ (có nonce):", "color:green;font-weight:bold;", 
            "const s = document.createElement('script'); s.nonce = window.__CSP_NONCE__; s.textContent = 'alert(\'Allowed!\')'; document.head.appendChild(s);"
          );
          console.log("%c Test bị chặn (không nonce):", "color:red;font-weight:bold;", 
            "const s = document.createElement('script'); s.textContent = 'alert(\'Blocked!\')'; document.head.appendChild(s);"
          );
        </script>
      `;
      html = html.replace("</head>", debugScript + "</head>");

      // CSP POLICY: SCRIPT CHẶT (NONCE + HASH), STYLE LỎNG (UNSAFE-INLINE + HASH)
      const csp = [
        "default-src 'self' blob: data:",
        `script-src 'self' 'nonce-${nonce}' ${[...scriptHashes].join(" ")}`,
        `style-src 'self' 'unsafe-inline' ${[...styleHashes].join(" ")}`, // BỎ NONCE, GIỮ UNSAFE-INLINE CHO DYNAMIC STYLES (REACT/SWEETALERT)
        "img-src * data: blob: https:",
        "font-src * data:",
        "connect-src *", // API/RENDER/SOCKET.IO
        "media-src * blob:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self' https:",
        "frame-ancestors 'none'",
        "upgrade-insecure-requests",
        "block-all-mixed-content",
      ].join("; ");

      // SECURITY HEADERS
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
    } catch (error) {
      console.error("Worker error:", error);
      return new Response(
        `CSP Worker Error: ${error.message}. Check Cloudflare Functions logs.`,
        { status: 500 }
      );
    }
  },
};
