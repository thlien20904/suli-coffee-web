// frontend/src/components/CSP/CSPProvider.js - CSP Protection Provider for React
// ✅ FIX: POLLING CSP violations từ Performance API cho Cloudflare Pages
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
    // Track processed violations để tránh duplicate
    const processedViolations = new Map();

    // 🔥 FIX 1: ĐỌC NONCE TỪ WORKER (window.__CSP_NONCE__)
    const getCurrentNonce = () => {
      // Ưu tiên: window.__CSP_NONCE__ (worker inject) > meta tag > cached
      if (window.__CSP_NONCE__) {
        window.__cspNonce = window.__CSP_NONCE__;
        return window.__CSP_NONCE__;
      }

      const meta = document.querySelector('meta[name="csp-nonce"]');
      if (meta) {
        const nonce = meta.getAttribute("content");
        if (nonce && nonce !== "__NONCE__") {
          window.__cspNonce = nonce;
          return nonce;
        }
      }

      return window.__cspNonce || null;
    };

    // 🔥 FIX 2: POLLING CSP VIOLATIONS TỪ PERFORMANCE API
    // Cloudflare worker có thể block securitypolicyviolation event
    const pollCSPViolations = () => {
      try {
        const entries = performance.getEntries();

        entries.forEach((entry) => {
          // CSP violations xuất hiện như Resource Timing với type = "csp-violation"
          if (
            entry.entryType === "csp-violation" ||
            (entry.name && entry.name.includes("csp-violation"))
          ) {
            const violationKey = `${entry.blockedURI || "inline"}|${
              entry.violatedDirective || entry.effectiveDirective
            }|${Date.now()}`;

            if (!processedViolations.has(violationKey)) {
              processedViolations.set(violationKey, Date.now());

              const violation = {
                id: `violation-${Date.now()}-${Math.random()}`,
                "blocked-uri": entry.blockedURI || "inline",
                "violated-directive":
                  entry.violatedDirective ||
                  entry.effectiveDirective ||
                  "script-src",
                "effective-directive": entry.effectiveDirective || "script-src",
                "document-uri": window.location.href,
                "original-policy": entry.disposition || "enforce",
                timestamp: new Date().toISOString(),
                status: "fail",
              };

              setCSPLogs((prev) => ({
                ...prev,
                violations: [violation, ...prev.violations],
              }));

              if (!window.cspViolations) {
                window.cspViolations = [];
              }
              window.cspViolations.unshift(violation);
            }
          }
        });
      } catch (e) {
        console.warn("⚠️ Performance API polling failed:", e);
      }
    };

    // 🔥 FIX 3: INTERCEPT CONSOLE.ERROR ĐỂ DETECT CSP VIOLATIONS
    // Cloudflare log CSP violations vào console
    const originalConsoleError = console.error;
    console.error = function (...args) {
      const message = args.join(" ");

      // Detect CSP violation từ console error
      if (
        message.includes("Content Security Policy") ||
        message.includes("CSP") ||
        message.includes("violated directive")
      ) {
        const violationKey = `console-${message.substring(
          0,
          50
        )}-${Date.now()}`;

        if (!processedViolations.has(violationKey)) {
          processedViolations.set(violationKey, Date.now());

          // Extract directive từ message
          let directive = "script-src";
          if (message.includes("script-src")) directive = "script-src";
          else if (message.includes("style-src")) directive = "style-src";
          else if (message.includes("img-src")) directive = "img-src";

          const violation = {
            id: `violation-${Date.now()}-${Math.random()}`,
            "blocked-uri": "inline",
            "violated-directive": directive,
            "effective-directive": directive,
            "document-uri": window.location.href,
            "original-policy": "enforce",
            source: "console-error",
            timestamp: new Date().toISOString(),
            status: "fail",
          };

          setCSPLogs((prev) => ({
            ...prev,
            violations: [violation, ...prev.violations],
          }));

          if (!window.cspViolations) {
            window.cspViolations = [];
          }
          window.cspViolations.unshift(violation);
        }
      }

      originalConsoleError.apply(console, args);
    };

    // Listen for CSP violations (fallback method)
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

      if (!window.cspViolations) {
        window.cspViolations = [];
      }
      window.cspViolations.unshift(violation);

      // Cache nonce
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
      setCSPLogs((prev) => ({
        ...prev,
        passes: [passLog, ...prev.passes],
      }));
    };

    document.addEventListener("securitypolicyviolation", handleViolation);
    window.addEventListener("csp-pass", handlePass);

    // 🔥 START POLLING EVERY 500ms (cho Cloudflare)
    const pollInterval = setInterval(pollCSPViolations, 500);

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

    // 🔥 Global helper functions - UPDATED
    window.getCSPNonce = () => {
      const nonce = getCurrentNonce();
      if (nonce) {
        console.log(`✅ Current nonce: ${nonce}`);
      } else {
        console.warn("⚠️ No nonce found");
      }
      return nonce;
    };

    window.testCSPNonce = (customNonce) => {
      const nonce = customNonce || getCurrentNonce();
      if (!nonce) {
        console.error("❌ No nonce found in HTML.");
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
      const nonce = getCurrentNonce();
      if (!nonce) {
        console.error("❌ No nonce found.");
        return;
      }

      console.log(`💡 Testing with nonce: "${nonce}"`);
      const s = document.createElement("script");
      s.setAttribute("nonce", nonce);
      s.textContent =
        code || "console.log('✅ Manual test works!'); alert('✅ Works!');";
      document.documentElement.appendChild(s);
    };

    // Intercept appendChild để track scripts với nonce
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
          }
        }, 50);

        return result;
      }

      return originalAppendChild.call(this, child);
    };

    return () => {
      document.removeEventListener("securitypolicyviolation", handleViolation);
      window.removeEventListener("csp-pass", handlePass);
      Element.prototype.appendChild = originalAppendChild;
      console.error = originalConsoleError;
      clearInterval(pollInterval);
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

  const getCSPNonce = () => {
    if (window.__CSP_NONCE__) return window.__CSP_NONCE__;

    const metaNonce = document.querySelector('meta[name="csp-nonce"]');
    return metaNonce ? metaNonce.getAttribute("content") : null;
  };

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
