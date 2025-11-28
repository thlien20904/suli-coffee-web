// public/_worker.js – FINAL CLEAN: FIX EXTERNAL STYLES BLOCK + META NONCE/POLICY CHO HASH&NONCE TAB, NO CONSOLE TESTS
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

      // CSP POLICY: SCRIPT CHẶT (NONCE + HASH), STYLE MỞ RỘNG (UNSAFE-INLINE + EXTERNAL CDN/FONTS + HASH)
      const csp = [
        "default-src 'self' blob: data:",
        `script-src 'self' 'nonce-${nonce}' ${[...scriptHashes].join(" ")}`,
        `style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com ${[
          ...styleHashes,
        ].join(" ")}`, // FIX: ALLOW EXTERNAL STYLES (FONT-AWESOME, GOOGLE FONTS), GIỮ UNSAFE-INLINE CHO DYNAMIC (REACT/SWEETALERT)
        "img-src * data: blob: https:",
        "font-src * data: https://fonts.gstatic.com", // ALLOW FONTS.GOOGLEAPIS.COM FONTS
        "connect-src *", // API/RENDER/SOCKET.IO (KHÔNG DÙNG TRONG TEST VERCEL)
        "media-src * blob:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self' https:",
        "frame-ancestors 'none'",
        "upgrade-insecure-requests",
        "block-all-mixed-content",
      ].join("; ");

      // INJECT META TAGS + CSP VIOLATION LISTENER (CHẠY TRƯỚC REACT MOUNT)
      const metaTags = `
        <meta name="csp-nonce" content="${nonce}">
        <meta name="csp-policy" content="${csp}">
        <script nonce="${nonce}">
          window.__CSP_NONCE__ = "${nonce}";
          window.cspViolations = window.cspViolations || [];
          window.cspPasses = window.cspPasses || [];
          
          // Lắng nghe CSP violations ngay khi page load
          document.addEventListener("securitypolicyviolation", function(e) {
            const violation = {
              id: "violation-" + Date.now() + "-" + Math.random(),
              "blocked-uri": e.blockedURI,
              "violated-directive": e.violatedDirective,
              "effective-directive": e.effectiveDirective,
              "document-uri": e.documentURI,
              "original-policy": e.originalPolicy,
              timestamp: new Date().toISOString(),
              status: "fail"
            };
            window.cspViolations.unshift(violation);
            console.log("🔴 CSP Violation (from worker listener):", violation);
            
            // Dispatch custom event để React Provider nhận được
            window.dispatchEvent(new CustomEvent("csp-violation-detected", { detail: violation }));
          });
          
          console.log("%c✅ CSP Worker Active", "background:#00aa00;color:white;font-size:14px;padding:4px 8px;", 
            "\\nNonce:", "${nonce}".substring(0,16) + "...",
            "\\nTime:", new Date().toLocaleTimeString("vi-VN"));
        </script>`;
      if (html.includes("<head>")) {
        html = html.replace("<head>", `<head>${metaTags}`);
      } else if (html.includes("<html>")) {
        html = html.replace("<html>", `<html>${metaTags}`);
      } else if (html.includes("<body>")) {
        html = html.replace("<body>", `${metaTags}<body>`);
      } else {
        html = `${metaTags}${html}`;
      }

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
        `CSP Worker Error: ${error.message}. Check Vercel/Cloudflare Functions logs.`,
        { status: 500 }
      );
    }
  },
};
