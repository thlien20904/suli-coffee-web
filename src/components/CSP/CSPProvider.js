// frontend/src/components/CSP/CSPProvider.js - CSP Protection Provider for React
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
    // Track processed violations to avoid duplicates (CSP fires twice per violation)
    const processedViolations = new Map(); // Use Map to store timestamp

    // Listen for CSP violations in browser
    const handleViolation = (event) => {
      // Create base key (không có timestamp)
      const baseKey = `${event.blockedURI}|${event.violatedDirective}|${event.documentURI}`;

      // Check nếu violation này vừa fire (trong 100ms) - CSP fires twice
      const lastTimestamp = processedViolations.get(baseKey);
      const now = Date.now();

      if (lastTimestamp && now - lastTimestamp < 100) {
        // Duplicate trong 100ms, skip
        return;
      }

      // Update timestamp cho violation này
      processedViolations.set(baseKey, now);

      // Clear old entries after 500ms
      setTimeout(() => {
        const currentTimestamp = processedViolations.get(baseKey);
        if (currentTimestamp === now) {
          processedViolations.delete(baseKey);
        }
      }, 500);

      // Add to local violations
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

      // Expose to window for easy access
      if (!window.cspViolations) {
        window.cspViolations = [];
      }
      window.cspViolations.unshift(violation);

      // Cache nonce từ violation đầu tiên
      if (!window.__cspNonce && event.originalPolicy) {
        const match = event.originalPolicy.match(/'nonce-([^']+)'/);
        if (match) {
          window.__cspNonce = match[1];
        }
      }
    };

    // Listen for CSP pass events (from window.testCSPNonce)
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

    // Connect to Socket.IO for CSP monitoring
    const isProduction =
      window.location.hostname.includes("vercel.app") ||
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

    // Store nonce globally khi detect từ violations
    if (!window.__cspNonce) {
      window.__cspNonce = null;
    }

    // 🔥 Global helper functions for CSP testing
    window.getCSPNonce = () => {
      // Check if running on static hosting (Vercel) - no nonce support
      const isStaticHosting =
        window.location.hostname.includes("vercel.app") ||
        window.location.hostname.includes("netlify.app") ||
        window.location.hostname.includes("github.io");

      if (isStaticHosting) {
        // Silent return on static hosting - nonce not available
        return null;
      }

      // Method 1: Return cached nonce
      if (window.__cspNonce) {
        return window.__cspNonce;
      }

      // Method 2: Extract from existing script tags with nonce
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

      // Method 3: Extract từ violations đã có
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

      // Method 4: Try meta tag
      const meta = document.querySelector('meta[name="csp-nonce"]');
      if (meta) {
        const nonce = meta.getAttribute("content");
        if (nonce && nonce !== "__NONCE__") {
          window.__cspNonce = nonce;
          console.log("✅ Nonce found from meta tag");
          return nonce;
        }
      }

      console.warn("⚠️ No nonce found - backend not injecting nonce");
      return null;
    };

    window.testCSPNonce = (customNonce) => {
      // Check if on static hosting
      const isStaticHosting =
        window.location.hostname.includes("vercel.app") ||
        window.location.hostname.includes("netlify.app") ||
        window.location.hostname.includes("github.io");

      if (isStaticHosting) {
        // Silent return on static hosting - nonce testing not available
        return;
      }

      const nonce = customNonce || window.getCSPNonce();
      if (!nonce) {
        console.error("❌ No nonce found in HTML.");
        console.info(
          "💡 Make sure backend is injecting nonce into <script> tags"
        );
        console.info("   Check: View Page Source → search for 'nonce='");
        return;
      }

      // Track if script executes successfully
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

      // Check if script executed and log as pass
      setTimeout(() => {
        if (window[testId]) {
          // Log pass event to backend
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

          // Update local state
          const passLog = {
            id: `pass-${Date.now()}-${Math.random()}`,
            page: window.location.pathname,
            directive: `script-src with nonce`,
            timestamp: new Date().toISOString(),
            status: "pass",
          };

          // Trigger custom event for CSP Dashboard to listen
          window.dispatchEvent(
            new CustomEvent("csp-pass", { detail: passLog })
          );
        }

        delete window[testId];
      }, 100);
    };

    // Helper: Test với nonce thủ công (bao gồm cả dấu ngoặc kép)
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
      s.setAttribute("nonce", nonce); // ✅ Đã có dấu ngoặc kép
      s.textContent =
        code || "console.log('✅ Manual test works!'); alert('✅ Works!');";
      document.documentElement.appendChild(s);
    };

    // CSP Helpers available: window.getCSPNonce(), window.testCSPNonce(), window.testManualNonce()

    // Intercept appendChild để track scripts với nonce
    const originalAppendChild = Element.prototype.appendChild;
    Element.prototype.appendChild = function (child) {
      // Check nếu là script element với nonce
      if (child.nodeName === "SCRIPT" && child.getAttribute("nonce")) {
        const scriptEl = child;
        const nonce = scriptEl.getAttribute("nonce");
        const scriptId = `script_${Date.now()}_${Math.random()}`;
        const executionFlag = `__csp_exec_${scriptId}__`;

        // Wrap content with execution flag
        const originalContent = scriptEl.textContent || "";
        if (originalContent) {
          scriptEl.textContent = `window['${executionFlag}']=1;${originalContent}`;
        }

        // Gọi appendChild gốc
        const result = originalAppendChild.call(this, child);

        // Check execution sau khi script chạy
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

      // Không phải nonce script, gọi bình thường
      return originalAppendChild.call(this, child);
    };

    return () => {
      document.removeEventListener("securitypolicyviolation", handleViolation);
      window.removeEventListener("csp-pass", handlePass);
      Element.prototype.appendChild = originalAppendChild;
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

    // Send to backend
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

  // Get CSP nonce from meta tag (if available)
  const getCSPNonce = () => {
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

      // Log success
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
