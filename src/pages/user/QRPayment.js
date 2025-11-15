import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Container, Card, Form, Button, Alert, Spinner } from "react-bootstrap";
import { API_BASE_URL } from "../../utils/apiConfig";

export default function QRPayment() {
  const location = useLocation();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const { orderId, totalPrice, qrCodeUrl } = location.state || {};

  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orderId || !totalPrice) {
      navigate("/checkout");
    }
  }, [orderId, totalPrice, navigate]);

  const handleConfirmPayment = async () => {
    if (!confirmed) {
      setError("Vui lòng xác nhận đã thanh toán qua QR Code!");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");

      const response = await fetch(
        `${API_BASE_URL}/api/orders/confirm-qr-payment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ orderId }),
        }
      );

      const data = await response.json();

      if (data.success) {
        navigate("/successful", {
          state: {
            orderId,
            totalPrice,
            createdAt: new Date().toISOString(),
          },
        });
      } else {
        throw new Error(data.message || "Xác nhận thanh toán thất bại!");
      }
    } catch (err) {
      console.error("Confirm QR payment error:", err);
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!orderId) {
    return (
      <Container className="py-5">
        <Alert variant="warning">Không tìm thấy thông tin đơn hàng!</Alert>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <Card className="shadow-sm mx-auto" style={{ maxWidth: "600px" }}>
        <Card.Body className="p-4">
          <h3 className="text-center mb-4 text-success">
            Thanh toán qua QR Code
          </h3>

          {error && <Alert variant="danger">{error}</Alert>}

          <div className="text-center mb-4">
            <p className="mb-3">
              <strong>Mã đơn hàng:</strong> #{orderId}
            </p>
            <p className="mb-3">
              <strong>Tổng tiền:</strong>{" "}
              <span className="text-danger fs-5 fw-bold">
                {totalPrice?.toLocaleString()}₫
              </span>
            </p>
          </div>

          <div className="qr-payment-section text-center mb-4">
            <h6 className="mb-3">Quét mã QR để thanh toán</h6>
            <img
              src={
                qrCodeUrl ||
                `https://img.vietqr.io/image/mbbank-0366413924-compact2.jpg?amount=${Math.round(
                  totalPrice * 1000
                )}&addInfo=DonHang${orderId}&accountName=SULI COFFEE`
              }
              alt="QR Payment"
              style={{
                maxWidth: "350px",
                width: "100%",
                border: "3px solid #28a745",
                borderRadius: "10px",
                padding: "15px",
                background: "white",
              }}
            />

            <div className="mt-3 text-muted small">
              <p className="mb-1">
                <strong>Ngân hàng:</strong> MB Bank
              </p>
              <p className="mb-1">
                <strong>Số tài khoản:</strong> 0366413924
              </p>
              <p className="mb-1">
                <strong>Chủ tài khoản:</strong> SULI COFFEE
              </p>
              <p className="mb-0">
                <strong>Nội dung:</strong> DonHang{orderId}
              </p>
            </div>
          </div>

          <Alert variant="info" className="mb-3">
            <small>
              ⚠️ <strong>Lưu ý:</strong> Vui lòng chuyển khoản đúng số tiền và
              nội dung như trên. Sau khi chuyển khoản thành công, vui lòng tick
              vào ô bên dưới và nhấn "Xác nhận đã thanh toán".
            </small>
          </Alert>

          <Form.Group className="mb-4">
            <Form.Check
              type="checkbox"
              id="qr-confirm"
              checked={confirmed}
              onChange={(e) => {
                setConfirmed(e.target.checked);
                if (e.target.checked) setError("");
              }}
              label={
                <span>
                  <strong>Tôi đã thanh toán qua QR Code</strong>
                </span>
              }
            />
            <small className="text-muted d-block mt-2">
              Đơn hàng của bạn sẽ chờ admin xác nhận thanh toán
            </small>
          </Form.Group>

          <div className="d-grid gap-2">
            <Button
              variant="success"
              size="lg"
              onClick={handleConfirmPayment}
              disabled={isSubmitting || !confirmed}
            >
              {isSubmitting ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    className="me-2"
                  />
                  Đang xử lý...
                </>
              ) : (
                "Xác nhận đã thanh toán"
              )}
            </Button>
            <Button
              variant="outline-secondary"
              onClick={() => navigate("/menu")}
              disabled={isSubmitting}
            >
              Quay lại trang chủ
            </Button>
          </div>
        </Card.Body>
      </Card>

      <style>{`
        .qr-payment-section {
          background: #f8f9fa;
          border-radius: 10px;
          padding: 20px;
        }
      `}</style>
    </Container>
  );
}
