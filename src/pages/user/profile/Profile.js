// frontend/src/pages/user/profile/Profile.js
import React, { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import "../../../styles/pages/profile.css";

// Import helper functions
import { getAvatarUrl, getDefaultImage } from "../../../utils/imageUtils";

// Import các phần con (nếu cần pass props, nhưng giờ dùng Outlet nên các con tự fetch)
import { API_BASE_URL } from "../../../utils/apiConfig";

function Profile() {
  const location = useLocation();
  const token = localStorage.getItem("token");
  const [userState, setUserState] = useState(null);
  const [avatar, setAvatar] = useState(getDefaultImage());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Helper fetch có token
  const apiFetch = async (url, options = {}) => {
    const headers = { "Content-Type": "application/json", ...options.headers };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE_URL}${url}`, { ...options, headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Lỗi máy chủ");
    return data;
  };

  // Lấy thông tin user
  useEffect(() => {
    if (!token) {
      window.location.href = "/login"; // Redirect nếu không có token
      return;
    }
    const fetchUser = async () => {
      try {
        setLoading(true);
        const data = await apiFetch("/api/profile");
        if (data.success && data.data) {
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
  }, [token]);

  // Xác định active menu dựa trên location.pathname
  const getActiveSection = () => {
    const path = location.pathname;
    if (path.includes("/profile/orders")) return "orders";
    if (path.includes("/profile/vouchers")) return "vouchers";
    if (path.includes("/profile/notifications")) return "notifications";
    if (path.includes("/profile/help")) return "help";
    return "profile"; // Default
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
            <li className={getActiveSection() === "orders" ? "active" : ""}>
              <Link to="/profile/orders">📦 Orders</Link>
            </li>
            <li className={getActiveSection() === "profile" ? "active" : ""}>
              <Link to="/profile">⚙ Profile</Link>
            </li>
            <li className={getActiveSection() === "vouchers" ? "active" : ""}>
              <Link to="/profile/vouchers">🎁 Vouchers</Link>
            </li>
            <li
              className={getActiveSection() === "notifications" ? "active" : ""}
            >
              <Link to="/profile/notifications">🔔 Notifications</Link>
            </li>
            <li className={getActiveSection() === "help" ? "active" : ""}>
              <Link to="/profile/help">❓ Help</Link>
            </li>
          </ul>
        </div>

        {/* Nội dung chính - Sử dụng Outlet để render route con */}
        <div className="profile-content">
          <Outlet context={{ userState, apiFetch, avatar, setAvatar }} />{" "}
          {/* Pass context nếu cần cho con */}
        </div>
      </div>
    </div>
  );
}

export default Profile;
