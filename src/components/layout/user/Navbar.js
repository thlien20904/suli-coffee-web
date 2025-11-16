import React, { useEffect, useState } from "react";
import { Navbar as BSNavbar, Container } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { FaSearch, FaBell, FaShoppingCart, FaUser } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import {
  logout,
  setCartCount,
  setUnreadCount,
  updateUser,
} from "../../../redux/userSlice";
import { API_BASE_URL, buildApiUrl } from "../../../utils/apiConfig";
import "../../../styles/components/Navbar.css";

export default function Navbar({ brandText = "SuLi Coffee" }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { token, username, avatar, cartCount, unreadCount } = useSelector(
    (state) => state.user
  );

  const [menuVisible, setMenuVisible] = useState(false);
  const isAuthenticated = !!token;

  /* =============================
     🧩 FETCH AVATAR
  ============================= */
  useEffect(() => {
    const fetchAvatar = async () => {
      try {
        if (!isAuthenticated) return;
        const res = await axios.get(buildApiUrl("/api/profile/avatar"), {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.data?.success && res.data.data) {
          // backend may return either a string (AvatarURL) or an object { avatarUrl: ... }
          let avatarPath = null;
          if (typeof res.data.data === "string") {
            avatarPath = res.data.data;
          } else if (res.data.data.avatarUrl) {
            avatarPath = res.data.data.avatarUrl;
          } else if (res.data.data.AvatarURL) {
            avatarPath = res.data.data.AvatarURL;
          }

          if (avatarPath) {
            const fullUrl = avatarPath.startsWith("http")
              ? avatarPath
              : `${API_BASE_URL}${avatarPath}`;
            dispatch(updateUser({ avatar: fullUrl }));
          }
        }
      } catch (err) {
        console.error("FETCH AVATAR ERROR:", err);
      }
    };
    fetchAvatar();
  }, [isAuthenticated, token, dispatch]);

  /* =============================
     🛒 FETCH CART COUNT
  ============================= */
  useEffect(() => {
    const fetchCart = async () => {
      try {
        if (!isAuthenticated) {
          dispatch(setCartCount(0));
          return;
        }
        const res = await axios.get(buildApiUrl("/api/cart"), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data && res.data.cart) {
          const total = res.data.cart.reduce(
            (sum, item) => sum + (item.SoLuong ?? 0),
            0
          );
          dispatch(setCartCount(total));
        }
      } catch (err) {
        console.error("FETCH CART ERROR:", err);
      }
    };
    fetchCart();
  }, [isAuthenticated, token, dispatch]);

  /* =============================
     🔔 FETCH UNREAD NOTIFICATIONS
  ============================= */
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        if (!isAuthenticated) {
          dispatch(setUnreadCount(0));
          return;
        }

        const res = await axios.get(buildApiUrl("/api/profile/notifications"), {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.data?.success && res.data.notifications) {
          const unread = res.data.notifications.filter((n) => !n.IsRead).length;
          dispatch(setUnreadCount(unread));
        }
      } catch (err) {
        console.error("FETCH UNREAD NOTIFICATIONS ERROR:", err);
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 30000); // refresh mỗi 30s
    return () => clearInterval(interval);
  }, [isAuthenticated, token, dispatch]);

  /* =============================
     🚪 LOGOUT
  ============================= */
  const handleLogout = () => {
    dispatch(logout());
    navigate("/login", { replace: true });
  };

  /* =============================
     👤 AVATAR
  ============================= */
  const renderUserAvatar = () => {
    if (avatar) {
      return <img src={avatar} alt="User avatar" className="avatar-img" />;
    } else if (username) {
      return <div className="avatar-initial">{username[0].toUpperCase()}</div>;
    } else {
      return <FaUser size={22} className="icon-white" />;
    }
  };

  /* =============================
     🎨 GIAO DIỆN NAVBAR
  ============================= */
  return (
    <BSNavbar
      expand="lg"
      className="header"
      data-bs-theme="light"
      style={{
        position: "fixed",
        top: 0,
        width: "100%",
        zIndex: 50000, // ensure header stays above floating buttons/overlays
        backgroundColor: "#ffffff",
      }}
    >
      <Container className="d-flex align-items-center justify-content-between flex-grow-1">
        {/* Logo */}
        <div className="logo" style={{ paddingLeft: "20px" }}>
          <Link to="/" className="logo-link text-decoration-none d-block">
            <span className="logo-middle">{brandText}</span>
          </Link>
        </div>

        {/* Thanh tìm kiếm */}
        <div className="search-bar">
          <input
            type="text"
            className="form-control custom-search-input"
            placeholder="Tìm kiếm sản phẩm..."
          />
          <FaSearch className="search-icon-right" />
        </div>

        {/* Menu điều hướng */}
        <nav className="nav">
          <ul className="d-flex list-unstyled mb-0">
            <li>
              <Link to="/" className="nav-link">
                Trang chủ
              </Link>
            </li>
            <li>
              <Link to="/products" className="nav-link">
                Sản phẩm
              </Link>
            </li>
            <li>
              <Link to="/about" className="nav-link">
                Giới thiệu
              </Link>
            </li>
            <li>
              <Link to="/stores" className="nav-link">
                Cửa hàng
              </Link>
            </li>
            {/* <li>
              <Link to="/csp-demo" className="nav-link">
                CSP Demo
              </Link>
            </li> */}
            {/* Chỉ hiện Backend CSP Demo khi truy cập từ localhost:5000 (backend) */}
            {window.location.port === "5000" && (
              <li>
                <a href="/csp" target="_self">
                  Backend CSP
                </a>
              </li>
            )}
          </ul>
        </nav>

        {/* Khu vực bên phải */}
        <div className="navbar-right ms-auto d-flex align-items-center">
          {/* 🔔 Thông báo */}
          <div
            className="position-relative me-3"
            onClick={() => navigate("/profile/notifications")}
            style={{ cursor: "pointer" }}
          >
            <FaBell size={20} color="#f9d2b5ff" />
            {!!unreadCount && (
              <span className="custom-badge">{unreadCount}</span>
            )}
          </div>

          {/* 🛒 Giỏ hàng */}
          <div
            className="position-relative me-3"
            onClick={() => navigate("/cart")}
            style={{ cursor: "pointer" }}
          >
            <FaShoppingCart size={20} color="#f9d2b5ff" />
            {!!cartCount && <span className="custom-badge">{cartCount}</span>}
          </div>

          {/* 👤 Avatar */}
          <div
            className="avatar-container"
            onMouseEnter={() => setMenuVisible(true)}
            onMouseLeave={() => {
              setTimeout(() => setMenuVisible(false), 200);
            }}
          >
            {renderUserAvatar()}

            <div
              className={`avatar-dropdown ${menuVisible ? "show" : ""}`}
              onMouseEnter={() => setMenuVisible(true)}
              onMouseLeave={() => setMenuVisible(false)}
            >
              {isAuthenticated ? (
                <>
                  <p
                    onClick={() => navigate("/profile")}
                    className="dropdown-item"
                  >
                    👤 Hồ sơ
                  </p>
                  <p onClick={handleLogout} className="dropdown-item">
                    🚪 Đăng xuất
                  </p>
                </>
              ) : (
                <>
                  <p
                    onClick={() => navigate("/login")}
                    className="dropdown-item"
                  >
                    🔐 Đăng nhập
                  </p>
                  <p
                    onClick={() => navigate("/register")}
                    className="dropdown-item"
                  >
                    📝 Đăng ký
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </Container>
    </BSNavbar>
  );
}
