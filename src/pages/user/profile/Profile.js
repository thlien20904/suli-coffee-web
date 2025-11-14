// frontend/src/pages/user/profile/Profile.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../../styles/pages/profile.css";

// Import helper functions
import { getAvatarUrl, getDefaultImage } from "../../../utils/imageUtils";

// Import các phần con
import ProfileInfo from "./ProfileInfo";
import OrdersList from "./OrdersList";
import Vouchers from "./Vouchers";
import Notifications from "./Notifications";
import Help from "./Help";

const API_BASE = "http://localhost:5000";

function Profile() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const [activeSection, setActiveSection] = useState("profile");
  const [userState, setUserState] = useState(null);
  const [avatar, setAvatar] = useState(getDefaultImage());
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [error, setError] = useState("");

  // Helper fetch có token
  const apiFetch = async (url, options = {}) => {
    const headers = { "Content-Type": "application/json", ...options.headers };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}${url}`, { ...options, headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Lỗi máy chủ");
    return data;
  };

  // Lấy thông tin user
  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    const fetchUser = async () => {
      try {
        setLoading(true);
        const data = await apiFetch("/api/profile");
        if (data.success && data.data) {
          // <- sửa từ data.user -> data.data
          setUserState(data.data);
          setAvatar(getAvatarUrl(data.data.AvatarUrl));
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [token, navigate]);

  // Đổi section
  const showSection = (section) => {
    setActiveSection(section);
    if (section === "orders") fetchOrders("cho-xac-nhan", 1);
  };

  // Lấy đơn hàng
  const fetchOrders = async (tab, page) => {
    setLoadingOrders(true);
    try {
      const data = await apiFetch(
        `/api/profile/orders?page=${page}&pageSize=5&tab=${tab}`
      );
      if (data.success) {
        setOrders(data.orders || []);
        setPagination({
          currentPage: data.currentPage,
          totalPages: data.totalPages,
        });
      } else setOrders([]);
    } catch (err) {
      setError(err.message);
    }
    setLoadingOrders(false);
  };

  const cancelOrder = async (orderId) => {
    if (!window.confirm("Hủy đơn hàng này?")) return;
    try {
      const data = await apiFetch("/api/profile/orders/cancel", {
        method: "POST",
        body: JSON.stringify({ orderId }),
      });
      if (data.success) {
        alert(data.message);
        fetchOrders("cho-xac-nhan", pagination.currentPage);
      } else alert(data.message);
    } catch {
      alert("Lỗi hủy đơn hàng!");
    }
  };

  if (loading) return <div className="text-center py-5">Đang tải...</div>;
  if (error)
    return (
      <div className="alert alert-danger text-center py-5">
        {error}
        <button
          className="btn btn-primary mt-2"
          onClick={() => window.location.reload()}
        >
          Thử lại
        </button>
      </div>
    );

  return (
    <div className="profile-wrapper">
      <div className="profile-container">
        {/* Sidebar */}
        <div className="profile-sidebar">
          <div className="profile-header">
            <img
              src={avatar}
              alt="Avatar"
              className="rounded-circle"
              width="80"
            />
            <h5>{userState?.Username}</h5>
            <p>
              {userState?.CreatedDate
                ? new Date(userState.CreatedDate).toLocaleDateString()
                : "N/A"}
            </p>
          </div>
          <ul className="profile-menu">
            <li>
              <button onClick={() => showSection("orders")}>📦 Orders</button>
            </li>
            <li>
              <button onClick={() => showSection("profile")}>⚙ Profile</button>
            </li>
            <li>
              <button onClick={() => showSection("vouchers")}>
                🎁 Vouchers
              </button>
            </li>
            <li>
              <button onClick={() => showSection("notifications")}>
                🔔 Notifications
              </button>
            </li>
            <li>
              <button onClick={() => showSection("help")}>❓ Help</button>
            </li>
          </ul>
        </div>

        {/* Nội dung chính */}
        <div className="profile-content">
          {activeSection === "profile" && (
            <ProfileInfo
              userState={userState}
              apiFetch={apiFetch}
              avatar={avatar}
              setAvatar={setAvatar}
            />
          )}
          {activeSection === "orders" && (
            <OrdersList
              orders={orders}
              pagination={pagination}
              loadingOrders={loadingOrders}
              fetchOrders={fetchOrders}
              cancelOrder={cancelOrder}
            />
          )}
          {activeSection === "vouchers" && <Vouchers />}
          {activeSection === "notifications" && <Notifications />}
          {activeSection === "help" && <Help />}
        </div>
      </div>
    </div>
  );
}

export default Profile;
