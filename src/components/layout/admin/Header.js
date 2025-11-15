import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../../../redux/userSlice";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { buildApiUrl } from "../../../utils/apiConfig";
import "../../../styles/components/Header.css";

export default function Header() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.user);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  const [errors, setErrors] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const dropdownRef = useRef(null);

  const passwordRegex =
    /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{6,}$/;

  useEffect(() => {
    const newErrors = { oldPassword: "", newPassword: "", confirmPassword: "" };

    if (newPassword && !passwordRegex.test(newPassword)) {
      newErrors.newPassword =
        "Mật khẩu phải ≥6 ký tự, có ít nhất 1 chữ hoa, 1 số và 1 ký tự đặc biệt.";
    }

    if (confirmPassword && confirmPassword !== newPassword) {
      newErrors.confirmPassword = "Xác nhận mật khẩu không khớp.";
    }

    setErrors(newErrors);
  }, [newPassword, confirmPassword]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    localStorage.removeItem("token");
    localStorage.removeItem("auth:rememberIdentifier");
    navigate("/login", { replace: true });
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (errors.newPassword || errors.confirmPassword) {
      setMessage("Vui lòng sửa lỗi trước khi tiếp tục!");
      return;
    }

    try {
      const res = await axios.post(
        buildApiUrl("/api/admin/auth/change-password"),
        { oldPassword, newPassword },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

      if (res.data.success) {
        setMessage("✅ Đổi mật khẩu thành công!");
        setTimeout(() => {
          setShowChangePassword(false);
          setOldPassword("");
          setNewPassword("");
          setConfirmPassword("");
          setMessage("");
        }, 1000);
      } else {
        setMessage(res.data.message || "Có lỗi xảy ra!");
      }
    } catch (err) {
      setMessage("❌ Mật khẩu cũ sai, vui lòng thử lại!");
    }
  };

  return (
    <header className="admin-header">
      {/* Bên trái (để trống hoặc sau này thêm nút) */}
      <div className="admin-header-left"></div>

      {/* Logo / tiêu đề ở giữa */}
      <div className="admin-header-center">
        <h3 className="logo">Chào mừng đến với trang Admin</h3>
      </div>

      {/* Avatar + Dropdown bên phải */}
      <div className="admin-header-right">
        <div className="dropdown-wrapper" ref={dropdownRef}>
          <div
            className="user-info"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <img
              src="https://cdn-icons-png.flaticon.com/512/149/149071.png"
              alt="avatar"
              className="avatar"
            />
            <span className="username">{user?.name || "Admin"}</span>
          </div>

          <ul className={`dropdown-menu ${dropdownOpen ? "show" : ""}`}>
            <li onClick={() => setShowProfile(true)}>Hồ sơ</li>
            <li onClick={() => setShowChangePassword(true)}>Đổi mật khẩu</li>
            <li onClick={handleLogout}>Đăng xuất</li>
          </ul>
        </div>
      </div>

      {/* Modal Hồ sơ */}
      {showProfile && (
        <div className="custom-modal-backdrop">
          <div className="custom-modal-content">
            <h4>Thông tin hồ sơ</h4>
            <div className="profile-info">
              <img
                src="https://cdn-icons-png.flaticon.com/512/149/149071.png"
                alt="avatar"
                className="avatar-large"
              />
              <p>
                <strong>Tên:</strong> {user?.name || "Admin"}
              </p>
              <p>
                <strong>Email:</strong> {user?.email || "admin@example.com"}
              </p>
              <p>
                <strong>Quyền:</strong> {user?.role || "Admin"}
              </p>
            </div>
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowProfile(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal đổi mật khẩu */}
      {showChangePassword && (
        <div className="custom-modal-backdrop">
          <div className="custom-modal-content">
            <h4>Đổi mật khẩu</h4>
            <form onSubmit={handleChangePassword}>
              <div className="form-group">
                <input
                  type="password"
                  placeholder="Mật khẩu cũ"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <input
                  type="password"
                  placeholder="Mật khẩu mới"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                {errors.newPassword && (
                  <p className="error-text">{errors.newPassword}</p>
                )}
              </div>

              <div className="form-group">
                <input
                  type="password"
                  placeholder="Xác nhận mật khẩu mới"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                {errors.confirmPassword && (
                  <p className="error-text">{errors.confirmPassword}</p>
                )}
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn btn-primary">
                  Xác nhận
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowChangePassword(false)}
                >
                  Hủy
                </button>
              </div>
            </form>
            {message && <p className="message">{message}</p>}
          </div>
        </div>
      )}
    </header>
  );
}
