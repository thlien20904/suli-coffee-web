// public/_worker.js – FINAL FIX 1019: ENV.ASSETS + FULL ASYNC RESOLVE
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

      // NONCE UNIQUE PER REQUEST
      const nonce = btoa(
        String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))
      )
        .replace(/[+/=]/g, "")
        .substring(0, 32);

      const scriptHashes = new Set();
      const styleHashes = new Set();

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

      // FULL ASYNC REPLACE FOR SCRIPTS (RESOLVE PENDING HASHES)
      html = await (async () => {
        const promises = [];
        html = html.replace(
          /<script([^>]*)>([\s\S]*?)<\/script>/gi,
          (match, attrs, content) => {
            if (attrs.includes("nonce=")) return match;
            const newTag = `<script nonce="${nonce}"${attrs}>${content}</script>`;
            if (content.trim()) {
              promises.push(addHash(content, scriptHashes).then(() => {}));
            }
            return newTag;
          }
        );
        await Promise.all(promises);
        return html;
      })();

      // ASYNC FOR STYLES (TƯƠNG TỰ)
      const stylePromises = [];
      html = html.replace(
        /<style([^>]*)>([\s\S]*?)<\/style>/gi,
        (match, attrs, content) => {
          if (attrs.includes("nonce=")) return match;
          const newTag = `<style nonce="${nonce}"${attrs}>${content}</style>`;
          if (content.trim()) {
            stylePromises.push(addHash(content, styleHashes).then(() => {}));
          }
          return newTag;
        }
      );
      await Promise.all(stylePromises);

      // DEBUG SCRIPT (INJECT VÀO <head>)
      const debugScript = `<script nonce="${nonce}">
        window.__CSP_NONCE__ = "${nonce}";
        console.clear();
        console.log("%c CSP ACTIVE - NO 1019 LOOP! 🎉", "background:#00aa00;color:white;font-size:18px;padding:10px;border-radius:8px");
        console.log("%c Nonce hiện tại:", "font-weight:bold", "${nonce}");
        console.log("%c Test XSS (bị chặn):", "color:red", "setTimeout(()=>{const s=document.createElement('script');s.textContent='alert(\\'XSS Blocked!\\')';document.head.appendChild(s);},2000)");
        console.log("%c Test hợp pháp (chạy):", "color:green", "setTimeout(()=>{const s=document.createElement('script');s.nonce='${nonce}';s.textContent='alert(\\'Legal Run!\\')';document.head.appendChild(s);},2000)");
      </script>`;
      html = html.replace("</head>", debugScript + "</head>");

      // CSP POLICY (CHẶT CHẼ, REACT-FRIENDLY)
      const csp = [
        "default-src 'self' blob: data:",
        `script-src 'self' 'nonce-${nonce}' ${[...scriptHashes].join(" ")}`,
        `style-src 'self' 'nonce-${nonce}' 'unsafe-inline' ${[
          ...styleHashes,
        ].join(" ")}`, // unsafe-inline cho React inline styles
        "img-src * data: blob: https:",
        "font-src * data:",
        "connect-src *", // API/Supabase/Socket.io
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
        "CSP Worker Error: Check Cloudflare Functions logs.",
        { status: 500 }
      );
    }
  },
};
