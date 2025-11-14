// AdminDashboardRealtime.js - Real-time admin dashboard
import React, { useEffect, useState } from "react";
import { useAdminDashboard } from "../hooks/useSocket";
import "./AdminDashboardRealtime.css";

const AdminDashboardRealtime = () => {
  const { orders, notifications, stats, isConnected } = useAdminDashboard();
  const [filter, setFilter] = useState("all"); // all, pending, processing, completed

  const filteredOrders = orders.filter((order) => {
    if (filter === "all") return true;
    return order.status === filter;
  });

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

  return (
    <div className="admin-dashboard-realtime">
      {/* Header */}
      <div className="dashboard-header">
        <h1>📊 Admin Dashboard - Real-time</h1>
        <div
          className={`connection-indicator ${isConnected ? "connected" : ""}`}
        >
          <span className="indicator-dot"></span>
          {isConnected ? "Connected" : "Disconnected"}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card stat-pending">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <div className="stat-value">{stats.pending}</div>
            <div className="stat-label">Chờ xác nhận</div>
          </div>
        </div>

        <div className="stat-card stat-processing">
          <div className="stat-icon">🔄</div>
          <div className="stat-content">
            <div className="stat-value">{stats.processing}</div>
            <div className="stat-label">Đang xử lý</div>
          </div>
        </div>

        <div className="stat-card stat-completed">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-value">{stats.completed}</div>
            <div className="stat-label">Hoàn thành</div>
          </div>
        </div>

        <div className="stat-card stat-total">
          <div className="stat-icon">📦</div>
          <div className="stat-content">
            <div className="stat-value">{orders.length}</div>
            <div className="stat-label">Tổng đơn</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters">
        <button
          className={filter === "all" ? "active" : ""}
          onClick={() => setFilter("all")}
        >
          Tất cả ({orders.length})
        </button>
        <button
          className={filter === "pending" ? "active" : ""}
          onClick={() => setFilter("pending")}
        >
          Chờ xác nhận ({stats.pending})
        </button>
        <button
          className={filter === "processing" ? "active" : ""}
          onClick={() => setFilter("processing")}
        >
          Đang xử lý ({stats.processing})
        </button>
        <button
          className={filter === "completed" ? "active" : ""}
          onClick={() => setFilter("completed")}
        >
          Hoàn thành ({stats.completed})
        </button>
      </div>

      {/* Orders Table */}
      <div className="orders-table-container">
        <h2>Đơn hàng mới nhất (Real-time)</h2>
        {filteredOrders.length === 0 ? (
          <div className="no-orders">
            <p>Không có đơn hàng nào</p>
          </div>
        ) : (
          <table className="orders-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>User ID</th>
                <th>Tổng tiền</th>
                <th>Thanh toán</th>
                <th>Trạng thái</th>
                <th>Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.orderId} className="order-row">
                  <td>
                    <strong>#{order.orderId}</strong>
                  </td>
                  <td>{order.userId}</td>
                  <td>
                    <strong>
                      {order.totalAmount?.toLocaleString("vi-VN")} ₫
                    </strong>
                  </td>
                  <td>{order.paymentMethod}</td>
                  <td>
                    <span
                      className="status-badge"
                      style={{ background: getStatusColor(order.status) }}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="order-time">
                    {new Date(order.timestamp).toLocaleString("vi-VN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Recent Notifications */}
      <div className="notifications-panel">
        <h3>🔔 Thông báo gần đây</h3>
        {notifications.length === 0 ? (
          <p className="no-notifications">Chưa có thông báo</p>
        ) : (
          <div className="notifications-list">
            {notifications.slice(0, 10).map((notif, index) => (
              <div
                key={index}
                className={`notification-item notification-${notif.type}`}
              >
                <div className="notification-title">{notif.title}</div>
                <div className="notification-message">{notif.message}</div>
                <div className="notification-timestamp">
                  {new Date(notif.timestamp).toLocaleTimeString("vi-VN")}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboardRealtime;
