// frontend/middlewareSetup.js - Middleware setup for frontend CSP
const express = require("express");
const cors = require("cors");
const path = require("path");
const createCSPMiddleware = require("./cspMiddleware");

function setupMiddleware(app, io) {
  console.log("🔧 Setting up frontend middleware...");

  /* ---------------- BASIC MIDDLEWARE ---------------- */
  // Trust proxy (important for Vercel/production)
  app.set("trust proxy", 1);

  // Body parsing
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  /* ---------------- CORS CONFIGURATION ---------------- */
  const corsOptions = {
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, etc.)
      if (!origin) return callback(null, true);

      const allowedOrigins = [
        "http://localhost:3000",
        "http://localhost:5000",
        "https://suli-coffee.vercel.app",
        "https://suli-coffee-web.pages.dev", // Cloudflare Pages
        "https://suli-coffee.onrender.com",
        process.env.REACT_APP_BACKEND_URL,
        process.env.REACT_APP_FRONTEND_URL,
      ].filter(Boolean);

      const isAllowed = allowedOrigins.some(
        (allowedOrigin) =>
          origin === allowedOrigin || origin.startsWith(allowedOrigin)
      );

      if (isAllowed) {
        callback(null, true);
      } else {
        console.log(`❌ CORS blocked origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  };

  app.use(cors(corsOptions));

  /* ---------------- SECURITY HEADERS ---------------- */
  app.use((req, res, next) => {
    // Security headers
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

    // Remove powered by header
    res.removeHeader("X-Powered-By");

    next();
  });

  /* ---------------- CSP MIDDLEWARE ---------------- */
  console.log("🛡️ Setting up CSP middleware for frontend...");

  // Mount CSP middleware for demo routes and CSP protection
  const cspMiddleware = createCSPMiddleware(path.join(__dirname, "build"), {
    publicPath: path.join(__dirname, "public", "csp"),
    io,
    backendUrl: process.env.REACT_APP_BACKEND_URL || "http://localhost:5000",
  });

  app.use(cspMiddleware);

  console.log("✅ Frontend middleware setup completed!");
}

module.exports = setupMiddleware;
