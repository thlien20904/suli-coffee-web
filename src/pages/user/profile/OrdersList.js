import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { buildApiUrl } from "../../../utils/apiConfig";
import Swal from "sweetalert2";
import "../../../styles/pages/orderslist.css";

export default function OrdersList() {
  const tabs = [
    { id: "pending", name: "Đơn lưu tạm", statusId: null },
    { id: "cho-xac-nhan", name: "Chờ xác nhận", statusId: 1 },
    { id: "dang-chuan-bi", name: "Đang chuẩn bị", statusId: 2 },
    { id: "dang-giao-hang", name: "Đang giao hàng", statusId: 3 },
    { id: "da-giao", name: "Đã giao", statusId: 4 },
    { id: "da-huy", name: "Đã hủy", statusId: 5 },
  ];

  const [activeTab, setActiveTab] = useState("cho-xac-nhan");
  const [ordersData, setOrdersData] = useState({});
  const [loadingTabs, setLoadingTabs] = useState({});

  const navigate = useNavigate();

  // -------------------- LẤY ĐƠN HÀNG --------------------
  const fetchOrders = async (tab, page = 1) => {
    setLoadingTabs((prev) => ({ ...prev, [tab]: true }));

    try {
      const token = localStorage.getItem("token");
      let res;
      if (tab === "pending") {
        res = await axios.get(buildApiUrl("/api/orders/pending"), {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        res = await axios.get(buildApiUrl("/api/profile/orders"), {
          headers: { Authorization: `Bearer ${token}` },
          params: { tab, page, pageSize: 5 },
        });
      }

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
      console.error("Fetch Orders Error:", err);
      setOrdersData((prev) => ({ ...prev, [tab]: { orders: [] } }));
    } finally {
      setLoadingTabs((prev) => ({ ...prev, [tab]: false }));
    }
  };

  // -------------------- HỦY ĐƠN --------------------
  const cancelOrder = async (orderId) => {
    Swal.fire({
      title: "Xác nhận hủy đơn hàng?",
      text: "Bạn có chắc chắn muốn hủy đơn hàng này không?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Có, hủy ngay!",
      cancelButtonText: "Không",
      reverseButtons: true,
    }).then(async (result) => {
      if (!result.isConfirmed) return;

      try {
        const token = localStorage.getItem("token");
        const res = await axios.post(
          buildApiUrl("/api/profile/orders/cancel"),
          { orderId },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (res.data.success) {
          Swal.fire({
            icon: "success",
            title: "Thành công!",
            text: "Đơn hàng đã được hủy.",
            showConfirmButton: true,
            timer: 1000,
          }).then(() => {
            setOrdersData((prev) => {
              const newData = { ...prev };

              // 1️⃣ Loại bỏ khỏi pending nếu có
              if (newData["pending"]) {
                newData["pending"].orders = newData["pending"].orders.filter(
                  (o) => o.OrderId !== orderId && o.StatusId !== 5
                );
              }

              // 2️⃣ Thêm vào da-huy
              if (!newData["da-huy"]) {
                newData["da-huy"] = {
                  orders: [],
                  currentPage: 1,
                  totalPages: 1,
                };
              }

              const cancelledOrder = res.data.order;
              if (cancelledOrder) {
                newData["da-huy"].orders.unshift(cancelledOrder);
              } else {
                // Nếu backend không trả đơn, fetch lại tab da-huy
                fetchOrders("da-huy", ordersData["da-huy"]?.currentPage || 1);
              }

              return newData;
            });
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
        console.error("CANCEL ORDER ERROR:", err);
        Swal.fire({
          icon: "error",
          title: "Lỗi!",
          text: "Không thể kết nối server!",
          showConfirmButton: true,
        });
      }
    });
  };

  // -------------------- XỬ LÝ CHUYỂN TAB --------------------
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    fetchOrders(tabId, 1);
  };

  // -------------------- EFFECT --------------------
  useEffect(() => {
    fetchOrders(activeTab, 1);
  }, []);

  // -------------------- RENDER BẢNG --------------------
  const renderTable = (tab) => {
    const data = ordersData[tab];
    const isLoading = loadingTabs[tab];

    if (isLoading) return <p className="text-center">Đang tải đơn hàng...</p>;
    if (!data || !data.orders) {
      return (
        <p className="text-center">Bạn chưa có đơn hàng ở trạng thái này.</p>
      );
    }

    const filteredOrders = (data.orders || []).filter((o) => {
      if (tab === "pending") {
        // Chỉ hiển thị đơn lưu tạm chưa bị hủy
        return o.StatusId !== 5;
      }
      if (tab === "cho-xac-nhan") {
        return o.PaymentStatusId === 1 || o.PaymentStatusId === 2;
      }
      if (tab === "da-huy") {
        return o.PaymentStatusId === 3 || o.Status === "Đã hủy";
      }
      return true;
    });

    if (filteredOrders.length === 0)
      return (
        <p className="text-center">
          {tab === "pending"
            ? "Bạn chưa có đơn lưu tạm (chưa hoàn tất hoặc thanh toán thất bại)."
            : "Bạn chưa có đơn hàng ở trạng thái này."}
        </p>
      );

    return (
      <>
        <table className="orders-table">
          <thead>
            <tr>
              <th>Mã đơn</th>
              <th>Ngày đặt</th>
              <th>Tổng tiền</th>
              <th>Thanh toán</th>
              <th>Trạng thái đơn hàng</th>
              <th>Trạng thái thanh toán</th>
              <th>Chi tiết</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((o) => (
              <tr key={o.OrderId}>
                <td>#{o.OrderId}</td>
                <td>
                  {new Date(o.OrderDate).toLocaleString("vi-VN", {
                    hour12: true,
                  })}
                </td>
                <td>{o.TotalAmount.toLocaleString("vi-VN")} ₫</td>
                <td>{o.PaymentMethod || "N/A"}</td>
                <td>{o.Status}</td>
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
                    {o.PaymentStatus ||
                      (o.PaymentMethodId === 2
                        ? "Chưa thanh toán"
                        : "Chờ thanh toán")}
                  </span>
                </td>
                <td>
                  {o.OrderDetails.map((d, idx) => (
                    <div key={idx} className="order-detail-line">
                      <span className="fw-bold">{d.FoodName}</span>
                      {d.SizeName && ` (${d.SizeName})`}
                      <span>
                        {" | "}SL: {d.Quantity} -{" "}
                        {d.Price.toLocaleString("vi-VN")} ₫
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
                  ))}
                </td>
                {/* ✅ Bọc button trong <td> */}
                <td>
                  {activeTab === "pending" && (
                    <>
                      <button
                        className="btn btn-success btn-sm me-1"
                        onClick={() =>
                          navigate("/checkout", {
                            state: { orderId: o.OrderId },
                          })
                        }
                      >
                        Tiếp tục thanh toán
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => cancelOrder(o.OrderId, "pending")}
                      >
                        Hủy
                      </button>
                    </>
                  )}
                  {(activeTab === "cho-xac-nhan" ||
                    activeTab === "dang-chuan-bi") && (
                    <button
                      className="btn btn-warning btn-sm text-white"
                      onClick={() => cancelOrder(o.OrderId)}
                    >
                      Hủy
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {data.totalPages > 1 && tab !== "pending" && (
          <nav className="pagination justify-content-center">
            <button
              className="page-link"
              disabled={data.currentPage === 1}
              onClick={() => fetchOrders(tab, data.currentPage - 1)}
            >
              &laquo;
            </button>
            {[...Array(data.totalPages)].map((_, i) => (
              <button
                key={i}
                className={`page-link ${
                  data.currentPage === i + 1 ? "active" : ""
                }`}
                onClick={() => fetchOrders(tab, i + 1)}
              >
                {i + 1}
              </button>
            ))}
            <button
              className="page-link"
              disabled={data.currentPage === data.totalPages}
              onClick={() => fetchOrders(tab, data.currentPage + 1)}
            >
              &raquo;
            </button>
          </nav>
        )}
      </>
    );
  };

  return (
    <div className="p-4">
      <h4 className="mb-3 fw-bold">Đơn hàng của bạn</h4>
      <ul className="nav nav-tabs mb-3">
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
      <div>{renderTable(activeTab)}</div>
    </div>
  );
}
