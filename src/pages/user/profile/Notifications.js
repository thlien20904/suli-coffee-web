import React, { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { buildApiUrl } from "../../../utils/apiConfig";
import "../../../styles/pages/notifications.css";

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 4; // ✅ 4 thông báo mỗi trang

  const token = localStorage.getItem("token") || "";
  const BASE = buildApiUrl("/api/profile");

  useEffect(() => {
    fetchNotifications();
  }, [page]);

  async function fetchNotifications() {
    try {
      setLoading(true);
      const res = await axios.get(
        `${BASE}/notifications?page=${page}&pageSize=${pageSize}`,
        { headers: { Authorization: `Bearer ${token}` }, timeout: 8000 }
      );

      if (res.data?.success) {
        // 🔹 Trích dữ liệu từ res.data.data
        setNotifications(res.data.data.notifications || []);
        setTotal(res.data.data.total || 0);
      } else {
        setNotifications([]);
        setTotal(0);
      }
    } catch (err) {
      console.error("FETCH NOTIFICATIONS ERROR:", err);
      Swal.fire(
        "Lỗi",
        err.response?.data?.message || "Không tải được thông báo",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(id) {
    try {
      await axios.post(
        `${BASE}/notifications/read`,
        { notificationId: id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotifications((prev) =>
        prev.map((n) => (n.NotificationId === id ? { ...n, IsRead: true } : n))
      );
    } catch (err) {
      console.error("MARK AS READ ERROR:", err);
    }
  }

  async function markAllAsRead() {
    try {
      await axios.post(
        `${BASE}/notifications/read-all`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, IsRead: true })));
      Swal.fire({
        icon: "success",
        title: "Đã đánh dấu tất cả là đã đọc",
        timer: 1000,
        showConfirmButton: false,
      });
    } catch {
      Swal.fire("Lỗi", "Không thể đánh dấu tất cả.", "error");
    }
  }

  async function deleteNotification(id) {
    const confirm = await Swal.fire({
      title: "Xác nhận xóa?",
      text: "Bạn có chắc muốn xóa thông báo này không?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Xóa",
      cancelButtonText: "Hủy",
      confirmButtonColor: "rgba(228, 210, 210, 1)",
    });

    if (!confirm.isConfirmed) return;

    try {
      const res = await axios.delete(`${BASE}/notifications/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        Swal.fire({
          icon: "success",
          title: "Xóa thành công!",
          timer: 1000,
          showConfirmButton: false,
        }).then(() => fetchNotifications());
      } else {
        Swal.fire("", res.data.message || "Xóa thất bại", "error");
      }
    } catch {
      Swal.fire("", "Không thể kết nối server!", "error");
    }
  }

  // 🧭 Tính tổng số trang
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="notifications-page">
      <div className="notif-top">
        <h3>🔔 Thông báo của bạn</h3>
        <div className="top-actions">
          {notifications.length > 0 && (
            <button className="btn-mark-all" onClick={markAllAsRead}>
              Đánh dấu tất cả là đã đọc
            </button>
          )}
          <button className="btn-refresh" onClick={fetchNotifications}>
            ⟳
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-center">⏳ Đang tải...</p>
      ) : notifications.length === 0 ? (
        <p className="text-center">Không có thông báo nào.</p>
      ) : (
        <>
          <div className="notification-list">
            {notifications.map((n) => (
              <div
                key={n.NotificationId}
                className={`notification-card ${n.IsRead ? "read" : "unread"}`}
              >
                <div
                  className="notification-content"
                  onClick={() => !n.IsRead && markAsRead(n.NotificationId)}
                >
                  <div className="title-row">
                    <strong className="title">{n.Title}</strong>
                    <span className="time">
                      {new Date(n.CreatedAt).toLocaleString("vi-VN")}
                    </span>
                  </div>
                  <p className="message">{n.Message}</p>
                </div>

                <button
                  className="btn-delete"
                  onClick={() => deleteNotification(n.NotificationId)}
                  title="Xóa thông báo"
                >
                  🗑️
                </button>

                {!n.IsRead && <div className="unread-dot" />}
              </div>
            ))}
          </div>

          {/* 🧭 Phân trang */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn-page"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                ⬅ Trước
              </button>
              <span>
                Trang {page}/{totalPages}
              </span>
              <button
                className="btn-page"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                Sau ➡
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
