// frontend/src/pages/CSPDemo.js
import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Alert,
  Badge,
  Spinner,
} from "react-bootstrap";
import {
  FaBug,
  FaShieldAlt,
  FaChartBar,
  FaCertificate,
  FaExternalLinkAlt,
} from "react-icons/fa";

const CSPDemo = () => {
  const [testResults, setTestResults] = useState({});
  const [isLoading, setIsLoading] = useState({});
  const [cspStatus, setCspStatus] = useState({});

  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  // Kiểm tra CSP headers khi component mount
  useEffect(() => {
    const checkCSPHeaders = async () => {
      try {
        // Kiểm tra CSP headers từ HTTP response
        const response = await fetch(window.location.href, {
          method: "HEAD",
          cache: "no-store",
        });

        const csp = response.headers.get("content-security-policy");
        const currentURL = window.location.href;
        const isBackendMode = window.location.port === "5000";

        setCspStatus({
          hasCSP: !!csp,
          cspHeader: csp,
          currentURL: currentURL,
          isProduction: isBackendMode,
          serverMode: isBackendMode
            ? "Backend (CSP Enabled)"
            : "Frontend Dev (No CSP)",
        });

        console.log("🔍 CSP Status Check:", {
          hasCSP: !!csp,
          cspHeader: csp ? csp.substring(0, 100) + "..." : null,
          currentURL: currentURL,
          serverMode: isBackendMode ? "Backend" : "Frontend Dev",
          port: window.location.port,
        });

        // Log warning nếu đang ở dev mode
        if (!isBackendMode) {
          console.warn(
            "⚠️ Warning: Truy cập từ React dev server (port 3000) - không có CSP headers!"
          );
          console.log(
            "👉 Để test CSP thật sự, truy cập: http://localhost:5000/csp-demo"
          );
        }
      } catch (error) {
        console.error("❌ Error checking CSP:", error);

        // Fallback detection
        const isBackendMode = window.location.port === "5000";
        setCspStatus({
          hasCSP: false,
          cspHeader: null,
          currentURL: window.location.href,
          isProduction: isBackendMode,
          serverMode: isBackendMode
            ? "Backend (Error)"
            : "Frontend Dev (No CSP)",
          error: error.message,
        });
      }
    };

    checkCSPHeaders();
  }, []);

  const testCases = [
    {
      id: "blocked",
      title: "Script bị chặn hoàn toàn",
      description:
        "Test CSP với script-src none - tất cả JavaScript sẽ bị chặn",
      endpoint: "/blocked",
      icon: <FaBug className="text-danger" />,
      variant: "danger",
    },
    {
      id: "nonce",
      title: "Script với Nonce",
      description: "Chỉ script có nonce đúng mới được phép chạy",
      endpoint: "/nonce",
      icon: <FaShieldAlt className="text-success" />,
      variant: "success",
    },
    {
      id: "hash",
      title: "Script với Hash",
      description: "Chỉ script có hash SHA được phép chạy",
      endpoint: "/hash",
      icon: <FaCertificate className="text-info" />,
      variant: "info",
    },
    {
      id: "test-suite",
      title: "Test Suite đầy đủ",
      description: "Kiểm tra toàn bộ các tình huống CSP",
      endpoint: "/csp-test",
      icon: <FaChartBar className="text-warning" />,
      variant: "warning",
    },
  ];

  const monitoringPages = [
    {
      id: "report-realtime",
      title: "Báo cáo vi phạm Real-time",
      description: "Theo dõi vi phạm CSP theo thời gian thực",
      endpoint: "/report-log-realtime",
      icon: <FaChartBar className="text-warning" />,
    },
    {
      id: "analyze-realtime",
      title: "Phân tích Real-time",
      description: "Dashboard phân tích vi phạm trực tiếp",
      endpoint: "/analyze-realtime",
      icon: <FaChartBar className="text-info" />,
    },
    {
      id: "report-static",
      title: "Báo cáo tĩnh",
      description: "Xem lại lịch sử vi phạm CSP",
      endpoint: "/report-log",
      icon: <FaChartBar className="text-danger" />,
    },
  ];

  const runTest = async (testCase) => {
    const { id, endpoint } = testCase;
    setIsLoading((prev) => ({ ...prev, [id]: true }));

    console.log(`🧪 Running CSP test: ${testCase.title}`);
    console.log(`🔗 Opening: ${API_BASE_URL}${endpoint}`);

    try {
      // Mở trang demo trong tab mới
      const demoWindow = window.open(
        `${API_BASE_URL}${endpoint}`,
        "_blank",
        "width=800,height=600,scrollbars=yes,resizable=yes"
      );

      if (demoWindow) {
        setTestResults((prev) => ({
          ...prev,
          [id]: {
            status: "success",
            message: `Demo ${testCase.title} đã mở trong tab mới`,
            timestamp: new Date().toLocaleString("vi-VN"),
            url: `${API_BASE_URL}${endpoint}`,
          },
        }));

        console.log(`✅ Test window opened: ${API_BASE_URL}${endpoint}`);
      } else {
        throw new Error("Không thể mở cửa sổ popup - vui lòng cho phép popup");
      }
    } catch (error) {
      console.error(`❌ Test failed for ${testCase.title}:`, error);
      setTestResults((prev) => ({
        ...prev,
        [id]: {
          status: "error",
          message: `Lỗi: ${error.message}`,
          timestamp: new Date().toLocaleString("vi-VN"),
        },
      }));
    } finally {
      setIsLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const openMonitoring = (page) => {
    const monitoringWindow = window.open(
      `${API_BASE_URL}${page.endpoint}`,
      "_blank",
      "width=1200,height=800,scrollbars=yes,resizable=yes"
    );

    if (!monitoringWindow) {
      alert("Không thể mở cửa sổ monitoring - vui lòng cho phép popup");
    }
  };

  return (
    <div
      style={{
        padding: "80px 0 24px 0",
        background: "#f8f9fa",
        minHeight: "100vh",
      }}
    >
      <Container>
        {/* Header */}
        <Card className="mb-4 shadow-sm">
          <Card.Body className="text-center py-4">
            <h2 className="mb-3">
              <FaShieldAlt className="me-2 text-primary" />
              Demo Content Security Policy (CSP)
            </h2>
            <p className="text-muted mb-0">
              Hệ thống demo giúp hiểu và kiểm tra các chính sách bảo mật CSP.
              Mỗi test case sẽ mở trong tab mới để bạn có thể quan sát hành vi
              CSP.
            </p>
          </Card.Body>
        </Card>

        {/* CSP Status */}
        {cspStatus.currentURL && (
          <Card className="mb-4 shadow-sm">
            <Card.Header className="bg-light">
              <h5 className="mb-0">🔍 Trạng thái CSP hiện tại</h5>
            </Card.Header>
            <Card.Body>
              <Alert variant={cspStatus.hasCSP ? "success" : "warning"}>
                <Row>
                  <Col md={6}>
                    <strong>URL hiện tại:</strong> {cspStatus.currentURL}
                    <br />
                    <strong>CSP Headers:</strong>{" "}
                    {cspStatus.hasCSP ? "✅ Có" : "❌ Không có"}
                    <br />
                    <strong>Server Mode:</strong>{" "}
                    {cspStatus.serverMode ||
                      (cspStatus.isProduction ? "Production" : "Development")}
                    <br />
                    <strong>Port:</strong> {window.location.port || "80"}
                    {cspStatus.error && (
                      <>
                        <br />
                        <strong className="text-danger">Error:</strong>{" "}
                        {cspStatus.error}
                      </>
                    )}
                  </Col>
                  <Col md={6}>
                    {cspStatus.cspHeader ? (
                      <small style={{ wordBreak: "break-all" }}>
                        <strong>CSP Policy:</strong>
                        <br />
                        <code
                          style={{
                            fontSize: "11px",
                            background: "#f8f9fa",
                            padding: "4px",
                          }}
                        >
                          {cspStatus.cspHeader.substring(0, 150)}...
                        </code>
                      </small>
                    ) : (
                      <div>
                        <small className="text-muted">
                          💡 Truy cập qua backend (port 5000) để có CSP headers
                        </small>
                        {window.location.port === "3000" && (
                          <div className="mt-2">
                            <Button
                              variant="info"
                              size="sm"
                              onClick={() =>
                                window.open(
                                  "http://localhost:5000/csp-demo",
                                  "_blank"
                                )
                              }
                            >
                              🔗 Mở Backend Version
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </Col>
                </Row>
              </Alert>
            </Card.Body>
          </Card>
        )}

        {/* Current Page Inline Test */}
        <Card className="mb-4 shadow-sm">
          <Card.Header className="bg-light">
            <h5 className="mb-0">🧪 Test Inline Script trên trang hiện tại</h5>
          </Card.Header>
          <Card.Body>
            <Row>
              <Col md={8}>
                <p>Test xem CSP có chặn inline script trên trang này không:</p>
                <div className="d-flex gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      console.log("🧪 Testing inline script injection...");
                      try {
                        const script = document.createElement("script");
                        script.textContent =
                          "console.log('❌ INLINE BLOCKED TEST'); alert('Inline script executed!');";
                        document.head.appendChild(script);
                        console.log(
                          "✅ Inline script executed (CSP not blocking)"
                        );
                      } catch (error) {
                        console.log("❌ Inline script blocked by CSP:", error);
                      }
                    }}
                  >
                    Test Inline Script
                  </Button>

                  <Button
                    variant="warning"
                    size="sm"
                    onClick={() => {
                      console.log("🧪 Testing eval() function...");
                      try {
                        eval(
                          "console.log('❌ EVAL BLOCKED TEST'); alert('Eval executed!');"
                        );
                        console.log("✅ Eval executed (CSP not blocking)");
                      } catch (error) {
                        console.log("❌ Eval blocked by CSP:", error);
                      }
                    }}
                  >
                    Test Eval()
                  </Button>
                </div>
              </Col>
              <Col md={4}>
                <Alert variant="info" className="mb-0">
                  <small>
                    <strong>Kỳ vợng:</strong>
                    <br />
                    • Port 3000: Script sẽ chạy
                    <br />• Port 5000: Script bị chặn
                  </small>
                </Alert>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Test Cases */}
        <Card className="mb-4 shadow-sm">
          <Card.Header className="bg-light">
            <h4 className="mb-0">🧪 Các Test Case CSP</h4>
          </Card.Header>
          <Card.Body>
            <Row>
              {testCases.map((testCase) => (
                <Col xs={12} md={6} key={testCase.id} className="mb-4">
                  <Card className="h-100 border-0 shadow-sm">
                    <Card.Body className="d-flex flex-column">
                      <div className="d-flex align-items-center mb-3">
                        <div className="me-3 fs-4">{testCase.icon}</div>
                        <div>
                          <Card.Title className="mb-1">
                            {testCase.title}
                          </Card.Title>
                          <Badge bg={testCase.variant} className="mb-2">
                            {testCase.variant.toUpperCase()}
                          </Badge>
                        </div>
                      </div>

                      <Card.Text className="flex-grow-1">
                        {testCase.description}
                      </Card.Text>

                      {testResults[testCase.id] && (
                        <Alert
                          variant={
                            testResults[testCase.id].status === "error"
                              ? "danger"
                              : "success"
                          }
                          className="mb-3"
                        >
                          <small>
                            <strong>{testResults[testCase.id].message}</strong>
                            <br />
                            <em>
                              Thời gian: {testResults[testCase.id].timestamp}
                            </em>
                          </small>
                        </Alert>
                      )}

                      <Button
                        variant={testCase.variant}
                        disabled={isLoading[testCase.id]}
                        onClick={() => runTest(testCase)}
                        className="w-100"
                      >
                        {isLoading[testCase.id] ? (
                          <>
                            <Spinner
                              animation="border"
                              size="sm"
                              className="me-2"
                            />
                            Đang mở...
                          </>
                        ) : (
                          <>
                            Chạy Test <FaExternalLinkAlt className="ms-1" />
                          </>
                        )}
                      </Button>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card.Body>
        </Card>

        {/* Monitoring Tools */}
        <Card className="mb-4 shadow-sm">
          <Card.Header className="bg-light">
            <h4 className="mb-0">📊 Công cụ Theo dõi & Phân tích</h4>
          </Card.Header>
          <Card.Body>
            <Row>
              {monitoringPages.map((page) => (
                <Col xs={12} md={4} key={page.id} className="mb-3">
                  <Card
                    className="h-100 border-0 shadow-sm text-center"
                    style={{ cursor: "pointer", transition: "transform 0.2s" }}
                    onClick={() => openMonitoring(page)}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.transform = "translateY(-2px)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.transform = "translateY(0)")
                    }
                  >
                    <Card.Body className="d-flex flex-column justify-content-center">
                      <div className="fs-2 mb-3">{page.icon}</div>
                      <Card.Title className="h6">{page.title}</Card.Title>
                      <Card.Text className="small text-muted">
                        {page.description}
                      </Card.Text>
                      <FaExternalLinkAlt className="text-muted" />
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card.Body>
        </Card>

        {/* Instructions */}
        <Card className="shadow-sm">
          <Card.Header className="bg-light">
            <h4 className="mb-0">📋 Hướng dẫn sử dụng</h4>
          </Card.Header>
          <Card.Body>
            <Row>
              <Col md={6}>
                <h6 className="text-primary">🎯 Cách sử dụng Demo:</h6>
                <ol>
                  <li>Chọn một test case bạn muốn kiểm tra</li>
                  <li>Click "Chạy Test" để mở demo trong tab mới</li>
                  <li>Quan sát hành vi của trình duyệt và Developer Console</li>
                  <li>Mở công cụ theo dõi để xem vi phạm CSP realtime</li>
                </ol>
              </Col>

              <Col md={6}>
                <h6 className="text-primary">🔍 Điều gì sẽ xảy ra:</h6>
                <ul>
                  <li>
                    <strong>Script bị chặn:</strong> Tất cả JavaScript sẽ không
                    chạy và tạo vi phạm CSP
                  </li>
                  <li>
                    <strong>Script với Nonce:</strong> Chỉ script có nonce đúng
                    mới chạy được
                  </li>
                  <li>
                    <strong>Script với Hash:</strong> Chỉ script có hash SHA
                    đúng mới chạy được
                  </li>
                  <li>
                    <strong>Test Suite:</strong> Kết hợp nhiều test case để kiểm
                    tra toàn diện
                  </li>
                </ul>
              </Col>
            </Row>

            <Alert variant="info" className="mt-3">
              <strong>💡 Lưu ý quan trọng:</strong> Mở Developer Console (F12)
              để xem chi tiết các vi phạm CSP và message logs từ các script
              test.
            </Alert>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
};

export default CSPDemo;
