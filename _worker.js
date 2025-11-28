// _worker.js – CSP cực mạnh cho Cloudflare Pages 2025
// Chặn toàn site, nonce + sha256-hash tự động, report realtime (tùy chọn)

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Chỉ xử lý HTML (và service worker nếu có)
    const response = await fetch(request);
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !url.pathname.endsWith("sw.js")) {
      return response;
    }

    // Đọc HTML
    let html = await response.text();

    // Tạo nonce duy nhất mỗi request
    const nonce = btoa(
      String.fromCharCode(...crypto.getRandomValues(new Uint8Array(20)))
    ).replace(/[+/=]/g, "");

    const encoder = new TextEncoder();

    // Collect tất cả nội dung inline script/style để tính hash
    const scriptContents = new Set();
    const styleContents = new Set();

    // Regex lấy nội dung bên trong <script>...</script> và <style>...</style>
    html = html.replace(
      /<script\b[^>]*>([\s\S]*?)<\/script>/gi,
      (match, content) => {
        const trimmed = content.trim();
        if (trimmed) scriptContents.add(trimmed);
        // Inject nonce vào thẻ script (nếu chưa có)
        if (!match.includes('nonce=')) {
          return match.replace("<script", `<script nonce="${nonce}"`);
        }
        return match;
      }
    );

    html = html.replace(
      /<style\b[^>]*>([\s\S]*?)<\/style>/gi,
      (match, content) => {
        const trimmed = content.trim();
        if (trimmed) styleContents.add(trimmed);
        if (!match.includes('nonce=')) {
          return match.replace("<style", `<style nonce="${nonce}"`);
        }
        return match;
      }
    );

    // Tính SHA-256 hash cho tất cả inline script/style (parallel)
    const calcHash = async (content) => {
      const buf = await crypto.subtle.digest("SHA-256", encoder.encode(content));
      return `'sha256-${btoa(String.fromCharCode(...new Uint8Array(buf)))}'`;
    };

    const scriptHashes = await Promise.all(
      Array.from(scriptContents).map(calcHash)
    );
    const styleHashes = await Promise.all(
      Array.from(styleContents).map(calcHash)
    );

    // CSP cực chặt – chặn hoàn toàn unsafe-inline
    const csp = [
      "default-src 'self' blob: data:",
      `script-src 'self' 'nonce-${nonce}' ${scriptHashes.join(" ")}`,
      `style-src 'self' 'nonce-${nonce}' ${styleHashes.join(" ")}`,
      "img-src 'self' data: blob: https:",
      "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com data:",
      "connect-src 'self' https://suli-coffee.onrender.com https://*.supabase.co https://accounts.google.com https://*.googleapis.com wss://suli-coffee.onrender.com",
      "media-src 'self'self' https://*.supabase.co blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://accounts.google.com",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
      "block-all-mixed-content",
      // Nếu bạn muốn report (tạo route /csp-report trong Pages Functions hoặc backend)
      // "report-to csp-endpoint",
    ].join("; ");

    // Thêm các header bảo mật khác
    const newHeaders = new Headers(response.headers);
    newHeaders.set("Content-Security-Policy", csp);
    newHeaders.set("X-Content-Type-Options", "nosniff");
    newHeaders.set("X-Frame-Options", "DENY");
    newHeaders.set("X-XSS-Protection", "0");
    newHeaders.set("Referrer-Policy", "strict-origin-when-cross-origin");
    newHeaders.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  },
};