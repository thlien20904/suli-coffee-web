import React, { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { buildApiUrl } from "../../utils/apiConfig";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "../../styles/components/admin/order.css";

const Order = () => {
  const tabs = [
    { id: "don-luu-tam", name: "Đơn lưu tạm", statusId: 6 },
    { id: "cho-xac-nhan", name: "Chờ xác nhận", statusId: 1 },
    { id: "dang-chuan-bi", name: "Đang chuẩn bị", statusId: 2 },
    { id: "dang-giao-hang", name: "Đang giao hàng", statusId: 3 },
    { id: "da-giao", name: "Đã giao", statusId: 4 },
    { id: "da-huy", name: "Đã hủy", statusId: 5 },
  ];

  const [activeTab, setActiveTab] = useState("cho-xac-nhan");
  const [ordersData, setOrdersData] = useState({});
  const [loadingTabs, setLoadingTabs] = useState({});

  // -------------------- LẤY ĐƠN HÀNG THEO TAB --------------------
  const fetchOrders = async (tab, page = 1) => {
    setLoadingTabs((prev) => ({ ...prev, [tab]: true }));

    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(buildApiUrl("/api/admin/orders"), {
        headers: { Authorization: `Bearer ${token}` },
        params: { tab, page, pageSize: 10 },
      });

      if (res.data.success) {
        const d = res.data.data;
        setOrdersData((prev) => ({
          ...prev,
          [tab]: {
            orders: d.orders,
            currentPage: d.currentPage,
            totalPages: d.totalPages,
          },
        }));
      } else {
        setOrdersData((prev) => ({
          ...prev,
          [tab]: { orders: [], currentPage: 1, totalPages: 1 },
        }));
      }
    } catch (err) {
      console.error("❌ Fetch Orders Error:", err);
      setOrdersData((prev) => ({ ...prev, [tab]: { orders: [] } }));
    } finally {
      setLoadingTabs((prev) => ({ ...prev, [tab]: false }));
    }
  };

  // -------------------- CHUYỂN TAB --------------------
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    fetchOrders(tabId, 1);
  };

  useEffect(() => {
    fetchOrders(activeTab, 1);
  }, []);

  // -------------------- CẬP NHẬT TRẠNG THÁI --------------------
  const updateStatus = async (id, statusId) => {
    try {
      const res = await axios.post(
        buildApiUrl(`/api/admin/orders/${id}/status`),
        { statusId },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

      if (res.data.success) {
        Swal.fire({
          icon: "success",
          title: "Thành công",
          text: res.data.message || "Cập nhật trạng thái thành công!",
          showConfirmButton: true,
          timer: 1500,
        }).then(() => {
          fetchOrders(activeTab, ordersData[activeTab]?.currentPage || 1);
        });
      } else {
        Swal.fire({
          icon: "error",
          text: res.data.message || "Không thể cập nhật trạng thái",
          showConfirmButton: true,
        });
      }
    } catch (err) {
      Swal.fire("Lỗi", "Không thể kết nối server", "error");
    }
  };

  // -------------------- HỦY ĐỠN LƯU TẠM --------------------
  const cancelPendingOrder = async (orderId) => {
    const result = await Swal.fire({
      title: "Xác nhận hủy đơn lưu tạm?",
      text: "Đơn hàng này sẽ bị hủy và không thể khôi phục!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Có, hủy ngay!",
      cancelButtonText: "Không",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        buildApiUrl(`/api/admin/orders/pending/${orderId}/cancel`),
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        Swal.fire({
          icon: "success",
          title: "Thành công!",
          text: "Đơn hàng đã được hủy.",
          showConfirmButton: true,
          timer: 1500,
        }).then(() => {
          fetchOrders(activeTab, ordersData[activeTab]?.currentPage || 1);
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Lỗi!",
          text: res.data.message || "Hủy thất bại",
          showConfirmButton: true,
        });
      }
    } catch (err) {
      console.error("❌ CANCEL PENDING ORDER ERROR:", err);
      Swal.fire({
        icon: "error",
        title: "Lỗi!",
        text: err.response?.data?.message || "Không thể kết nối server!",
        showConfirmButton: true,
      });
    }
  };

  // -------------------- RENDER BẢNG --------------------
  const renderTable = (tab) => {
    const data = ordersData[tab];
    const isLoading = loadingTabs[tab];

    if (isLoading)
      return <p className="text-center mt-4">Đang tải đơn hàng...</p>;
    if (!data || !data.orders || data.orders.length === 0) {
      return (
        <p className="text-center mt-4">
          Không có đơn hàng nào ở trạng thái này.
        </p>
      );
    }

    return (
      <>
        <table className="order-table">
          <thead>
            <tr>
              <th>Mã đơn</th>
              <th>Khách hàng</th>
              <th>Ngày đặt</th>
              <th>Tổng tiền</th>
              <th>Thanh toán</th>
              <th>Trạng thái đơn hàng</th>
              <th>Trạng thái TT</th>
              <th>Chi tiết</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {data.orders.map((o) => (
              <tr key={o.OrderId}>
                <td>#{o.OrderId}</td>
                <td>{o.User?.FullName || "Khách vãng lai"}</td>
                <td>
                  {new Date(o.OrderDate).toLocaleString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </td>
                <td>{o.TotalAmount?.toLocaleString("vi-VN")} ₫</td>
                <td>{o.PaymentMethod || "N/A"}</td>
                <td>{o.Status || "Không xác định"}</td>
                <td>
                  <span
                    className={
                      o.PaymentStatus === "Đã thanh toán"
                        ? "text-success fw-bold"
                        : o.PaymentStatus === "Thanh toán thất bại"
                        ? "text-danger"
                        : "text-muted"
                    }
                  >
                    {o.PaymentStatus || "Chờ thanh toán"}
                  </span>
                </td>
                <td>
                  {o.OrderDetails && o.OrderDetails.length > 0 ? (
                    o.OrderDetails.map((d, idx) => (
                      <div key={idx} className="order-detail-line">
                        <span className="fw-bold">{d.FoodName}</span>
                        {d.SizeName && ` (${d.SizeName})`}
                        <span>
                          {" | "}SL: {d.Quantity} -{" "}
                          {d.Price?.toLocaleString("vi-VN")} ₫
                        </span>
                        {d.Toppings && d.Toppings.length > 0 && (
                          <div
                            className="text-muted"
                            style={{ fontSize: "0.9em" }}
                          >
                            {d.Toppings.map((t) => t.ToppingName).join(" + ")}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <span className="text-muted">Không có chi tiết</span>
                  )}
                </td>
                <td>
                  {o.StatusId === 6 ? (
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => cancelPendingOrder(o.OrderId)}
                    >
                      <i className="fas fa-times"></i> Hủy đơn
                    </button>
                  ) : o.StatusId === 5 ? (
                    <span className="badge bg-danger">Đã hủy</span>
                  ) : o.PaymentStatusId === 3 ? (
                    <span className="badge bg-warning text-dark">
                      TT thất bại
                    </span>
                  ) : o.PaymentMethodId === 1 && o.PaymentStatusId === 1 ? (
                    <span className="badge bg-info text-white">
                      Chờ thanh toán VNPay
                    </span>
                  ) : (
                    <select
                      className="form-select form-select-sm"
                      value={o.StatusId}
                      onChange={(e) =>
                        updateStatus(o.OrderId, parseInt(e.target.value))
                      }
                    >
                      <option value={1}>Chờ xác nhận</option>
                      <option value={2}>Đang chuẩn bị</option>
                      <option value={3}>Đang giao hàng</option>
                      <option value={4}>Đã giao</option>
                      <option value={5}>Đã hủy</option>
                    </select>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {data.totalPages > 1 && (
          <nav className="pagination justify-content-center mt-3">
            <button
              className="btn btn-sm btn-outline-secondary me-2"
              disabled={data.currentPage === 1}
              onClick={() => fetchOrders(tab, data.currentPage - 1)}
            >
              &laquo; Trước
            </button>
            {[...Array(data.totalPages)].map((_, i) => (
              <button
                key={i}
                className={`btn btn-sm ${
                  data.currentPage === i + 1
                    ? "btn-primary"
                    : "btn-outline-primary"
                } me-1`}
                onClick={() => fetchOrders(tab, i + 1)}
              >
                {i + 1}
              </button>
            ))}
            <button
              className="btn btn-sm btn-outline-secondary ms-1"
              disabled={data.currentPage === data.totalPages}
              onClick={() => fetchOrders(tab, data.currentPage + 1)}
            >
              Sau &raquo;
            </button>
          </nav>
        )}
      </>
    );
  };

  return (
    <div className="p-4">
      <h4 className="mb-3 fw-bold">Quản lý đơn hàng</h4>

      {/* TABS */}
      <div className="nav-tabs-wrapper">
        <ul className="nav nav-tabs">
          {tabs.map((t) => (
            <li className="nav-item" key={t.id}>
              <button
                className={`nav-link ${activeTab === t.id ? "active" : ""}`}
                onClick={() => handleTabChange(t.id)}
              >
                {t.name}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* TABLE */}
      <div>{renderTable(activeTab)}</div>
    </div>
  );
};

export default Order;
