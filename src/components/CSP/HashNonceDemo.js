import React, { useState, useEffect } from "react";
import { useCSP } from "./CSPProvider";

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

  // Test 3: Script with hash (calculate and test)
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
          <div style={{ fontSize: "12px", color: "#666", marginTop: "10px" }}>
            💡 Nonce được lấy từ: CSP violations log → Meta tag → CSPProvider
            <br />
            {currentNonce === "⚠️ Nonce không khả dụng" && (
              <span style={{ color: "#dc3545" }}>
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
        <p style={{ color: "#666", marginBottom: "15px" }}>
          Click các nút dưới đây để test CSP với nonce và hash
        </p>
        <div className="test-grid">
          <button onClick={testInlineWithoutNonce} className="test-btn danger">
            ❌ Test No Nonce
          </button>
          <button
            onClick={testInlineWithValidNonce}
            className="test-btn success"
          >
            ✅ Test Valid Nonce
          </button>
          <button
            onClick={() => {
              const script = document.createElement("script");
              script.setAttribute("nonce", "WRONG_NONCE_123");
              script.textContent = "alert('Should NOT show!');";
              document.documentElement.appendChild(script);
              addTestResult(
                "Inline Script (Wrong Nonce)",
                false,
                "❌ Script với nonce sai - phải bị chặn"
              );
            }}
            className="test-btn warning"
          >
            ⚠️ Test Wrong Nonce
          </button>
          <button onClick={testScriptWithHash} className="test-btn info">
            🔐 Test Script Hash
          </button>
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

        <div
          className="info-card"
          style={{
            marginBottom: "20px",
            background: "#fff3cd",
            borderColor: "#ffc107",
          }}
        >
          <h4>💻 Test Nonce từ Console</h4>
          <p>Copy và paste các lệnh sau vào Developer Console (F12):</p>

          <div style={{ marginTop: "15px" }}>
            <p style={{ fontWeight: "bold", marginBottom: "5px" }}>
              1. Lấy nonce từ CSP error message:
            </p>
            <code
              style={{
                display: "block",
                background: "#2d3748",
                color: "#e2e8f0",
                padding: "10px",
                borderRadius: "5px",
                marginBottom: "10px",
              }}
            >
              // Trigger CSP violation và lấy nonce
              <br />
              const s = document.createElement('script');
              <br />
              s.textContent = '// test';
              <br />
              document.head.appendChild(s);
              <br />
              // Xem console error → copy nonce từ message
              <br />
              // Ví dụ: 'nonce-7++0UYfwS8Urr/s581IIFA=='
            </code>

            <p style={{ fontWeight: "bold", marginBottom: "5px" }}>
              📋 Hoặc copy nonce từ ô "Current Nonce" ở trên ↑
            </p>

            <p style={{ fontWeight: "bold", marginBottom: "5px" }}>
              2. Sử dụng helper functions (dễ nhất):
            </p>
            <code
              style={{
                display: "block",
                background: "#2d3748",
                color: "#e2e8f0",
                padding: "10px",
                borderRadius: "5px",
                marginBottom: "10px",
              }}
            >
              // Lấy nonce
              <br />
              const nonce = window.getCSPNonce();
              <br />
              <br />
              // Test ngay với nonce hiện tại
              <br />
              window.testCSPNonce();
              <br />
              <br />
              // Hoặc test với nonce tùy chỉnh
              <br />
              window.testCSPNonce('7++0UYfwS8Urr/s581IIFA==');
            </code>

            <p style={{ fontWeight: "bold", marginBottom: "5px" }}>
              3. Test script thủ công:
            </p>
            <code
              style={{
                display: "block",
                background: "#2d3748",
                color: "#e2e8f0",
                padding: "10px",
                borderRadius: "5px",
                marginBottom: "10px",
              }}
            >
              const nonce = window.getCSPNonce();
              <br />
              const s = document.createElement('script');
              <br />
              s.setAttribute('nonce', nonce);
              <br />
              s.textContent = "alert('✅ Works!');";
              <br />
              document.documentElement.appendChild(s);
            </code>

            <p style={{ fontWeight: "bold", marginBottom: "5px" }}>
              4. Test script không có nonce (bị chặn):
            </p>
            <code
              style={{
                display: "block",
                background: "#2d3748",
                color: "#e2e8f0",
                padding: "10px",
                borderRadius: "5px",
              }}
            >
              const s = document.createElement('script');
              <br />
              s.textContent = "alert('Should NOT show!');";
              <br />
              document.documentElement.appendChild(s);
              <br />
              // → CSP sẽ chặn và hiện nonce trong error message
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

      <style jsx>{`
        .hash-nonce-demo {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .nonce-section {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 10px;
          margin: 20px 0;
        }

        .nonce-info {
          margin-bottom: 20px;
        }

        .nonce-display {
          display: flex;
          align-items: center;
          gap: 15px;
          margin: 10px 0;
        }

        .nonce-display code {
          background: #e9ecef;
          padding: 10px 15px;
          border-radius: 5px;
          font-family: monospace;
          font-size: 14px;
          flex: 1;
          word-break: break-all;
        }

        .refresh-btn {
          background: #007bff;
          color: white;
          border: none;
          padding: 10px 15px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 14px;
        }

        .csp-example {
          background: #2d3748;
          color: #e2e8f0;
          padding: 15px;
          border-radius: 5px;
          font-size: 12px;
          overflow-x: auto;
        }

        .test-section {
          margin: 30px 0;
        }

        .test-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin: 20px 0;
        }

        .test-btn {
          padding: 15px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: bold;
          font-size: 14px;
          transition: all 0.3s ease;
          text-align: center;
        }

        .test-btn.danger {
          background: #dc3545;
          color: white;
        }

        .test-btn.warning {
          background: #ffc107;
          color: #212529;
        }

        .test-btn.info {
          background: #17a2b8;
          color: white;
        }

        .test-btn.success {
          background: #28a745;
          color: white;
        }

        .test-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .results-section {
          margin: 30px 0;
          background: white;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .results-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          background: #f8f9fa;
          border-bottom: 1px solid #dee2e6;
        }

        .clear-btn {
          background: #6c757d;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 5px;
          cursor: pointer;
        }

        .results-list {
          max-height: 400px;
          overflow-y: auto;
        }

        .result-item {
          padding: 15px 20px;
          border-bottom: 1px solid #f1f3f5;
        }

        .result-item.success {
          border-left: 4px solid #28a745;
          background: #f8fff9;
        }

        .result-item.failure {
          border-left: 4px solid #dc3545;
          background: #fff8f8;
        }

        .result-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 5px;
        }

        .result-test {
          font-weight: bold;
          color: #333;
        }

        .result-time {
          font-size: 12px;
          color: #666;
        }

        .result-message {
          font-family: monospace;
          font-size: 13px;
          color: #555;
        }

        .education-section {
          margin: 40px 0;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
          margin: 20px 0;
        }

        .info-card {
          background: white;
          padding: 20px;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          border-top: 4px solid #007bff;
        }

        .info-card h4 {
          color: #333;
          margin: 0 0 10px 0;
        }

        .info-card p {
          color: #666;
          margin: 10px 0;
          line-height: 1.5;
        }

        .info-card code {
          display: block;
          background: #f8f9fa;
          padding: 8px;
          border-radius: 3px;
          font-size: 12px;
          margin-top: 10px;
        }
      `}</style>
    </div>
  );
};

export default HashNonceDemo;
