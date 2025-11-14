// useSocket.js - Custom React Hook for Socket.IO real-time connection
import { useEffect, useState, useCallback } from "react";
import io from "socket.io-client";
import { SOCKET_URL } from "../utils/apiConfig";

let socketInstance = null;

/**
 * Custom hook to manage Socket.IO connection
 * @param {Object} options - { userId, role, autoConnect }
 * @returns {Object} { socket, isConnected, emit, on, off }
 */
export const useSocket = (options = {}) => {
  const { userId, role = "user", autoConnect = true } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!autoConnect) return;

    // Reuse existing socket if available
    if (socketInstance && socketInstance.connected) {
      setSocket(socketInstance);
      setIsConnected(true);
      return;
    }

    // Create new socket connection
    const newSocket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketInstance = newSocket;

    newSocket.on("connect", () => {
      console.log("✅ Socket connected:", newSocket.id);
      setIsConnected(true);

      // Register with role and userId
      newSocket.emit("register", { role, userId });
    });

    newSocket.on("disconnect", () => {
      console.log("❌ Socket disconnected");
      setIsConnected(false);
    });

    newSocket.on("connect_error", (error) => {
      console.error("❌ Socket connection error:", error);
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      if (newSocket) {
        newSocket.off("connect");
        newSocket.off("disconnect");
        newSocket.off("connect_error");
        // Don't disconnect, keep socket alive for reuse
      }
    };
  }, [userId, role, autoConnect]);

  const emit = useCallback(
    (event, data) => {
      if (socket && socket.connected) {
        socket.emit(event, data);
      } else {
        console.warn("⚠️ Socket not connected, cannot emit:", event);
      }
    },
    [socket]
  );

  const on = useCallback(
    (event, handler) => {
      if (socket) {
        socket.on(event, handler);
      }
    },
    [socket]
  );

  const off = useCallback(
    (event, handler) => {
      if (socket) {
        socket.off(event, handler);
      }
    },
    [socket]
  );

  return { socket, isConnected, emit, on, off };
};

/**
 * Hook specifically for order updates
 */
export const useOrderUpdates = (userId) => {
  const { socket, isConnected, on, off } = useSocket({ userId, role: "user" });
  const [orders, setOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleOrderUpdate = (data) => {
      console.log("📦 Order update:", data);
      setOrders((prev) => [data, ...prev]);
    };

    const handleOrderStatus = (data) => {
      console.log("🔄 Order status:", data);
      setOrders((prev) =>
        prev.map((order) =>
          order.orderId === data.orderId
            ? { ...order, status: data.status }
            : order
        )
      );
    };

    const handleNotification = (data) => {
      console.log("🔔 Notification:", data);
      setNotifications((prev) => [data, ...prev]);
    };

    on("order:update", handleOrderUpdate);
    on("order:status", handleOrderStatus);
    on("notification", handleNotification);

    return () => {
      off("order:update", handleOrderUpdate);
      off("order:status", handleOrderStatus);
      off("notification", handleNotification);
    };
  }, [socket, isConnected, on, off]);

  return { orders, notifications, isConnected };
};

/**
 * Hook for admin real-time dashboard
 */
export const useAdminDashboard = () => {
  const { socket, isConnected, on, off } = useSocket({ role: "admin" });
  const [orders, setOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState({
    pending: 0,
    processing: 0,
    completed: 0,
  });

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleNewOrder = (data) => {
      console.log("📦 New order (admin):", data);
      setOrders((prev) => [data, ...prev]);
      setStats((prev) => ({ ...prev, pending: prev.pending + 1 }));
    };

    const handleOrderStatusChange = (data) => {
      console.log("🔄 Order status change (admin):", data);
      setOrders((prev) =>
        prev.map((order) =>
          order.orderId === data.orderId
            ? { ...order, status: data.status }
            : order
        )
      );
    };

    const handleNotification = (data) => {
      console.log("🔔 Admin notification:", data);
      setNotifications((prev) => [data, ...prev]);
    };

    on("order:new", handleNewOrder);
    on("order:status-change", handleOrderStatusChange);
    on("notification", handleNotification);

    return () => {
      off("order:new", handleNewOrder);
      off("order:status-change", handleOrderStatusChange);
      off("notification", handleNotification);
    };
  }, [socket, isConnected, on, off]);

  return { orders, notifications, stats, isConnected };
};

export default useSocket;
