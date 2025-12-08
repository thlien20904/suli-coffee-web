import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { buildApiUrl } from "../../../utils/apiConfig";
import Swal from "sweetalert2";
import ReviewPopup from "./ReviewPopup"; // Đánh giá / Sửa
import ReviewDetailPopup from "./ReviewDetailPopup"; // Xem đánh giá + nút Sửa
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

  // Popup states
  const [showReviewPopup, setShowReviewPopup] = useState(null); // orderId
  const [showReviewDetail, setShowReviewDetail] = useState(null); // orderId

  const navigate = useNavigate();

  // ==================== LẤY ĐƠN HÀNG ====================
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
          params: { tab, page, pageSize: 10 },
        });
      }

      if (res.data.success) {
        const orders = res.data.data.orders || [];

        // Kiểm tra đã đánh giá hết chưa (dùng API checkReviewed)
        const enrichedOrders = await Promise.all(
          orders.map(async (order) => {
            if (tab === "da-giao") {
              try {
                const checkRes = await axios.get(
                  buildApiUrl(`/api/profile/order/${order.OrderId}/reviewed`),
                  { headers: { Authorization: `Bearer ${token}` } }
                );
                order.hasReviewed = checkRes.data.data?.reviewed || false;
              } catch {
                order.hasReviewed = false;
              }
            } else {
              order.hasReviewed = false;
            }
            return order;
          })
        );

        setOrdersData((prev) => ({
          ...prev,
          [tab]: {
            orders: enrichedOrders,
            currentPage: res.data.data.currentPage || 1,
            totalPages: res.data.data.totalPages || 1,
          },
        }));
      } else {
        setOrdersData((prev) => ({
          ...prev,
          [tab]: { orders: [], currentPage: 1, totalPages: 1 },
        }));
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setOrdersData((prev) => ({ ...prev, [tab]: { orders: [] } }));
    } finally {
      setLoadingTabs((prev) => ({ ...prev, [tab]: false }));
    }
  };

  // ==================== XEM CHI TIẾT ====================
  const viewOrderDetail = (orderId) => {
    navigate(`/profile/orders/orderdetail/${orderId}`);
  };

  // ==================== HỦY ĐƠN ====================
  const cancelOrder = async (orderId, orderType = "normal") => {
    const result = await Swal.fire({
      title: "Xác nhận hủy đơn hàng?",
      text: "Bạn có chắc chắn muốn hủy đơn hàng này không?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Có, hủy ngay!",
      cancelButtonText: "Không",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      const token = localStorage.getItem("token");

      // Chọn API tùy theo loại đơn
      const apiUrl =
        orderType === "pending"
          ? `/api/orders/pending/${orderId}/cancel`
          : "/api/profile/orders/cancel";

      // ✅ Log request details
      console.log("📤 CANCEL REQUEST:", {
        orderType,
        orderId,
        apiUrl,
        fullUrl: buildApiUrl(apiUrl),
        hasToken: !!token,
      });

      const res = await axios.post(
        buildApiUrl(apiUrl),
        orderType === "pending" ? {} : { orderId }, // pending không cần body
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log("✅ CANCEL RESPONSE:", res.data);

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
      // ✅ Log chi tiết error
      console.error("❌ CANCEL ORDER ERROR:", {
        message: err.message,
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        config: {
          url: err.config?.url,
          method: err.config?.method,
          headers: err.config?.headers,
        },
        fullError: err,
      });

      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Không thể kết nối server!";

      Swal.fire({
        icon: "error",
        title: "Lỗi!",
        text: errorMessage,
        showConfirmButton: true,
      });
    }
  };

  // ==================== ĐÃ NHẬN HÀNG – REALTIME ====================
  const confirmReceived = async (orderId) => {
    const result = await Swal.fire({
      title: "Đã nhận được hàng?",
      text: "Đơn sẽ chuyển sang tab Đã giao ngay!",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Đã nhận",
      cancelButtonText: "Chưa nhận",
    });

    if (!result.isConfirmed) return;

    try {
      const token = localStorage.getItem("token");
      await axios.post(
        buildApiUrl("/api/profile/orders/confirm-received"),
        { orderId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setOrdersData((prev) => {
        const newData = { ...prev };
        let movedOrder = null;

        if (newData["dang-giao-hang"]?.orders) {
          const idx = newData["dang-giao-hang"].orders.findIndex(
            (o) => o.OrderId === orderId
          );
          if (idx !== -1) {
            movedOrder = {
              ...newData["dang-giao-hang"].orders[idx],
              StatusId: 4,
              Status: "Giao hàng thành công",
            };
            newData["dang-giao-hang"].orders.splice(idx, 1);
          }
        }

        if (!newData["da-giao"])
          newData["da-giao"] = { orders: [], currentPage: 1, totalPages: 1 };
        if (movedOrder) newData["da-giao"].orders.unshift(movedOrder);

        return newData;
      });

      if (activeTab === "dang-giao-hang") setActiveTab("da-giao");
      Swal.fire("Thành công!", "Đơn đã chuyển sang Đã giao", "success");
    } catch (err) {
      Swal.fire("Lỗi", "Không thể xác nhận", "error");
    }
  };

  // ==================== CHUYỂN TAB ====================
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (!ordersData[tabId]?.orders?.length) fetchOrders(tabId, 1);
  };

  useEffect(() => {
    fetchOrders(activeTab, 1);
  }, []);

  // ==================== RENDER TABLE ====================
  const renderTable = (tab) => {
    const data = ordersData[tab];
    const isLoading = loadingTabs[tab];

    if (isLoading) return <p className="text-center">Đang tải...</p>;
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
              <tr
                key={o.OrderId}
                onClick={() => viewOrderDetail(o.OrderId)}
                style={{ cursor: "pointer" }}
              >
                <td>#{o.OrderId}</td>
                <td>{new Date(o.OrderDate).toLocaleString("vi-VN")}</td>
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
                  {o.OrderDetails.map((d, i) => (
                    <div key={i} className="small">
                      <strong>{d.FoodName}</strong> × {d.Quantity}
                      {d.SizeName && ` (${d.SizeName})`}
                      {d.Toppings?.length > 0 && (
                        <div className="text-muted">
                          + {d.Toppings.map((t) => t.ToppingName).join(" + ")}
                        </div>
                      )}
                    </div>
                  ))}
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  {/* ĐANG GIAO - CHỈ CÓ "ĐÃ NHẬN HÀNG" */}
                  {tab === "dang-giao-hang" && (
                    <div className="d-flex flex-column gap-2">
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => confirmReceived(o.OrderId)}
                      >
                        Đã nhận hàng
                      </button>
                    </div>
                  )}

                  {/* ĐÃ GIAO – CHỈ NÚT ĐÁNH GIÁ / XEM ĐÁNH GIÁ */}
                  {tab === "da-giao" && (
                    <div className="d-flex flex-column gap-2">
                      {!o.hasReviewed ? (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => setShowReviewPopup(o.OrderId)}
                        >
                          Đánh giá
                        </button>
                      ) : (
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => setShowReviewDetail(o.OrderId)}
                        >
                          Xem đánh giá
                        </button>
                      )}
                    </div>
                  )}

                  {/* PENDING */}
                  {tab === "pending" && (
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

                  {/* CHỜ XÁC NHẬN & ĐANG CHUẨN BỊ */}
                  {(tab === "cho-xac-nhan" || tab === "dang-chuan-bi") && (
                    <button
                      className="btn btn-warning btn-sm text-white"
                      onClick={() => cancelOrder(o.OrderId)}
                    >
                      Hủy đơn
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {data.totalPages > 1 && tab !== "pending" && (
          <div className="pagination justify-content-center mt-4">
            <button
              disabled={data.currentPage === 1}
              onClick={() => fetchOrders(tab, data.currentPage - 1)}
            >
              Trước
            </button>
            {[...Array(data.totalPages)].map((_, i) => (
              <button
                key={i}
                className={data.currentPage === i + 1 ? "active" : ""}
                onClick={() => fetchOrders(tab, i + 1)}
              >
                {i + 1}
              </button>
            ))}
            <button
              disabled={data.currentPage === data.totalPages}
              onClick={() => fetchOrders(tab, data.currentPage + 1)}
            >
              Sau
            </button>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="p-4">
      <h4 className="mb-4 fw-bold">Đơn hàng của bạn</h4>

      <ul className="nav nav-tabs mb-4">
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

      {renderTable(activeTab)}

      {/* POPUP ĐÁNH GIÁ */}
      {showReviewPopup && (
        <ReviewPopup
          orderId={showReviewPopup}
          onClose={() => {
            setShowReviewPopup(null);
            fetchOrders("da-giao"); // Refresh lại để cập nhật hasReviewed
          }}
        />
      )}

      {/* POPUP XEM + SỬA ĐÁNH GIÁ */}
      {showReviewDetail && (
        <ReviewDetailPopup
          orderId={showReviewDetail}
          onClose={() => {
            setShowReviewDetail(null);
            fetchOrders("da-giao");
          }}
        />
      )}
    </div>
  );
}
