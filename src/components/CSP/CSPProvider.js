// frontend/src/components/CSP/CSPProvider.js - CSP Protection Provider for React
// ✅ FIX: Detect violations trên Cloudflare Pages + Hiện nonce ở Hash & Nonce tab
import React, { createContext, useContext, useEffect, useState } from "react";
import io from "socket.io-client";

const CSPContext = createContext();

export const useCSP = () => {
  const context = useContext(CSPContext);
  if (!context) {
    throw new Error("useCSP must be used within a CSPProvider");
  }
  return context;
};

export const CSPProvider = ({ children }) => {
  const [cspLogs, setCSPLogs] = useState({
    violations: [],
    passes: [],
    connected: false,
  });

  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Track processed violations to avoid duplicates
    const processedViolations = new Map();

    // 🔥 FIX 1: Monitor console.error để detect CSP violations trên Cloudflare
    const originalConsoleError = console.error;
    const violationPatterns = [
      /Content Security Policy/i,
      /CSP/i,
      /violates.*directive/i,
      /blocked.*inline/i,
    ];

    console.error = function (...args) {
      const message = args.join(" ");
      const isCSPViolation = violationPatterns.some((pattern) =>
        pattern.test(message)
      );

      if (isCSPViolation) {
        // Extract thông tin từ console error message
        const violationKey = `console-${Date.now()}-${Math.random()}`;

        if (!processedViolations.has(violationKey)) {
          processedViolations.set(violationKey, Date.now());

          // Parse directive từ message
          let directive = "script-src";
          if (message.includes("script-src")) directive = "script-src";
          else if (message.includes("style-src")) directive = "style-src";
          else if (message.includes("img-src")) directive = "img-src";

          // Parse blocked URI
          let blockedUri = "inline";
          const uriMatch = message.match(/URI[:\s]+['"]?([^'"]+)['"]?/i);
          if (uriMatch) blockedUri = uriMatch[1];

          const violation = {
            id: `violation-${Date.now()}-${Math.random()}`,
            "blocked-uri": blockedUri,
            "violated-directive": directive,
            "effective-directive": directive,
            "document-uri": window.location.href,
            "original-policy": "detected-from-console",
            timestamp: new Date().toISOString(),
            status: "fail",
            source: "console-intercept", // Đánh dấu nguồn
          };

          setCSPLogs((prev) => ({
            ...prev,
            violations: [violation, ...prev.violations],
          }));
          // ✅ Emit violation lên backend qua socket
          if (socket) {
            socket.emit("newViolation", violation);
          }

          if (!window.cspViolations) {
            window.cspViolations = [];
          }
          window.cspViolations.unshift(violation);

          console.log("🔴 CSP Violation detected:", violation);

          // Clear old entries
          setTimeout(() => {
            processedViolations.delete(violationKey);
          }, 1000);
        }
      }

      // Gọi console.error gốc
      originalConsoleError.apply(console, args);
    };

    // Listen for CSP violations in browser (standard method)
    const handleViolation = (event) => {
      const baseKey = `${event.blockedURI}|${event.violatedDirective}|${event.documentURI}`;
      const lastTimestamp = processedViolations.get(baseKey);
      const now = Date.now();

      if (lastTimestamp && now - lastTimestamp < 100) {
        return;
      }

      processedViolations.set(baseKey, now);

      setTimeout(() => {
        const currentTimestamp = processedViolations.get(baseKey);
        if (currentTimestamp === now) {
          processedViolations.delete(baseKey);
        }
      }, 500);

      const violation = {
        id: `violation-${Date.now()}-${Math.random()}`,
        "blocked-uri": event.blockedURI,
        "violated-directive": event.violatedDirective,
        "effective-directive": event.effectiveDirective,
        "document-uri": event.documentURI,
        "original-policy": event.originalPolicy,
        timestamp: new Date().toISOString(),
        status: "fail",
      };

      setCSPLogs((prev) => ({
        ...prev,
        violations: [violation, ...prev.violations],
      }));
      // ✅ Emit violation
      if (socket) {
        socket.emit("newViolation", violation);
      }

      if (!window.cspViolations) {
        window.cspViolations = [];
      }
      window.cspViolations.unshift(violation);

      // Cache nonce từ violation
      if (!window.__cspNonce && event.originalPolicy) {
        const match = event.originalPolicy.match(/'nonce-([^']+)'/);
        if (match) {
          window.__cspNonce = match[1];
        }
      }
    };

    // Listen for CSP pass events
    const handlePass = (event) => {
      const passLog = event.detail;

      setCSPLogs((prev) => {
        const newState = {
          ...prev,
          passes: [passLog, ...prev.passes],
        };
        return newState;
      });
    };

    document.addEventListener("securitypolicyviolation", handleViolation);
    window.addEventListener("csp-pass", handlePass);

    // 🔥 FIX: Listen custom event từ _worker.js (để đảm bảo violation được nhận)
    const handleWorkerViolation = (event) => {
      const violation = event.detail;
      setCSPLogs((prev) => ({
        ...prev,
        violations: [violation, ...prev.violations],
      }));
      console.log("✅ Violation received from worker:", violation);
    };
    window.addEventListener("csp-violation-detected", handleWorkerViolation);

    // Connect to Socket.IO
    const isProduction =
      window.location.hostname.includes("vercel.app") ||
      window.location.hostname.includes("pages.dev") ||
      process.env.NODE_ENV === "production";
    const backendUrl =
      process.env.REACT_APP_BACKEND_URL ||
      (isProduction
        ? "https://suli-coffee.onrender.com"
        : "http://localhost:5000");

    const socketConnection = io(backendUrl, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      forceNew: true,
    });

    socketConnection.on("connect", () => {
      setCSPLogs((prev) => ({ ...prev, connected: true }));
    });

    socketConnection.on("disconnect", () => {
      setCSPLogs((prev) => ({ ...prev, connected: false }));
    });

    socketConnection.on("connect_error", (error) => {
      setCSPLogs((prev) => ({ ...prev, connected: false }));
    });

    socketConnection.on("initLogs", (data) => {
      setCSPLogs((prev) => ({
        ...prev,
        violations: data.violations || [],
        passes: data.passes || [],
      }));
    });

    socketConnection.on("newViolation", (violation) => {
      setCSPLogs((prev) => ({
        ...prev,
        violations: [violation, ...prev.violations],
      }));
    });

    socketConnection.on("scriptPass", (passLog) => {
      setCSPLogs((prev) => ({
        ...prev,
        passes: [passLog, ...prev.passes],
      }));
    });

    setSocket(socketConnection);

    // Store nonce globally
    if (!window.__cspNonce) {
      window.__cspNonce = null;
    }

    // 🔥 FIX 2: Global helper functions - ĐỌC NONCE TỪ WORKER
    window.getCSPNonce = () => {
      // Check if running on static hosting
      const isStaticHosting =
        window.location.hostname.includes("vercel.app") ||
        window.location.hostname.includes("netlify.app") ||
        window.location.hostname.includes("github.io");

      if (isStaticHosting) {
        return null;
      }

      // ✅ METHOD 1: Đọc từ window.__CSP_NONCE__ (worker inject)
      if (window.__CSP_NONCE__) {
        window.__cspNonce = window.__CSP_NONCE__;
        return window.__CSP_NONCE__;
      }

      // METHOD 2: Return cached nonce
      if (window.__cspNonce) {
        return window.__cspNonce;
      }

      // METHOD 3: Extract from existing script tags with nonce
      const scripts = document.querySelectorAll("script[nonce]");
      if (scripts.length > 0) {
        for (let script of scripts) {
          const nonce = script.getAttribute("nonce");
          if (nonce && nonce !== "__NONCE__") {
            window.__cspNonce = nonce;
            console.log("✅ Nonce found from <script> tag");
            return nonce;
          }
        }
      }

      // METHOD 4: Extract từ violations
      if (window.cspViolations && window.cspViolations.length > 0) {
        const violation = window.cspViolations[0];
        const policy = violation["original-policy"] || "";
        const match = policy.match(/'nonce-([^']+)'/);
        if (match) {
          window.__cspNonce = match[1];
          console.log("✅ Nonce found from CSP violation");
          return match[1];
        }
      }

      // METHOD 5: Try meta tag
      const meta = document.querySelector('meta[name="csp-nonce"]');
      if (meta) {
        const nonce = meta.getAttribute("content");
        if (nonce && nonce !== "__NONCE__") {
          window.__cspNonce = nonce;
          console.log("✅ Nonce found from meta tag");
          return nonce;
        }
      }

      console.warn("⚠️ No nonce found");
      return null;
    };

    window.testCSPNonce = (customNonce) => {
      const isStaticHosting =
        window.location.hostname.includes("vercel.app") ||
        window.location.hostname.includes("netlify.app") ||
        window.location.hostname.includes("github.io");

      if (isStaticHosting) {
        return;
      }

      const nonce = customNonce || window.getCSPNonce();
      if (!nonce) {
        console.error("❌ No nonce found in HTML.");
        console.info(
          "💡 Make sure backend/worker is injecting nonce into <script> tags"
        );
        return;
      }

      const testId = `csp_test_${Date.now()}`;
      window[testId] = false;

      const script = document.createElement("script");
      script.setAttribute("nonce", nonce);
      script.textContent = `
        console.log('✅ Nonce works!'); 
        window['${testId}'] = true;
        alert('✅ NONCE Works!');
      `;
      document.documentElement.appendChild(script);

      setTimeout(() => {
        if (window[testId]) {
          const backendUrl =
            process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";
          fetch(`${backendUrl}/api/log-pass`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              page: window.location.pathname,
              directive: `script-src with nonce-${nonce.substring(0, 10)}...`,
              timestamp: new Date().toISOString(),
            }),
          }).catch((err) => console.warn("Failed to log CSP pass:", err));

          const passLog = {
            id: `pass-${Date.now()}-${Math.random()}`,
            page: window.location.pathname,
            directive: `script-src with nonce`,
            timestamp: new Date().toISOString(),
            status: "pass",
          };

          window.dispatchEvent(
            new CustomEvent("csp-pass", { detail: passLog })
          );
        }

        delete window[testId];
      }, 100);
    };

    window.testManualNonce = (code) => {
      const nonce = window.getCSPNonce();
      if (!nonce) {
        console.error("❌ No nonce found. Trigger violation first:");
        console.info(
          "   const s = document.createElement('script'); s.textContent='//test'; document.head.appendChild(s);"
        );
        return;
      }

      console.log(
        `%c💡 Testing with nonce: "${nonce}"`,
        "color: blue; font-weight: bold"
      );
      console.log(`%c📝 Code to execute:`, "color: green");

      const s = document.createElement("script");
      s.setAttribute("nonce", nonce);
      s.textContent =
        code || "console.log('✅ Manual test works!'); alert('✅ Works!');";
      document.documentElement.appendChild(s);
    };

    // Intercept appendChild để track scripts với nonce (GIỮ NGUYÊN CODE GỐC)
    const originalAppendChild = Element.prototype.appendChild;
    Element.prototype.appendChild = function (child) {
      if (child.nodeName === "SCRIPT" && child.getAttribute("nonce")) {
        const scriptEl = child;
        const nonce = scriptEl.getAttribute("nonce");
        const scriptId = `script_${Date.now()}_${Math.random()}`;
        const executionFlag = `__csp_exec_${scriptId}__`;

        const originalContent = scriptEl.textContent || "";
        if (originalContent) {
          scriptEl.textContent = `window['${executionFlag}']=1;${originalContent}`;
        }

        const result = originalAppendChild.call(this, child);

        setTimeout(() => {
          if (window[executionFlag]) {
            delete window[executionFlag];

            const passLog = {
              id: `pass-${Date.now()}-${Math.random()}`,
              page: window.location.pathname,
              directive: `script-src with nonce-${nonce.substring(0, 10)}...`,
              timestamp: new Date().toISOString(),
              status: "pass",
            };

            window.dispatchEvent(
              new CustomEvent("csp-pass", { detail: passLog })
            );

            const backendUrl =
              process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";
            fetch(`${backendUrl}/api/log-pass`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(passLog),
            }).catch(() => {});
          }
        }, 50);

        return result;
      }

      return originalAppendChild.call(this, child);
    };

    return () => {
      document.removeEventListener("securitypolicyviolation", handleViolation);
      window.removeEventListener("csp-pass", handlePass);
      window.removeEventListener(
        "csp-violation-detected",
        handleWorkerViolation
      );
      Element.prototype.appendChild = originalAppendChild;
      console.error = originalConsoleError; // ✅ Restore console.error
      socketConnection.disconnect();
    };
  }, []);

  // Log CSP pass events
  const logCSPPass = (page, directive) => {
    const passLog = {
      page: page || window.location.pathname,
      directive: directive || "script-src",
      timestamp: new Date().toLocaleString("vi-VN"),
      status: "pass",
    };

    const backendUrl =
      process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";
    fetch(`${backendUrl}/api/log-pass`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(passLog),
    }).catch((err) => console.warn("Failed to log CSP pass:", err));
  };

  // Get CSP nonce from meta tag or worker
  const getCSPNonce = () => {
    // ✅ Ưu tiên đọc từ window.__CSP_NONCE__ (worker inject)
    if (window.__CSP_NONCE__) {
      return window.__CSP_NONCE__;
    }

    const metaNonce = document.querySelector('meta[name="csp-nonce"]');
    return metaNonce ? metaNonce.getAttribute("content") : null;
  };

  // Safe script execution with CSP
  const executeScript = (scriptContent, options = {}) => {
    try {
      const script = document.createElement("script");
      const nonce = getCSPNonce();

      if (nonce) {
        script.setAttribute("nonce", nonce);
      }

      script.textContent = scriptContent;

      if (options.onLoad) {
        script.onload = options.onLoad;
      }

      if (options.onError) {
        script.onerror = options.onError;
      }

      document.head.appendChild(script);
      logCSPPass(window.location.pathname, "script-src");

      return true;
    } catch (error) {
      console.error("CSP Script execution failed:", error);
      return false;
    }
  };

  const contextValue = {
    ...cspLogs,
    socket,
    logCSPPass,
    getCSPNonce,
    executeScript,
  };

  return (
    <CSPContext.Provider value={contextValue}>{children}</CSPContext.Provider>
  );
};

export default CSPProvider;
