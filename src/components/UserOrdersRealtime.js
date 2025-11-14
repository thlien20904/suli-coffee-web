// UserOrdersRealtime.js - Real-time orders list for user profile
import React, { useEffect, useState } from "react";
import { useOrderUpdates } from "../hooks/useSocket";
import "./UserOrdersRealtime.css";

const UserOrdersRealtime = ({ userId, initialOrders = [] }) => {
  const { orders: realtimeOrders, isConnected } = useOrderUpdates(userId);
  const [allOrders, setAllOrders] = useState(initialOrders);

  useEffect(() => {
    // Merge initial orders with real-time orders
    if (realtimeOrders.length > 0) {
      setAllOrders((prev) => {
        const newOrders = realtimeOrders.filter(
          (ro) => !prev.some((po) => po.orderId === ro.orderId)
        );
        return [...newOrders, ...prev];
      });
    }
  }, [realtimeOrders]);

  const getStatusColor = (status) => {
    const colors = {
      pending: "#ff6a00",
      processing: "#667eea",
      delivering: "#38ef7d",
      completed: "#11998e",
      cancelled: "#999",
    };
    return colors[status] || "#333";
  };

  const getStatusText = (status) => {
    const texts = {
      pending: "Chờ xác nhận",
      processing: "Đang xử lý",
      delivering: "Đang giao",
      completed: "Hoàn thành",
      cancelled: "Đã hủy",
    };
    return texts[status] || status;
  };

  return (
    <div className="user-orders-realtime">
      <div className="orders-header">
        <h2>Đơn hàng của tôi</h2>
        <div className={`realtime-badge ${isConnected ? "connected" : ""}`}>
          <span className="badge-dot"></span>
          {isConnected ? "Real-time" : "Offline"}
        </div>
      </div>

      {allOrders.length === 0 ? (
        <div className="no-orders">
          <p>📦 Bạn chưa có đơn hàng nào</p>
        </div>
      ) : (
        <div className="orders-list">
          {allOrders.map((order) => (
            <div key={order.orderId} className="order-card">
              <div className="order-header">
                <span className="order-id">#{order.orderId}</span>
                <span
                  className="order-status"
                  style={{
                    background: getStatusColor(order.status),
                    color: "white",
                    padding: "4px 12px",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                >
                  {getStatusText(order.status)}
                </span>
              </div>

              <div className="order-body">
                <div className="order-info">
                  <span>
                    💰 Tổng tiền: {order.totalAmount?.toLocaleString("vi-VN")} ₫
                  </span>
                  <span>💳 {order.paymentMethod}</span>
                </div>
                <div className="order-time">
                  🕐{" "}
                  {new Date(order.timestamp || order.orderDate).toLocaleString(
                    "vi-VN"
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserOrdersRealtime;
