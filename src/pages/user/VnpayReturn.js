import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { Container, Row, Col, Card, Button, Spinner } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckCircle,
  faExclamationCircle,
} from "@fortawesome/free-solid-svg-icons";
import { buildApiUrl } from "../../utils/apiConfig";

export default function VnpayReturn() {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const queryParams = location.search;

    if (!queryParams) {
      setError("Không tìm thấy dữ liệu phản hồi từ VNPay.");
      setLoading(false);
      return;
    }

    const fetchVnpayResult = async () => {
      try {
        const response = await axios.get(
          buildApiUrl(`/api/orders/vnpay-return${queryParams}`)
        );

        const data = response.data;
        console.log("🔁 VNPay Return Response:", data);

        // ✅ Lưu lại toàn bộ phản hồi để hiển thị
        setResult(data);

        if (data.success) {
          // ✅ Điều hướng sang trang thành công (frontend sẽ dùng state hiển thị)
          navigate("/successful", {
            state: {
              order: data.data || null,
              orderId: data.orderId,
              amount: data.ThanhToanThanhCong,
              fromVnpay: true,
            },
          });
        } else {
          setError(data.message || "Thanh toán thất bại.");
        }
      } catch (err) {
        console.error("❌ Lỗi khi gọi API VNPay:", err.response?.data || err);
        setError(
          err.response?.data?.message ||
            "Lỗi kết nối đến máy chủ. Không thể xác nhận kết quả thanh toán."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchVnpayResult();
  }, [location.search]);

  if (loading) {
    return (
      <Container
        className="py-5 text-center"
        style={{ marginTop: "70px", minHeight: "50vh" }}
      >
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Đang xử lý kết quả thanh toán từ VNPay...</p>
      </Container>
    );
  }

  const isSuccess = result?.success === true;
  const displayText =
    result?.message || (isSuccess ? "Thanh toán thành công!" : error);
  const displayAmount = result?.ThanhToanThanhCong ?? null;
  const orderId = result?.orderId ?? null;

  return (
    <Container
      className="product_section_container"
      style={{ marginTop: "80px", marginBottom: "50px", minHeight: "60vh" }}
    >
      <Row className="justify-content-center">
        <Col md={8} className="text-center">
          <Card className="shadow-sm p-4" style={{ borderRadius: "15px" }}>
            <div className="mb-4">
              <FontAwesomeIcon
                icon={isSuccess ? faCheckCircle : faExclamationCircle}
                style={{
                  fontSize: "60px",
                  color: isSuccess ? "#28a745" : "#dc3545",
                }}
              />
            </div>

            <h2
              className={isSuccess ? "text-success mb-3" : "text-danger mb-3"}
            >
              {isSuccess ? "Thanh toán thành công!" : "Thanh toán thất bại!"}
            </h2>

            {displayAmount !== null && (
              <p className="lead">
                Số tiền thanh toán:{" "}
                <strong>
                  {Number(displayAmount).toLocaleString("vi-VN", {
                    style: "currency",
                    currency: "VND",
                  })}
                </strong>
              </p>
            )}

            {orderId && (
              <p className="text-muted">
                Mã đơn hàng của bạn: <strong>#{orderId}</strong>
              </p>
            )}

            {displayText && (
              <p className={isSuccess ? "text-dark" : "text-danger"}>
                {displayText}
              </p>
            )}

            <div className="mt-4 d-flex justify-content-center gap-2">
              <Button variant="primary" onClick={() => navigate("/")}>
                Quay lại trang chủ
              </Button>
              {orderId && (
                <Button
                  className="btn-continue"
                  onClick={() => navigate("/products")}
                >
                  Tiếp tục mua sắm
                </Button>
              )}
              {!isSuccess && (
                <Button
                  variant="warning"
                  onClick={() => navigate("/profile/orders")}
                >
                  Thử lại thanh toán
                </Button>
              )}
            </div>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
