import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button, Alert, ListGroup, Badge, Spinner } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckCircle,
  faExclamationTriangle,
} from "@fortawesome/free-solid-svg-icons";
import { API_BASE_URL } from "../../utils/apiConfig";

export default function Successful() {
  const navigate = useNavigate();
  const location = useLocation();
  const [orderData, setOrderData] = useState(location.state?.order || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusWarning, setStatusWarning] = useState(""); // Cảnh báo trạng thái
  const token = localStorage.getItem("token");

  const fromVnpay = location.state?.fromVnpay || false;
  const orderId = location.state?.orderId || location.state?.order?.id;

  const apiFetch = async (url, options = {}) => {
    const headers = { "Content-Type": "application/json", ...options.headers };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE_URL}${url}`, { ...options, headers });

    if (res.status === 401) {
      localStorage.removeItem("token");
      navigate("/login");
      throw new Error("Token hết hạn!");
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || `Lỗi ${res.status}`);
    }
    return await res.json();
  };

  useEffect(() => {
    if (!orderId || !token) {
      setError("Không tìm thấy mã đơn hàng hoặc chưa đăng nhập!");
      setLoading(false);
      if (!token) navigate("/login");
      return;
    }

    const fetchOrder = async () => {
      try {
        setLoading(true);
        setError("");
        setStatusWarning("");
        // ✅ Gọi route có sẵn /api/orders/${orderId} (không phải /successful)
        const data = await apiFetch(`/api/orders/${orderId}`);
        if (data.success) {
          setOrderData(data.data || data); // Fallback nếu backend không wrap data
        } else {
          throw new Error(data.message || "Không tìm thấy đơn hàng!");
        }
      } catch (err) {
        console.error("FETCH ORDER ERR:", err);
        setError(err.message);
        // Nếu error từ verify status (backend trả message như "Trạng thái..."), set warning
        if (
          err.message.includes("Trạng thái") ||
          err.message.includes("thanh toán")
        ) {
          setStatusWarning(err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchOrder(); // Luôn fetch để verify full data + status
  }, [orderId, token, navigate]);

  if (loading) {
    return (
      <div className="text-center py-5" style={{ minHeight: "50vh" }}>
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Đang xác nhận đơn hàng...</p>
      </div>
    );
  }

  if (error && !statusWarning) {
    return (
      <div className="container py-5 text-center" style={{ minHeight: "50vh" }}>
        <Alert variant="danger">
          <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
          {error}
          <div className="mt-3">
            <Button
              variant="primary"
              onClick={() => navigate("/profile/orders")}
            >
              Xem đơn hàng
            </Button>
            <Button
              variant="outline-secondary"
              className="ms-2"
              onClick={() => navigate("/")}
            >
              Về trang chủ
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className="container py-5 text-center" style={{ minHeight: "50vh" }}>
        <Alert variant="warning">
          Không tìm thấy đơn hàng. Vui lòng kiểm tra lại!
        </Alert>
        <Button variant="primary" onClick={() => navigate("/profile/orders")}>
          Xem lịch sử đơn hàng
        </Button>
      </div>
    );
  }

  // ✅ SỬA: Dựa vào cấu trúc từ OrdersList (o.OrderId, o.TotalAmount, o.Status, o.PaymentStatus, o.DeliveryAddress, o.OrderDetails)
  const {
    OrderId: confirmedOrderId,
    OrderDate: orderDate,
    TotalAmount: totalAmount,
    Status: status,
    PaymentStatus: paymentStatus,
    DeliveryAddress: deliveryAddress,
    OrderDetails: items, // OrderDetails giống như items trong OrdersList
    User, // User info nếu có
  } = orderData;

  return (
    <div className="checkout-success-wrapper">
      <div className="checkout-success-popup">
        <FontAwesomeIcon
          icon={faCheckCircle}
          className="success-icon"
          style={{ fontSize: "60px", color: "#28a745" }}
        />
        <h2 className="text-success mb-3">Đặt hàng thành công!</h2>
        {statusWarning && (
          <Alert variant="warning" className="text-center mb-3">
            ⚠️ {statusWarning} <br />
            <small>Vui lòng kiểm tra lại sau hoặc liên hệ hỗ trợ.</small>
          </Alert>
        )}
        <div className="order-info mb-4">
          <p>
            <strong>Mã đơn hàng:</strong> #{confirmedOrderId || orderId}
          </p>
          <p>
            <strong>Ngày đặt:</strong>{" "}
            {new Date(orderDate || new Date()).toLocaleString("vi-VN")}
          </p>
          <p>
            <strong>Tổng tiền:</strong>{" "}
            {Number(totalAmount || 0).toLocaleString("vi-VN")} ₫{" "}
            {/* ✅ FIX NaN: Fallback 0 */}
          </p>
          <p>
            <strong>Trạng thái:</strong>
            <Badge
              bg={status === "Đặt hàng thành công" ? "success" : "secondary"}
              className="ms-2"
            >
              {status || "Chưa cập nhật"} {/* ✅ Fallback */}
            </Badge>
            <Badge
              bg={
                paymentStatus === "Đã thanh toán"
                  ? "success"
                  : paymentStatus === "Chờ thanh toán"
                  ? "info"
                  : "warning"
              }
              className="ms-2"
            >
              {paymentStatus || "Chưa thanh toán"} {/* ✅ Fallback */}
            </Badge>
          </p>
          <p>
            <strong>Địa chỉ giao:</strong> {deliveryAddress || "Chưa cập nhật"}{" "}
            {/* ✅ Hiển thị từ DeliveryAddress */}
          </p>
          {User && (
            <p>
              <strong>Khách hàng:</strong> {User.FullName || User.fullName} -{" "}
              {User.Phone || User.phone} {/* ✅ Fallback casing */}
            </p>
          )}
        </div>

        {/* List items nếu có */}
        {items && items.length > 0 && (
          <div className="items-summary mb-4">
            <h5>Danh sách sản phẩm:</h5>
            <ListGroup variant="flush">
              {items.slice(0, 3).map((item) => (
                <ListGroup.Item
                  key={item.OrderDetailId || item.FoodId}
                  className="d-flex justify-content-between align-items-center"
                >
                  <span>
                    {item.FoodName} {item.Quantity > 1 && `x${item.Quantity}`}
                  </span>
                  <span>
                    {Number(
                      (item.Price || 0) * (item.Quantity || 1)
                    ).toLocaleString("vi-VN")}{" "}
                    ₫{" "}
                    {/* ✅ FIX: Tính TotalPrice từ Price * Quantity như OrdersList */}
                  </span>
                </ListGroup.Item>
              ))}
              {items.length > 3 && (
                <ListGroup.Item>
                  Và {items.length - 3} sản phẩm khác...
                </ListGroup.Item>
              )}
            </ListGroup>
            <small className="text-muted">
              Chi tiết xem tại lịch sử đơn hàng.
            </small>
          </div>
        )}

        <div className="button-group">
          <Button className="btn-home" onClick={() => navigate("/")}>
            Quay lại Trang chủ
          </Button>
          <Button
            className="btn-continue"
            onClick={() => navigate("/products")}
          >
            Tiếp tục mua sắm
          </Button>
          <Button
            variant="outline-primary"
            onClick={() => navigate("/profile/orders")}
          >
            Xem đơn hàng
          </Button>
        </div>
      </div>

      {/* CSS nội tuyến để mô phỏng giao diện Razor */}
      <style>{`
        body {
          background-image: url('${API_BASE_URL}/images/nen4.png');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          font-family: 'Segoe UI', sans-serif;
        }
        .checkout-success-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          backdrop-filter: blur(4px);
        }
        .checkout-success-popup {
          background: rgba(255, 255, 255, 0.85);
          padding: 40px;
          border-radius: 15px;
          text-align: center;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
          max-width: 500px;
          width: 90%;
        }
        .success-icon {
          font-size: 60px;
          color: #28a745;
          margin-bottom: 20px;
          animation: bounce 0.6s;
          transform: scale(1);
          transition: transform 0.3s ease-in-out;
        }
        h2 {
          color: #28a745;
          font-size: 28px;
          margin-bottom: 15px;
        }
        p {
          color: #333;
          font-size: 16px;
          margin-bottom: 10px;
        }
        .order-info p { margin-bottom: 8px; }
        .items-summary { text-align: left; margin-top: 20px; }
        .button-group {
          display: flex;
          justify-content: center;
          gap: 15px;
          flex-wrap: wrap;
        }
        .btn-home, .btn-continue {
          padding: 12px 20px;
          border: none;
          border-radius: 5px;
          font-size: 15px;
          cursor: pointer;
          color: #fff;
          transition: background-color 0.3s ease;
        }
        .btn-home { background-color: #6c757d; }
        .btn-home:hover { background-color: #5a6268; }
        .btn-continue { background-color: #28a745; }
        .btn-continue:hover { background-color: #218838; }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}
