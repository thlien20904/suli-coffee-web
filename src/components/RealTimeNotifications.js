// RealTimeNotifications.js - Toast notifications for real-time events
import React, { useEffect, useState } from "react";
import { useSocket } from "../hooks/useSocket";
import "./RealTimeNotifications.css";

const RealTimeNotifications = ({ userId, role = "user" }) => {
  const { isConnected, on, off } = useSocket({ userId, role });
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!isConnected) return;

    const handleNotification = (data) => {
      const notif = {
        id: Date.now(),
        ...data,
        timestamp: new Date(data.timestamp).toLocaleTimeString("vi-VN"),
      };

      setNotifications((prev) => [notif, ...prev].slice(0, 5)); // Keep last 5

      // Auto remove after 5 seconds
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
      }, 5000);
    };

    on("notification", handleNotification);

    return () => {
      off("notification", handleNotification);
    };
  }, [isConnected, on, off]);

  if (notifications.length === 0) return null;

  return (
    <div className="realtime-notifications">
      {notifications.map((notif) => (
        <div
          key={notif.id}
          className={`notification-toast notification-${notif.type}`}
        >
          <div className="notification-header">
            <span className="notification-icon">
              {notif.type === "order" && "📦"}
              {notif.type === "order-status" && "🔄"}
              {notif.type === "voucher" && "🎟️"}
              {notif.type === "product" && "🍔"}
            </span>
            <strong>{notif.title}</strong>
            <button
              className="notification-close"
              onClick={() =>
                setNotifications((prev) =>
                  prev.filter((n) => n.id !== notif.id)
                )
              }
            >
              ×
            </button>
          </div>
          <div className="notification-body">{notif.message}</div>
          <div className="notification-time">{notif.timestamp}</div>
        </div>
      ))}

      {/* Connection status indicator */}
      <div
        className={`connection-status ${
          isConnected ? "connected" : "disconnected"
        }`}
      >
        <span className="status-dot"></span>
        {isConnected ? "Real-time connected" : "Disconnected"}
      </div>
    </div>
  );
};

export default RealTimeNotifications;
