// frontend/server.js - Express server for React app with CSP
const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

// Import configurations
const { initializeSocketIO } = require("./socketManager");
const setupMiddleware = require("./middlewareSetup");

// Load environment variables
dotenv.config();

// 🛡️ Global error handlers
process.on("uncaughtException", (error) => {
  console.error("🚨 Uncaught Exception:", error.message);
  console.error("💥 Critical error, shutting down gracefully...");
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("🚨 Unhandled Rejection at:", promise, "reason:", reason);
});

// Print environment info for debugging
console.log("ENV:", {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  REACT_APP_BACKEND_URL: process.env.REACT_APP_BACKEND_URL,
});

/* ---------------- APP INITIALIZATION ---------------- */
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = new socketIO.Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "https://suli-coffee.vercel.app",
      "https://suli-coffee-web.pages.dev"
    ],
    credentials: true,
  },
});
// Initialize Socket.IO with real-time features
console.log("🔌 Initializing Socket.IO real-time features...");
const socketManager = initializeSocketIO(io);
app.set("socketManager", socketManager);

/* ---------------- GLOBAL ERROR HANDLERS ---------------- */
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err && err.stack ? err.stack : err);
});
process.on("unhandledRejection", (reason, p) => {
  console.error("UNHANDLED REJECTION at:", p, "reason:", reason);
});

/* ---------------- SETUP CONFIGURATIONS ---------------- */
// Setup middleware with CSP
setupMiddleware(app, io);

/* ---------------- SERVE REACT BUILD ---------------- */
const buildPath = path.join(__dirname, "build");
if (fs.existsSync(buildPath)) {
  console.log("📦 Serving React build from:", buildPath);

  // Serve static files from build folder
  app.use(
    express.static(buildPath, {
      index: false,
      setHeaders: (res, path) => {
        // Add CSP header for all static files
        if (path.endsWith(".html")) {
          const nonce = require("crypto").randomBytes(16).toString("base64");
          const csp = [
            "default-src 'self' blob:",
            `script-src 'self' 'nonce-${nonce}' 'unsafe-eval' https://accounts.google.com https://*.googleapis.com https://cdnjs.cloudflare.com`,
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
            `report-uri ${
              process.env.REACT_APP_BACKEND_URL || "http://localhost:5000"
            }/csp-report`,
          ].join("; ");

          res.setHeader("Content-Security-Policy", csp);
          console.log(
            `🛡️ Setting CSP for ${path}:`,
            csp.substring(0, 100) + "..."
          );
        }
      },
    })
  );

  // Catch-all handler for React routes
  app.get("*", (req, res) => {
    const nonce = require("crypto").randomBytes(16).toString("base64");
    const csp = [
      "default-src 'self' blob:",
      `script-src 'self' 'nonce-${nonce}' 'unsafe-eval' https://accounts.google.com https://*.googleapis.com https://cdnjs.cloudflare.com`,
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
      `report-uri ${
        process.env.REACT_APP_BACKEND_URL || "http://localhost:5000"
      }/csp-report`,
    ].join("; ");

    res.setHeader("Content-Security-Policy", csp);
    console.log(
      `🛡️ Setting CSP for React route ${req.path}:`,
      csp.substring(0, 100) + "..."
    );
    console.log(`🔑 Generated nonce: ${nonce}`);

    const indexPath = path.join(buildPath, "index.html");
    let html = fs.readFileSync(indexPath, "utf8");
    html = html.replace(/__NONCE__/g, nonce);
    res.status(200).send(html);
  });
} else {
  console.log("⚠️ React build folder not found. Run 'npm run build' first.");
  app.get("*", (req, res) => {
    res.status(404).send(`
      <h1>🚧 Development Mode</h1>
      <p>React build not found. Please run <code>npm run build</code> first.</p>
      <p>For development, use <code>npm start</code> instead.</p>
    `);
  });
}

/* ---------------- HEALTH CHECK ---------------- */
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    mode: process.env.NODE_ENV || "development",
    service: "frontend",
  });
});

console.log("✅ Frontend server setup completed!");

/* ---------------- START SERVER ---------------- */
const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Frontend server running at http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(
    `📡 Backend URL: ${
      process.env.REACT_APP_BACKEND_URL || "http://localhost:5000"
    }`
  );
});
