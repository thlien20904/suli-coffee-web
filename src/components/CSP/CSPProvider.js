// frontend/src/components/CSP/CSPProvider.js - CSP Protection Provider for React (FIX: EARLY LISTENER + PRIORITIZE META NONCE + LOCAL-ONLY FOR FAIL/PASS)
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

    // Khai báo backendUrl ở đầu để có thể dùng trong handleViolation
    const isProduction =
      window.location.hostname.includes("vercel.app") ||
      window.location.hostname.includes("pages.dev") ||
      process.env.NODE_ENV === "production";
    const backendUrl =
      process.env.REACT_APP_BACKEND_URL ||
      (isProduction
        ? "https://suli-coffee.onrender.com"
        : "http://localhost:5000");

    // Listen for CSP violations in browser (FIX: USE CAPTURE PHASE ĐỂ CATCH EARLY, TRƯỚC KHI REACT MOUNT)
    const handleViolation = (event) => {
      console.log('🔍 Violation event fired (early capture):', event); // DEBUG: CHECK IF FIRES ON CLOUDFLARE

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

      // Add to local violations (LOCAL-ONLY, NO BACKEND CALL ĐỂ TRÁNH 404)
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
        violations: [violation, ...prev.violations.slice(0, 50)], // LIMIT ARRAY ĐỂ TRÁNH LAG, GIỮ MỚI NHẤT
      }));

      // Expose to window for easy access
      if (!window.cspViolations) {
        window.cspViolations = [];
      }
      window.cspViolations.unshift(violation);
      window.cspViolations = window.cspViolations.slice(0, 50); // LIMIT GLOBAL TOO

      // Cache nonce từ violation đầu tiên (UPDATE IMMEDIATE)
      if (event.originalPolicy) {
        const match = event.originalPolicy.match(/'nonce-([^']+)'/);
        if (match) {
          window.__cspNonce = match[1];
          console.log('🔍 Updated nonce from violation:', window.__cspNonce); // DEBUG
        }
      }
    };

    // Listen for CSP pass events (from window.testCSPNonce)
    const handlePass = (event) => {
      console.log('🔍 Pass event fired:', event.detail); // DEBUG
      const passLog = event.detail;

      setCSPLogs((prev) => ({
        ...prev,
        passes: [passLog, ...prev.passes.slice(0, 50)], // LIMIT ARRAY
      }));
    };

    // ADD LISTENER EARLY WITH CAPTURE PHASE (FIX CLOUDFLARE TIMING ISSUE)
    document.addEventListener("securitypolicyviolation", handleViolation, { capture: true, passive: true });
    window.addEventListener("csp-pass", handlePass, { capture: true, passive: true });

    // Connect to Socket.IO for CSP monitoring (dùng backendUrl đã khai báo ở trên) - OPTIONAL, CATCH ERROR
    let socketConnection;
    if (!isProduction) { // SKIP SOCKET ON PROD IF NO BACKEND
      socketConnection = io(backendUrl, {
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
        console.warn('Socket connect error (ignored on prod):', error);
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
    }

    // Store nonce globally khi detect từ violations
    if (!window.__cspNonce) {
      window.__cspNonce = null;
    }

    // 🔥 Global helper functions for CSP testing (LOCAL-ONLY, NO FETCH BACKEND ĐỂ TRÁNH 404)
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

      // FIX: ALWAYS PRIORITIZE META TAG FIRST (FRESH PER LOAD), UPDATE CACHE
      const meta = document.querySelector('meta[name="csp-nonce"]');
      if (meta) {
        const nonce = meta.getAttribute("content");
        if (nonce && nonce !== "__NONCE__") {
          window.__cspNonce = nonce;
          console.log("✅ Fresh nonce from meta tag:", nonce); // DEBUG FOR TAB UPDATE
          return nonce;
        }
      }

      // Method 1: Return cached nonce (if meta failed)
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

      // Check if script executed and log as pass (LOCAL-ONLY, NO FETCH)
      setTimeout(() => {
        if (window[testId]) {
          // Update local state
          const passLog = {
            id: `pass-${Date.now()}-${Math.random()}`,
            page: window.location.pathname,
            directive: `script-src with nonce-${nonce.substring(0, 10)}...`,
            timestamp: new Date().toISOString(),
            status: "pass",
          };

          // Trigger custom event for CSP Dashboard to listen
          window.dispatchEvent(
            new CustomEvent("csp-pass", { detail: passLog })
          );

          console.log('✅ Pass logged locally:', passLog); // DEBUG
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

    // Intercept appendChild để track scripts với nonce (LOCAL-ONLY, NO FETCH)
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

            console.log('✅ Intercept pass logged:', passLog); // DEBUG

            // NO FETCH BACKEND (AVOID 404)
          }
        }, 50);

        return result;
      }

      // Không phải nonce script, gọi bình thường
      return originalAppendChild.call(this, child);
    };

    return () => {
      document.removeEventListener("securitypolicyviolation", handleViolation, { capture: true });
      window.removeEventListener("csp-pass", handlePass, { capture: true });
      Element.prototype.appendChild = originalAppendChild;
      if (socketConnection) socketConnection.disconnect();
    };
  }, []);

  // Log CSP pass events (LOCAL-ONLY)
  const logCSPPass = (page, directive) => {
    const passLog = {
      page: page || window.location.pathname,
      directive: directive || "script-src",
      timestamp: new Date().toISOString(),
      status: "pass",
    };

    setCSPLogs((prev) => ({
      ...prev,
      passes: [passLog, ...prev.passes.slice(0, 50)],
    }));

    // NO BACKEND FETCH (AVOID 404)
  };

  // Get CSP nonce from meta tag (if available) - PRIORITIZE META
  const getCSPNonce = () => {
    // FIX: ALWAYS CHECK META FIRST & UPDATE CACHE
    const meta = document.querySelector('meta[name="csp-nonce"]');
    if (meta) {
      const nonce = meta.getAttribute("content");
      if (nonce && nonce !== "__NONCE__") {
        window.__cspNonce = nonce;
        return nonce;
      }
    }

    // Fallback to global cache or other methods
    return window.__cspNonce || null;
  };

  // Safe script execution with CSP (LOCAL-ONLY)
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

      // Log success locally
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