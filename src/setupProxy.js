// frontend/src/setupProxy.js - Development proxy với CSP headers
const { createProxyMiddleware } = require("http-proxy-middleware");
const crypto = require("crypto");

// Generate nonce for each request
const generateNonce = () => {
  return crypto.randomBytes(16).toString("base64");
};

module.exports = function (app) {
  console.log("🚀 setupProxy.js loaded - CSP middleware will be applied");

  // Thêm CSP headers cho development
  app.use((req, res, next) => {
    const isMainRequest = req.path === "/" || req.path.includes(".html");
    const isStaticAsset =
      req.path.includes("/static/") ||
      req.path.includes("/video/") ||
      req.path.includes("favicon");

    if (isMainRequest) {
      console.log(`🔍 Processing main request: ${req.method} ${req.path}`);
    }

    // Generate unique nonce for this request
    const nonce = generateNonce();
    res.locals.nonce = nonce;

    const csp = [
      "default-src 'self' blob:",
      `script-src 'self' 'nonce-${nonce}' 'sha256-7KeYHLqXdC8kKKqmVYS0d4v1Y7eG5vC5qv+T0rJ1w1M=' 'sha256-BKU8tKGd0KZuZtZW7c8Qpe3gvmFJ9cJdVe3v3tZyGbI=' 'sha256-R8TqFr7hL0qK3Y9F8K5Nc9L3hV7F8qRz0Td1cM2QzN4=' 'sha256-MkOXeVUvzUUKopAOP0RVNWc3wADitnaZbMMh2TTTdbE=' https://accounts.google.com https://*.googleapis.com https://cdnjs.cloudflare.com`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
      "img-src * data: blob:",
      "media-src 'self' https://vhkvfmbmmsolqiwrjlxp.supabase.co https://*.supabase.co blob: data:",
      "connect-src 'self' https://accounts.google.com https://*.googleapis.com http://localhost:5000 ws://localhost:5000 ws://localhost:3000 https://vhkvfmbmmsolqiwrjlxp.supabase.co",
      "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com",
      "object-src 'none'",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self' https://accounts.google.com",
      "upgrade-insecure-requests",
      "report-uri http://localhost:5000/csp-report",
    ].join("; ");

    // Đặt CSP headers - ENFORCED
    res.setHeader("Content-Security-Policy", csp);
    // res.setHeader("Content-Security-Policy-Report-Only", csp); // Tắt report-only để tránh duplicate warnings
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-CSP-Nonce", nonce); // Expose nonce in header for client access

    if (isMainRequest) {
      console.log(`🚫 CSP ENFORCED for ${req.path}`);
      console.log(`🔑 NONCE: ${nonce}`);
      console.log(`🎯 CSP POLICY: ${csp}`);
    }
    // Removed noisy logs for static assets
    next();
  });

  // Proxy API calls to backend
  app.use(
    "/api",
    createProxyMiddleware({
      target: process.env.REACT_APP_BACKEND_URL || "http://localhost:5000",
      changeOrigin: true,
    })
  );

  // Proxy Socket.IO to backend
  app.use(
    "/socket.io",
    createProxyMiddleware({
      target: process.env.REACT_APP_BACKEND_URL || "http://localhost:5000",
      changeOrigin: true,
      ws: true, // enable websockets
    })
  );

  // Proxy CSP demo routes to backend
  const cspRoutes = [
    "/csp",
    "/blocked",
    "/hash",
    "/nonce",
    "/csp-test",
    "/report-log-realtime",
    "/analyze-realtime",
    "/csp-report",
  ];

  cspRoutes.forEach((route) => {
    app.use(
      route,
      createProxyMiddleware({
        target: process.env.REACT_APP_BACKEND_URL || "http://localhost:5000",
        changeOrigin: true,
      })
    );
  });

  // Serve CSP test page
  app.get("/csp-test-frontend", (req, res) => {
    res.sendFile(__dirname + "/../public/csp-test-page.html");
  });
};
