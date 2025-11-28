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
    // === SỬA 1: ĐẨY isProduction + backendUrl LÊN TRÊN CÙNG TRONG useEffect ===
    const isProduction = !window.location.hostname.includes("localhost");
    const globalBackendUrl = process.env.REACT_APP_BACKEND_URL ||
      (isProduction ? "https://suli-coffee.onrender.com" : "http://localhost:5000");

    // Track processed violations to avoid duplicates (CSP fires twice per violation)
    const processedViolations = new Map();

    // Listen for CSP violations in browser
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

      // Update nonce từ violation (ưu tiên log đỏ)
      if (event.originalPolicy) {
        const match = event.originalPolicy.match(/'nonce-([^']+)'/);
        if (match && match[1] !== window.__cspNonce) {
          window.__cspNonce = match[1];
          window.dispatchEvent(new CustomEvent("csp-nonce-updated", { detail: { nonce: match[1] } }));
        }
      }

      // === SỬA 2: DÙNG globalBackendUrl Ở ĐÂY (trước đó bị undefined vì isProduction chưa khai báo) ===
      fetch(`${globalBackendUrl}/api/log-violation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(violation),
      }).catch((err) => console.warn("Failed to log CSP violation to backend:", err));
    };

    const handlePass = (event) => {
      const passLog = event.detail;
      setCSPLogs((prev) => ({
        ...prev,
        passes: [passLog, ...prev.passes],
      }));
    };

    document.addEventListener("securitypolicyviolation", handleViolation);
    window.addEventListener("csp-pass", handlePass);

    // Connect to Socket.IO for CSP monitoring (giữ nguyên như cũ)
    const socketConnection = io(globalBackendUrl, {
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

    if (!window.__cspNonce) {
      window.__cspNonce = null;
    }

    // Global helper functions - giữ nguyên 100%
    window.getCSPNonce = () => {
      if (window.__cspNonce) return window.__cspNonce;

      const scripts = document.querySelectorAll("script[nonce]");
      if (scripts.length > 0) {
        for (let script of scripts) {
          const nonce = script.getAttribute("nonce");
          if (nonce && nonce !== "__NONCE__") {
            window.__cspNonce = nonce;
            console.log("Nonce found from <script> tag");
            return nonce;
          }
        }
      }

      if (window.cspViolations && window.cspViolations.length > 0) {
        const violation = window.cspViolations[0];
        const policy = violation["original-policy"] || "";
        const match = policy.match(/'nonce-([^']+)'/);
        if (match) {
          window.__cspNonce = match[1];
          console.log("Nonce found from CSP violation");
          return match[1];
        }
      }

      const meta = document.querySelector('meta[name="csp-nonce"]');
      if (meta) {
        const nonce = meta.getAttribute("content");
        if (nonce && nonce !== "__NONCE__") {
          window.__cspNonce = nonce;
          console.log("Nonce found from meta tag");
          return nonce;
        }
      }

      console.warn("No nonce found - backend not injecting nonce");
      return null;
    };

    window.testCSPNonce = (customNonce) => {
      const nonce = customNonce || window.getCSPNonce();
      if (!nonce) {
        console.error("No nonce found in HTML.");
        console.info("Make sure backend is injecting nonce into <script> tags");
        console.info(" Check: View Page Source → search for 'nonce='");
        return;
      }

      const testId = `csp_test_${Date.now()}`;
      window[testId] = false;
      const script = document.createElement("script");
      script.setAttribute("nonce", nonce);
      script.textContent = `
        console.log('Nonce works!');
        window['${testId}'] = true;
        alert('NONCE Works!');
      `;
      document.documentElement.appendChild(script);

      setTimeout(() => {
        if (window[testId]) {
          // === SỬA 3: DÙNG globalBackendUrl Ở ĐÂY (trước đó là localhost) ===
          fetch(`${globalBackendUrl}/api/log-pass`, {
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
          window.dispatchEvent(new CustomEvent("csp-pass", { detail: passLog }));
        }
        delete window[testId];
      }, 100);
    };

    window.testManualNonce = (code) => {
      const nonce = window.getCSPNonce();
      if (!nonce) {
        console.error("No nonce found. Trigger violation first:");
        console.info(
          " const s = document.createElement('script'); s.textContent='//test'; document.head.appendChild(s);"
        );
        return;
      }
      console.log(
        `%cTesting with nonce: "${nonce}"`,
        "color: blue; font-weight: bold"
      );
      console.log(`%cCode to execute:`, "color: green");
      const s = document.createElement("script");
      s.setAttribute("nonce", nonce);
      s.textContent =
        code || "console.log('Manual test works!'); alert('Works!');";
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
            // === CÙNG DÙNG globalBackendUrl Ở ĐÂY ===
            fetch(`${globalBackendUrl}/api/log-pass`, {
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

    // === SỬA 4: TỰ ĐỘNG GỌI getCSPNonce SAU KHI LOAD XONG (fix __NONCE__) ===
    setTimeout(() => {
      window.getCSPNonce?.();
      window.dispatchEvent(new CustomEvent("csp-nonce-updated"));
    }, 1000);

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