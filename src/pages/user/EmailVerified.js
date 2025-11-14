import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Container, Card, Button } from "react-bootstrap";
import "../../styles/pages/EmailVerified.css";

function EmailVerified() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [countdown, setCountdown] = useState(5);

  const success = searchParams.get("success") === "1";
  const error = searchParams.get("error");

  useEffect(() => {
    if (success) {
      // Đếm ngược 5 giây rồi redirect tới login
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            navigate("/login");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [success, navigate]);

  const handleGoToLogin = () => {
    navigate("/login");
  };

  return (
    <Container className="email-verified-container">
      <Card className="email-verified-card">
        <Card.Body className="text-center">
          {success ? (
            <>
              <div className="success-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="80"
                  height="80"
                  fill="currentColor"
                  className="bi bi-check-circle-fill"
                  viewBox="0 0 16 16"
                >
                  <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z" />
                </svg>
              </div>
              <h2 className="mt-3">Xác nhận email thành công!</h2>
              <p className="text-muted mt-3">
                Tài khoản của bạn đã được kích hoạt thành công.
              </p>
              <p className="text-muted">
                Bạn sẽ được chuyển đến trang đăng nhập sau{" "}
                <strong>{countdown}</strong> giây...
              </p>
              <Button
                variant="primary"
                className="mt-3"
                onClick={handleGoToLogin}
              >
                Đăng nhập ngay
              </Button>
            </>
          ) : error === "invalid_token" ? (
            <>
              <div className="error-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="80"
                  height="80"
                  fill="currentColor"
                  className="bi bi-exclamation-triangle-fill"
                  viewBox="0 0 16 16"
                >
                  <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
                </svg>
              </div>
              <h2 className="mt-3">Link xác nhận không hợp lệ</h2>
              <p className="text-muted mt-3">
                Link xác nhận email đã hết hạn hoặc không hợp lệ.
              </p>
              <p className="text-muted">
                Vui lòng đăng ký lại để nhận link xác nhận mới.
              </p>
              <Button
                variant="primary"
                className="mt-3"
                onClick={() => navigate("/register")}
              >
                Đăng ký lại
              </Button>
            </>
          ) : error === "expired" ? (
            <>
              <div className="error-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="80"
                  height="80"
                  fill="currentColor"
                  className="bi bi-clock-history"
                  viewBox="0 0 16 16"
                >
                  <path d="M8.515 1.019A7 7 0 0 0 8 1V0a8 8 0 0 1 .589.022l-.074.997zm2.004.45a7.003 7.003 0 0 0-.985-.299l.219-.976c.383.086.76.2 1.126.342l-.36.933zm1.37.71a7.01 7.01 0 0 0-.439-.27l.493-.87a8.025 8.025 0 0 1 .979.654l-.615.789a6.996 6.996 0 0 0-.418-.302zm1.834 1.79a6.99 6.99 0 0 0-.653-.796l.724-.69c.27.285.52.59.747.91l-.818.576zm.744 1.352a7.08 7.08 0 0 0-.214-.468l.893-.45a7.976 7.976 0 0 1 .45 1.088l-.95.313a7.023 7.023 0 0 0-.179-.483zm.53 2.507a6.991 6.991 0 0 0-.1-1.025l.985-.17c.067.386.106.778.116 1.17l-1 .025zm-.131 1.538c.033-.17.06-.339.081-.51l.993.123a7.957 7.957 0 0 1-.23 1.155l-.964-.267c.046-.165.086-.332.12-.501zm-.952 2.379c.184-.29.346-.594.486-.908l.914.405c-.16.36-.345.706-.555 1.038l-.845-.535zm-.964 1.205c.122-.122.239-.248.35-.378l.758.653a8.073 8.073 0 0 1-.401.432l-.707-.707z" />
                  <path d="M8 1a7 7 0 1 0 4.95 11.95l.707.707A8.001 8.001 0 1 1 8 0v1z" />
                  <path d="M7.5 3a.5.5 0 0 1 .5.5v5.21l3.248 1.856a.5.5 0 0 1-.496.868l-3.5-2A.5.5 0 0 1 7 9V3.5a.5.5 0 0 1 .5-.5z" />
                </svg>
              </div>
              <h2 className="mt-3">Link xác nhận đã hết hạn</h2>
              <p className="text-muted mt-3">
                Link xác nhận email đã hết hạn (có hiệu lực trong 24 giờ).
              </p>
              <p className="text-muted">
                Vui lòng đăng ký lại để nhận link xác nhận mới.
              </p>
              <Button
                variant="primary"
                className="mt-3"
                onClick={() => navigate("/register")}
              >
                Đăng ký lại
              </Button>
            </>
          ) : (
            <>
              <div className="error-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="80"
                  height="80"
                  fill="currentColor"
                  className="bi bi-x-circle-fill"
                  viewBox="0 0 16 16"
                >
                  <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z" />
                </svg>
              </div>
              <h2 className="mt-3">Có lỗi xảy ra</h2>
              <p className="text-muted mt-3">
                Không thể xác nhận email. Vui lòng thử lại sau.
              </p>
              <Button
                variant="primary"
                className="mt-3"
                onClick={() => navigate("/register")}
              >
                Quay lại đăng ký
              </Button>
            </>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
}

export default EmailVerified;
