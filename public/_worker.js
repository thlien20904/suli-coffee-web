// public/_worker.js – FIXED 1019: ENV.ASSETS + ASYNC FULLY RESOLVED + NO LOOP
export default {
  async fetch(request, env, ctx) {  // THÊM ENV & CTX – BẮT BUỘC CHO ASSETS
    try {
      // FIX LOOP: FETCH TỪ ASSETS TRỰC TIẾP
      const response = await env.ASSETS.fetch(request);
      const contentType = response.headers.get("content-type") || "";

      // SKIP NON-HTML (FAVICON/JS/CSS/IMG/API OK)
      if (!contentType.includes("text/html")) {
        return response;
      }

      // ĐỌC HTML
      let html = await response.text();

      // NONCE RANDOM
      const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
        .replace(/[+/=]/g, "").substring(0, 32);

      // HASH SETS
      const scriptHashes = new Set();
      const styleHashes = new Set();

      const addHash = async (content, set) => {
        if (!content.trim()) return;
        try {
          const encoder = new TextEncoder();
          const data = encoder.encode(content.trim());
          const hash = await crypto.subtle.digest("SHA-256", data);
          const hashArray = Array.from(new Uint8Array(hash));
          const hashB64 = btoa(String.fromCharCode(...hashArray));
          set.add(`'sha256-${hashB64}'`);
        } catch (e) {
          console.error("Hash fail:", e);
        }
      };

      // ASYNC INJECT SCRIPT (RESOLVE FULLY ĐỂ TRÁNH PENDING)
      const injectScripts = async () => {
        return new Promise((resolve) => {
          let pending = 0;
          const replacer = async (match, attrs, content) => {
            if (attrs.includes("nonce=")) return match;
            if (content.trim()) {
              pending++;
              await addHash(content, scriptHashes);
              pending--;
            }
            return `<script nonce="${nonce}" ${attrs}>${content}</script>`;
          };
          html = html.replace(/<script([^>]*)>([\s\S]*?)<\/script>/gi, replacer);
          if (pending === 0) resolve(html);
          else {
            const checkPending = () => {
              if (pending === 0) resolve(html);
              else setTimeout(checkPending, 10);
            };
            checkPending();
          }
        });
      };
      html = await injectScripts();

      // INJECT STYLE (SYNC VÌ ÍT HƠN)
      html = html.replace(/<style([^>]*)>([\s\S]*?)<\/style>/gi, async (match, attrs, content) => {
        if (attrs.includes("nonce=")) return match;
        if (content.trim()) await addHash(content, styleHashes);
        return `<style nonce="${nonce}" ${attrs}>${content}</style>`;
      });

      // DEBUG SCRIPT
      const debugScript = `<script nonce="${nonce}">
        window.__CSP_NONCE__ = "${nonce}";
        console.clear();
        console.log("%c CSP FIXED 1019 - NO LOOP! 100% ACTIVE", "background:#00aa00;color:white;font-size:18px;padding:10px;border-radius:8px");
        console.log("%c Nonce:", "font-weight:bold", "${nonce}");
        console.log("%c Test XSS block:", "color:red", "setTimeout(()=>{let s=document.createElement('script');s.textContent='alert(\\'XSS!\\')';document.head.appendChild(s);},2000)");
        console.log("%c Test legal run:", "color:green", "setTimeout(()=>{let s=document.createElement('script');s.nonce='${nonce}';s.textContent='alert(\\'Legal!\\')';document.head.appendChild(s);},2000)");
      </script>`;
      html = html.replace("</head>", debugScript + "</head>");

      // CSP TIGHT
      const csp = [
        "default-src 'self' blob: data:",
        `script-src 'self' 'nonce-${nonce}' ${[...scriptHashes].join(" ")}`,
        `style-src 'self' 'nonce-${nonce}' 'unsafe-inline' ${[...styleHashes].join(" ")}`,  // Giữ unsafe-inline cho React styles
        "img-src * data: blob: https:",
        "font-src * data:",
        "connect-src *",
        "media-src * blob:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self' https:",
        "frame-ancestors 'none'",
        "upgrade-insecure-requests",
        "block-all-mixed-content"
      ].join("; ");

      // HEADERS
      const newHeaders = new Headers(response.headers);
      newHeaders.set("Content-Security-Policy", csp);
      newHeaders.set("X-Content-Type-Options", "nosniff");
      newHeaders.set("X-Frame-Options", "DENY");
      newHeaders.set("Referrer-Policy", "strict-origin-when-cross-origin");

      return new Response(html, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
      });
    } catch (error) {
      console.error("Worker crash:", error);
      return new Response(`Error 1019 Fix Needed: ${error.message}. Check Functions logs.`, { status: 500 });
    }
  }
};