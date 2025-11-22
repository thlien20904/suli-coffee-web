// frontend/src/pages/user/profile/OrderDetail.js
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { buildApiUrl } from "../../../utils/apiConfig";
import "../../../styles/pages/orderdetail.css";

export default function OrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load chi tiết đơn hàng
  useEffect(() => {
    const fetchOrderDetail = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const res = await axios.get(
          buildApiUrl(`/api/profile/orders/${orderId}`),
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (res.data.success) {
          let data = res.data.data;
          // ⭐ Đảm bảo OrderDetails luôn là mảng
          data.OrderDetails = Array.isArray(data.OrderDetails)
            ? data.OrderDetails
            : [];
          // ⭐ Fix: Convert tất cả Toppings -> mảng
          data.OrderDetails = data.OrderDetails.map((d) => ({
            ...d,
            Toppings: Array.isArray(d.Toppings) ? d.Toppings : [],
          }));
          setOrder(data);
        } else {
          setError(res.data.message || "Không tìm thấy đơn hàng");
        }
      } catch (err) {
        console.error("Fetch Order Detail Error:", err);
        setError("Lỗi khi tải chi tiết đơn hàng");
      } finally {
        setLoading(false);
      }
    };
    if (orderId) fetchOrderDetail();
  }, [orderId]);

  const handleBack = () => navigate("/profile/orders");

  if (loading)
    return (
      <div className="text-center py-5">Đang tải chi tiết đơn hàng...</div>
    );
  if (error || !order)
    return (
      <div className="alert alert-danger text-center py-5">
        {error || "Không tìm thấy đơn hàng"}
        <button className="btn btn-primary mt-2" onClick={handleBack}>
          Quay lại
        </button>
      </div>
    );

  /** -------------------------------------------------------
   * SAFE GETTERS — NGĂN LỖI OBJECT + NULL + UNDEFINED
   ------------------------------------------------------- */
  const paymentMethodName = order.PaymentMethod || "Không có";
  const paymentStatusName = order.PaymentStatus || "Không rõ";
  const orderStatusName = order.Status || "Không rõ";

  /** Badge màu theo trạng thái đơn */
  const orderStatusBadge =
    order.StatusId === 4
      ? "success"
      : order.StatusId === 5
      ? "danger"
      : "warning";
  const paymentStatusBadge = order.isPaid ? "success" : "warning"; // Dùng isPaid từ backend

  // Xác định steps hoàn thành dựa trên StatusId (khớp tabs: 1=Đặt hàng, 2=Chuẩn bị, 3=Giao, 4=Đã giao, 5=Hủy)
  const getStepStatus = (stepId) => {
    if (order.StatusId === 5) return "failed"; // Hủy toàn bộ
    return order.StatusId >= stepId ? "completed" : "pending";
  };

  // Tính progress % cho thanh ngang (4 steps, mỗi step 25%)
  const progress = order.StatusId === 5 ? 0 : (order.StatusId / 4) * 100;

  // Tính tổng subtotal từ OrderDetails để verify
  const subtotal = order.OrderDetails.reduce(
    (sum, detail) =>
      sum + parseFloat(detail.Price || 0) * (detail.Quantity || 1),
    0
  );

  return (
    <div className="order-detail-wrapper">
      <div className="order-detail-header">
        <h4 className="fw-bold">Chi tiết đơn hàng #{order.OrderId}</h4>
        <button className="btn btn-secondary" onClick={handleBack}>
          Quay lại danh sách
        </button>
      </div>

      {/* Thông tin cơ bản */}
      <div className="order-info-box">
        <div className="row mb-3">
          <div className="col-md-6">
            <strong>Ngày đặt hàng:</strong>{" "}
            {new Date(order.OrderDate).toLocaleString("vi-VN")}
          </div>
          <div className="col-md-6">
            <strong>Phương thức thanh toán:</strong> {paymentMethodName}
          </div>
          <div className="col-md-6">
            <strong>Trạng thái đơn hàng:</strong>{" "}
            <span className="order-detail-badge order-status">
              {orderStatusName}
            </span>
          </div>
          <div className="col-md-6">
            <strong>Trạng thái thanh toán:</strong>{" "}
            <span className="order-detail-badge payment-status">
              {paymentStatusName} {order.isPaid && "(Đã thanh toán)"}
            </span>
          </div>

          {order.VoucherCode && (
            <div className="col-md-6">
              <strong>Mã giảm giá:</strong> {order.VoucherCode}
            </div>
          )}
        </div>
      </div>

      {/* Địa chỉ giao hàng - SỬ DỤNG USER.FULLNAME VÀ PHONE TỪ BACKEND (GIẢ SỬ ĐÃ FIX) */}
      {order.Address && (
        <div className="order-address-box mb-4">
          <h6>
            <strong>Địa chỉ giao hàng:</strong>
          </h6>
          <p>
            {order.Address}, {order.Ward}, {order.District}, {order.Province}
          </p>
          <p>
            <strong>Người nhận:</strong> {order.ReceiverName || "N/A"} |{" "}
            <strong>SĐT:</strong> {order.Phone || "N/A"}
          </p>
        </div>
      )}

      {/* Timeline - SỬA: THÊM PROGRESS BAR ĐỂ BÔI ĐẬM THEO BƯỚC HIỆN TẠI */}
      <div className="mb-4">
        <h6>
          <strong>Tiến trình đơn hàng:</strong>
        </h6>
        <div className="progress-timeline">
          {/* Progress bar nền xám */}
          <div className="progress-bar-bg"></div>
          {/* Progress bar đậm cam theo % */}
          <div
            className="progress-bar-fill"
            style={{ width: `${progress}%` }}
          ></div>
          {/* Steps */}
          {/* Step 1: Đặt hàng thành công (StatusId >=1) */}
          <div className={`step ${getStepStatus(1)}`}>
            <div className="step-icon">📄</div> {/* Icon từ ảnh: file order */}
            <div className="step-label">Đặt hàng thành công</div>
          </div>
          {/* Step 2: Đang chuẩn bị (StatusId >=2) */}
          <div className={`step ${getStepStatus(2)}`}>
            <div className="step-icon">👨‍🍳</div> {/* Icon từ ảnh: chef */}
            <div className="step-label">Đang chuẩn bị đơn hàng</div>
          </div>
          {/* Step 3: Đang giao hàng (StatusId >=3) */}
          <div className={`step ${getStepStatus(3)}`}>
            <div className="step-icon">🚚</div> {/* Icon từ ảnh: truck */}
            <div className="step-label">Đang giao hàng</div>
          </div>
          {/* Step 4: Giao thành công (StatusId >=4) */}
          <div className={`step ${getStepStatus(4)}`}>
            <div className="step-icon">✅</div> {/* Icon từ ảnh: check */}
            <div className="step-label">Giao thành công</div>
          </div>
          {/* Nếu hủy (StatusId==5), thêm step riêng và progress=0 */}
          {order.StatusId === 5 && (
            <div className="step failed">
              <div className="step-icon">❌</div>
              <div className="step-label">Đã hủy</div>
            </div>
          )}
        </div>
      </div>

      {/* Sản phẩm + CHI TIẾT GIÁ HIỂN RÕ PHÍ SHIP, GIẢM GIÁ */}
      <div className="mb-4">
        <h6>
          <strong>Danh sách sản phẩm:</strong>
        </h6>
        <table className="table">
          <thead>
            <tr>
              <th>Sản phẩm</th>
              <th>Chi tiết</th>
              <th>Số lượng</th>
              <th>Đơn giá</th>
              <th>Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {order.OrderDetails.map((detail, idx) => (
              <tr key={idx}>
                <td>{detail.FoodName}</td>
                <td>
                  {detail.SizeName && `Kích cỡ: ${detail.SizeName}`}
                  <br />
                  {detail.Toppings.length > 0 && (
                    <small className="text-muted">
                      Topping:{" "}
                      {detail.Toppings.map((t) => t.ToppingName).join(", ")}
                    </small>
                  )}
                </td>
                <td>{detail.Quantity}</td>
                <td>{detail.Price?.toLocaleString("vi-VN")} ₫</td>
                <td>
                  {(detail.Price * detail.Quantity).toLocaleString("vi-VN")} ₫
                </td>
              </tr>
            ))}
          </tbody>
          {/* THÊM CHI TIẾT GIÁ TRONG TFOOT - RÕ RÀNG NHƯ YÊU CẦU */}
          <tfoot>
            <tr>
              <th colSpan="4" className="text-end">
                Tạm tính:
              </th>
              <th>{subtotal.toLocaleString("vi-VN")} ₫</th>
            </tr>
            <tr>
              <th colSpan="4" className="text-end">
                Phí ship:
              </th>
              <th>{order.ShippingFee?.toLocaleString("vi-VN")} ₫</th>
            </tr>
            {order.DiscountAmount > 0 && (
              <tr>
                <th colSpan="4" className="text-end">
                  Giảm giá:
                </th>
                <th className="text-success">
                  -{order.DiscountAmount?.toLocaleString("vi-VN")} ₫
                </th>
              </tr>
            )}
            <tr className="fw-bold">
              <th colSpan="4" className="text-end">
                Tổng cộng:
              </th>
              <th className="total-price">
                {order.TotalAmount?.toLocaleString("vi-VN")} ₫
              </th>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Nút hủy đơn - CHỈ HIỂN THỊ KHI StatusId === 1 (Chờ xác nhận) */}
      {order.StatusId === 1 && (
        <div className="text-end">
          <button className="btn btn-warning">Hủy đơn hàng</button>
        </div>
      )}
    </div>
  );
}
