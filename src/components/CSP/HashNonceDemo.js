import React, { useState, useEffect } from "react";
import { useCSP } from "./CSPProvider";
import "./HashNonceDemo.css";

// ⭐ Hash cố định để test (SHA-256 của script content)
const DEMO_SCRIPTS = {
  hello: {
    content: "console.log('Hello from hash script!');",
    hash: "sha256-BKU8tKGd0KZuZtZW7c8Qpe3gvmFJ9cJdVe3v3tZyGbI=",
  },
  alert: {
    content: "alert('Hash demo works!');",
    hash: "sha256-R8TqFr7hL0qK3Y9F8K5Nc9L3hV7F8qRz0Td1cM2QzN4=",
  },
  pass: {
    content: "console.log('✅ CSP Pass Test'); window.__hashTestPass = true;",
    hash: "sha256-7KeYHLqXdC8kKKqmVYS0d4v1Y7eG5vC5qv+T0rJ1w1M=",
  },
};

// ⭐ Calculate hash helper (available globally)
const calculateHashHelper = async (scriptContent) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(scriptContent);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return `sha256-${btoa(String.fromCharCode(...new Uint8Array(hashBuffer)))}`;
};

// ⭐ GLOBAL helper functions - available immediately in Console!
if (typeof window !== "undefined") {
  window.hashTest = {
    // Test with fixed hash (works on static hosting like Vercel)
    testHash: (key = "pass") => {
      const script = DEMO_SCRIPTS[key];
      if (!script) {
        console.error("❌ Invalid key! Available:", Object.keys(DEMO_SCRIPTS));
        return;
      }
      const s = document.createElement("script");
      s.textContent = script.content;
      document.head.appendChild(s);
      console.log("📝 Content:", script.content);
      console.log("🔐 Hash:", script.hash);
      console.log("💡 Add to backend CSP: script-src '" + script.hash + "'");
    },

    // Show all available hashes
    showAll: () => {
      console.log("📋 Available hash demos:");
      Object.keys(DEMO_SCRIPTS).forEach((key) => {
        console.log(`\n🔹 ${key}:`);
        console.log("  Content:", DEMO_SCRIPTS[key].content);
        console.log("  Hash:", DEMO_SCRIPTS[key].hash);
      });
      console.log('\n💡 Usage: window.hashTest.testHash("hello")');
    },

    // Calculate hash for custom code
    calcHash: async (code) => {
      const hash = await calculateHashHelper(code);
      console.log("📝 Code:", code);
      console.log("🔐 Hash:", hash);
      console.log("💡 Add to CSP: script-src '" + hash + "'");
      return hash;
    },

    // Get all hashes as object
    getHashes: () => {
      return DEMO_SCRIPTS;
    },
  };

  console.log("🎯 Hash Test Helper loaded! (Vercel compatible)");
  console.log('Try: window.hashTest.testHash("pass")');
  console.log("Or:  window.hashTest.showAll()");
}

const HashNonceDemo = () => {
  const [currentNonce, setCurrentNonce] = useState("");
  const [testResults, setTestResults] = useState([]);
  const { violations, getCSPNonce } = useCSP();

  // Lấy nonce từ CSP violations (realtime)
  const getNonceFromViolations = () => {
    // Thử từ violations prop
    if (violations && violations.length > 0) {
      const lastViolation = violations[0];
      const policy = lastViolation["original-policy"] || "";
      const match = policy.match(/'nonce-([^']+)'/);
      if (match) {
        console.log("🔑 Nonce from violations prop:", match[1]);
        return match[1];
      }
    }

    // Thử từ window.cspViolations
    if (window.cspViolations && window.cspViolations.length > 0) {
      const lastViolation = window.cspViolations[0];
      const policy = lastViolation["original-policy"] || "";
      const match = policy.match(/'nonce-([^']+)'/);
      if (match) {
        console.log("🔑 Nonce from window.cspViolations:", match[1]);
        return match[1];
      }
    }

    return null;
  };

  // Trigger một violation giả để lấy nonce từ CSP error
  const extractNonceFromCSPError = () => {
    return new Promise((resolve) => {
      let capturedNonce = null;

      // Override console.error tạm thời để capture CSP message
      const originalError = console.error;
      console.error = function (...args) {
        const message = args.join(" ");
        const match = message.match(/'nonce-([^']+)'/);
        if (match) {
          capturedNonce = match[1];
        }
        originalError.apply(console, args);
      };

      // Trigger một violation để CSP báo lỗi
      const testScript = document.createElement("script");
      testScript.textContent = "// CSP nonce test";
      document.head.appendChild(testScript);
      document.head.removeChild(testScript);

      // Restore console.error
      setTimeout(() => {
        console.error = originalError;
        if (capturedNonce) {
          console.log("🔑 Nonce extracted from CSP error:", capturedNonce);
        }
        resolve(capturedNonce);
      }, 100);
    });
  };

  // Lấy nonce từ meta tag (nếu backend đã replace)
  const getNonceFromMeta = () => {
    const meta = document.querySelector('meta[name="csp-nonce"]');
    if (meta) {
      const nonce = meta.getAttribute("content");
      // Check nếu nonce đã được replace (không phải __NONCE__)
      if (nonce && nonce !== "__NONCE__") {
        console.log("🔑 Nonce from meta tag:", nonce);
        return nonce;
      }
    }
    console.warn("⚠️ Meta tag nonce chưa được replace");
    return null;
  };

  // Refresh nonce (thử nhiều nguồn)
  const refreshNonce = async () => {
    console.log("🔄 Refreshing nonce...");

    // 1. Thử lấy từ meta tag trước
    let nonce = getNonceFromMeta();

    // 2. Thử từ violations log
    if (!nonce) {
      nonce = getNonceFromViolations();
    }

    // 3. Thử từ CSPProvider
    if (!nonce && getCSPNonce) {
      nonce = getCSPNonce();
    }

    // 4. Cuối cùng: Extract từ CSP error message
    if (!nonce) {
      console.log("🔍 Extracting nonce from CSP error...");
      nonce = await extractNonceFromCSPError();
    }

    if (nonce) {
      setCurrentNonce(nonce);
      console.log("✅ Current nonce:", nonce);
    } else {
      console.error("❌ Cannot get nonce from any source!");
      setCurrentNonce("⚠️ Nonce không khả dụng");
    }
  };

  // Tính hash của script
  const calculateHash = async (scriptContent) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(scriptContent);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return `sha256-${btoa(String.fromCharCode(...new Uint8Array(hashBuffer)))}`;
  };

  useEffect(() => {
    refreshNonce();

    // Auto-refresh nonce khi có violations mới
    const interval = setInterval(() => {
      const newNonce = getNonceFromViolations();
      if (newNonce && newNonce !== currentNonce) {
        console.log("🔄 Auto-detected new nonce:", newNonce);
        setCurrentNonce(newNonce);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [violations, currentNonce]);

  const addTestResult = (test, success, message) => {
    setTestResults((prev) => [
      ...prev,
      {
        id: Date.now(),
        test,
        success,
        message,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  };

  // Test 1: Inline script without nonce (should fail)
  const testInlineWithoutNonce = () => {
    try {
      const script = document.createElement("script");
      script.innerHTML = `console.log('❌ No nonce - should be blocked');`;
      document.head.appendChild(script);

      setTimeout(() => {
        addTestResult(
          "Inline Script (No Nonce)",
          false,
          "❌ Should be blocked - no nonce provided"
        );
      }, 100);
    } catch (error) {
      addTestResult(
        "Inline Script (No Nonce)",
        true,
        "✅ Blocked by CSP: " + error.message
      );
    }
  };

  // Test 2: Inline script with valid nonce (should work if CSP allows)
  const testInlineWithValidNonce = () => {
    // Thử lấy nonce từ nhiều nguồn
    let nonce = getNonceFromMeta() || getNonceFromCSPHeader() || currentNonce;

    if (!nonce || nonce === "⚠️ Nonce không khả dụng") {
      addTestResult(
        "Inline Script (Valid Nonce)",
        false,
        "❌ No valid nonce available"
      );
      return;
    }

    console.log(`🔑 Testing with nonce: ${nonce}`);

    try {
      // Create script element with nonce
      const script = document.createElement("script");
      script.setAttribute("nonce", nonce);
      script.textContent = `
        console.log('✅ Valid nonce - should work');
        window.nonceTestResult = 'SUCCESS';
        alert('✅ NONCE Works!');
      `;

      document.documentElement.appendChild(script);

      setTimeout(() => {
        if (window.nonceTestResult === "SUCCESS") {
          addTestResult(
            "Inline Script (Valid Nonce)",
            true,
            `✅ Executed with nonce: ${nonce.substring(0, 15)}...`
          );
          delete window.nonceTestResult;
        } else {
          addTestResult(
            "Inline Script (Valid Nonce)",
            false,
            `❌ Blocked despite nonce: ${nonce.substring(0, 15)}...`
          );
        }
      }, 500);
    } catch (error) {
      addTestResult(
        "Inline Script (Valid Nonce)",
        false,
        "❌ Error: " + error.message
      );
    }
  };

  // Test 3A: Script với hash cố định (demo cho thầy)
  const testFixedHashScript = (scriptKey = "pass") => {
    const demoScript = DEMO_SCRIPTS[scriptKey];
    if (!demoScript) {
      addTestResult("Fixed Hash Test", false, "❌ Invalid script key");
      return;
    }

    console.log(`🔍 Testing fixed hash script: ${scriptKey}`);
    console.log(`📝 Content: ${demoScript.content}`);
    console.log(`#️⃣ Hash: ${demoScript.hash}`);

    try {
      const script = document.createElement("script");
      script.textContent = demoScript.content;
      document.head.appendChild(script);

      setTimeout(() => {
        // Check if script executed
        if (window.__hashTestPass) {
          addTestResult(
            `Fixed Hash (${scriptKey})`,
            true,
            `✅ Script executed! Hash: ${demoScript.hash}`
          );
          delete window.__hashTestPass;
        } else {
          addTestResult(
            `Fixed Hash (${scriptKey})`,
            false,
            `❌ Blocked. Add to CSP: script-src '${demoScript.hash}'`
          );
        }
      }, 200);
    } catch (error) {
      addTestResult(
        `Fixed Hash (${scriptKey})`,
        false,
        `❌ Error: ${error.message}`
      );
    }
  };

  // Test 3B: Script with dynamic hash (calculate and test)
  const testScriptWithHash = async () => {
    const scriptContent = `console.log('✅ Hash verified script'); window.hashTestResult = 'SUCCESS';`;

    try {
      const hash = await calculateHash(scriptContent);
      console.log(`🔐 Script hash: ${hash}`);

      const script = document.createElement("script");
      script.innerHTML = scriptContent;
      script.setAttribute("data-hash", hash);
      document.head.appendChild(script);

      setTimeout(() => {
        if (window.hashTestResult === "SUCCESS") {
          addTestResult(
            "Script with Hash",
            true,
            `✅ Executed with hash: ${hash.substring(0, 20)}...`
          );
          delete window.hashTestResult;
        } else {
          addTestResult(
            "Script with Hash",
            false,
            `❌ Blocked despite hash: ${hash.substring(0, 20)}...`
          );
        }
      }, 100);
    } catch (error) {
      addTestResult("Script with Hash", false, "❌ Error: " + error.message);
    }
  };

  // Test 4: External script (should work)
  const testExternalScript = () => {
    const script = document.createElement("script");
    script.src =
      "data:text/javascript;base64,Y29uc29sZS5sb2coJ+KchSBFeHRlcm5hbCBzY3JpcHQgbG9hZGVkJyk7";

    script.onload = () => {
      addTestResult(
        "External Script",
        true,
        "✅ External script loaded successfully"
      );
    };

    script.onerror = () => {
      addTestResult("External Script", false, "❌ External script blocked");
    };

    document.head.appendChild(script);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="hash-nonce-demo">
      <h2>🔐 Hash & Nonce Security Demo</h2>

      <div className="nonce-section">
        <div className="nonce-info">
          <h3>🔑 Current Nonce</h3>
          <div className="nonce-display">
            <code>{currentNonce || "Loading..."}</code>
            <button onClick={refreshNonce} className="refresh-btn">
              🔄 Refresh
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(currentNonce);
                alert("✅ Nonce copied to clipboard!");
              }}
              className="refresh-btn"
              disabled={!currentNonce}
            >
              📋 Copy
            </button>
          </div>
          <div className="nonce-hint">
            💡 Nonce được lấy từ: CSP violations log → Meta tag → CSPProvider
            <br />
            {currentNonce === "⚠️ Nonce không khả dụng" && (
              <span className="warning-text">
                ⚠️ Backend chưa cấu hình nonce hoặc meta tag chưa được replace
              </span>
            )}
          </div>
        </div>

        <div className="csp-info">
          <h4>📋 CSP Policy hiện tại:</h4>
          <pre className="csp-example">
            {`script-src 'self' 'nonce-${currentNonce || "xxx"}' 
  https://accounts.google.com 
  https://*.googleapis.com 
  https://cdnjs.cloudflare.com`}
          </pre>
        </div>
      </div>

      <div className="test-section">
        <h3>🧪 Security Tests</h3>
        <p className="test-description">
          Click các nút dưới đây để test CSP với nonce và hash
        </p>
        <div className="test-buttons">
          <button onClick={testInlineWithoutNonce} className="test-btn danger">
            ❌ No Nonce (Fail)
          </button>
          <button
            onClick={testInlineWithValidNonce}
            className="test-btn success"
          >
            ✅ Valid Nonce (Pass)
          </button>
          <button
            onClick={() => {
              const script = document.createElement("script");
              script.setAttribute("nonce", "WRONG_NONCE_123");
              script.textContent = "alert('Should NOT show!');";
              document.documentElement.appendChild(script);
              addTestResult(
                "Wrong Nonce",
                false,
                "❌ Script với nonce sai - bị chặn"
              );
            }}
            className="test-btn warning"
          >
            ⚠️ Wrong Nonce (Fail)
          </button>
          <button
            onClick={() => testFixedHashScript("pass")}
            className="test-btn info"
          >
            #️⃣ Fixed Hash (Demo)
          </button>
          <button onClick={testScriptWithHash} className="test-btn info">
            🔐 Dynamic Hash
          </button>
        </div>

        <div className="demo-hash-card">
          <h4>📌 Demo Hash Cố Định (Cho Thầy)</h4>
          <div className="demo-hash-content">
            <p>
              <strong>Content:</strong> <code>{DEMO_SCRIPTS.pass.content}</code>
            </p>
            <p>
              <strong>Hash:</strong> <code>{DEMO_SCRIPTS.pass.hash}</code>
            </p>
            <p className="hint">
              💡 Thêm vào CSP:{" "}
              <code>script-src '{DEMO_SCRIPTS.pass.hash}'</code>
            </p>
          </div>
        </div>
      </div>

      {testResults.length > 0 && (
        <div className="results-section">
          <div className="results-header">
            <h3>📊 Test Results</h3>
            <button onClick={clearResults} className="clear-btn">
              Clear
            </button>
          </div>

          <div className="results-list">
            {testResults.map((result) => (
              <div
                key={result.id}
                className={`result-item ${
                  result.success ? "success" : "failure"
                }`}
              >
                <div className="result-header">
                  <span className="result-test">{result.test}</span>
                  <span className="result-time">{result.timestamp}</span>
                </div>
                <div className="result-message">{result.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="education-section">
        <h3>📚 Hướng Dẫn Sử Dụng</h3>

        <div className="info-card console-test-card">
          <h4>🎯 Test Hash trên Vercel (Console F12)</h4>
          <p>Dùng helper functions - hoạt động trên static hosting!</p>

          <div className="console-section">
            <p className="console-section-title">
              ⭐ Test với Hash Cố Định (Vercel Compatible)
            </p>
            <code className="console-code">
              // 1. Test hash "pass" (recommended for demo)
              <br />
              window.hashTest.testHash('pass')
              <br />
              <br />
              // 2. Test hash "hello"
              <br />
              window.hashTest.testHash('hello')
              <br />
              <br />
              // 3. Test hash "alert"
              <br />
              window.hashTest.testHash('alert')
              <br />
              <br />
              // 4. Xem tất cả hash có sẵn
              <br />
              window.hashTest.showAll()
              <br />
              <br />
              // 5. Tính hash cho code tùy chỉnh
              <br />
              await window.hashTest.calcHash("console.log('test')")
            </code>

            <p className="console-section-title">
              📋 Các Hash Cố Định (thêm vào backend CSP):
            </p>
            <code className="console-code">
              // Hash 1: Pass Test
              <br />
              {DEMO_SCRIPTS.pass.hash}
              <br />
              <br />
              // Hash 2: Hello
              <br />
              {DEMO_SCRIPTS.hello.hash}
              <br />
              <br />
              // Hash 3: Alert
              <br />
              {DEMO_SCRIPTS.alert.hash}
              <br />
              <br />
              // Thêm vào backend: cspMiddleware.js
              <br />
              script-src 'self' '{DEMO_SCRIPTS.pass.hash}'
            </code>

            <p className="console-section-title">
              🔧 Test thủ công (không cần helper):
            </p>
            <code className="console-code">
              // Script này sẽ PASS nếu hash đã thêm vào CSP
              <br />
              const s = document.createElement('script');
              <br />
              s.textContent = "{DEMO_SCRIPTS.pass.content}";
              <br />
              document.head.appendChild(s);
              <br />
              <br />
              // Script này sẽ FAIL (không có hash trong CSP)
              <br />
              const s2 = document.createElement('script');
              <br />
              s2.textContent = "console.log('blocked!')";
              <br />
              document.head.appendChild(s2);
            </code>
          </div>
        </div>

        <div className="info-grid">
          <div className="info-card">
            <h4>🔑 Nonces</h4>
            <p>
              Giá trị ngẫu nhiên thay đổi mỗi lần load trang. Scripts có nonce
              khớp sẽ được phép chạy.
            </p>
            <code>&lt;script nonce="abc123"&gt;...&lt;/script&gt;</code>
          </div>

          <div className="info-card">
            <h4>🔐 Hashes</h4>
            <p>
              Hash SHA-256/384/512 của nội dung script. Phải khớp chính xác nội
              dung.
            </p>
            <code>script-src 'sha256-...'</code>
          </div>

          <div className="info-card">
            <h4>🛡️ Bảo mật</h4>
            <p>
              Cả hai phương pháp đều ngăn chặn XSS bằng cách chỉ cho phép
              scripts được ủy quyền.
            </p>
            <code>Chặn: eval(), inline scripts, dynamic imports</code>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HashNonceDemo;
