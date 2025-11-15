// frontend/src/pages/user/profile/ProfileInfo.js
import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import axios from "axios";
import { buildApiUrl, API_BASE_URL } from "../../../utils/apiConfig";

// Import helper functions
import { getAvatarUrl, getDefaultImage } from "../../../utils/imageUtils";

export default function ProfileInfo() {
  const [userState, setUserState] = useState(null);
  const [avatar, setAvatar] = useState(getDefaultImage());
  const [formData, setFormData] = useState({
    fullname: "",
    phone: "",
    address: "",
  });
  const [errors, setErrors] = useState({});
  const [avatarFile, setAvatarFile] = useState(null);

  // =====================
  // Fetch profile khi mount
  // =====================
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Bạn cần đăng nhập lại!");

        const res = await axios.get(buildApiUrl("/api/profile"), {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.data.success) {
          const data = res.data.data;
          setUserState(data);
          setFormData({
            fullname: data.FullName || "",
            phone: data.Phone || "",
            address: data.Address || "",
          });
          setAvatar(getAvatarUrl(data.AvatarUrl));
        } else {
          Swal.fire(
            "",
            res.data.message || "Không lấy được thông tin!",
            "error"
          );
        }
      } catch (err) {
        console.error("FETCH PROFILE ERROR:", err);
        Swal.fire("", "Không thể kết nối server!", "error");
      }
    };

    fetchProfile();
  }, []);

  // =====================
  // Validate input
  // =====================
  const validateField = (name, value) => {
    switch (name) {
      case "fullname":
        return !value.trim() || value.length < 3
          ? "Tên quá ngắn (≥3 ký tự)"
          : null;
      case "phone":
        return !/^(0[3|5|7|8|9])[0-9]{8,9}$/.test(value)
          ? "Số điện thoại không hợp lệ"
          : null;
      case "address":
        return !value.trim() || value.length < 5 ? "Địa chỉ quá ngắn" : null;
      default:
        return null;
    }
  };

  const validateForm = () => {
    const newErrors = {};
    ["fullname", "phone", "address"].forEach((f) => {
      const err = validateField(f, formData[f]);
      if (err) newErrors[f] = err;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
  };

  // =====================
  // Avatar change
  // =====================
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatar(URL.createObjectURL(file));
      setAvatarFile(file);
    }
  };

  // =====================
  // Submit form
  // =====================
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      Swal.fire("", "Vui lòng kiểm tra lại các trường nhập!", "error");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Bạn cần đăng nhập lại!");

      const fd = new FormData();
      fd.append("id", userState.Id);
      fd.append("FullName", formData.fullname);
      fd.append("Phone", formData.phone);
      fd.append("Address", formData.address);
      if (avatarFile) fd.append("AvatarFile", avatarFile);

      const res = await axios.post(buildApiUrl("/api/profile/update"), fd, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        Swal.fire({
          icon: "success",
          title: "Cập nhật thành công!",
          showConfirmButton: true,
          timer: 1000,
        });

        if (res.data.data?.avatarUrl)
          setAvatar(getAvatarUrl(res.data.data.avatarUrl));
        setAvatarFile(null);

        // cập nhật userState local luôn
        setUserState((prev) => ({
          ...prev,
          FullName: formData.fullname,
          Phone: formData.phone,
          Address: formData.address,
          AvatarUrl: res.data.data.avatarUrl || prev.AvatarUrl,
        }));
      } else {
        Swal.fire("", res.data.message || "Cập nhật thất bại", "error");
      }
    } catch (err) {
      console.error("UPDATE PROFILE ERROR:", err);
      Swal.fire("", "Không thể kết nối server!", "error");
    }
  };

  // =====================
  // Cancel form
  // =====================
  const handleCancel = () => {
    if (!userState) return;
    setFormData({
      fullname: userState.FullName || "",
      phone: userState.Phone || "",
      address: userState.Address || "",
    });
    setAvatar(getAvatarUrl(userState.AvatarUrl));
    setAvatarFile(null);
    setErrors({});
  };

  if (!userState) return <p>Đang tải thông tin người dùng...</p>;

  return (
    <form onSubmit={handleSubmit} className="p-4">
      {/* Avatar */}
      <div className="mb-3">
        <label>Avatar</label>
        <input
          type="file"
          accept=".jpg,.jpeg,.png,.gif,.webp"
          onChange={handleAvatarChange}
          className="form-control"
        />
        <img src={avatar} alt="Preview" width="120" className="mt-2 rounded" />
      </div>

      {/* Username & Email read-only */}
      <div className="mb-3">
        <label>Username</label>
        <input
          type="text"
          className="form-control"
          value={userState.Username || ""}
          readOnly
        />
      </div>

      <div className="mb-3">
        <label>Email</label>
        <input
          type="email"
          className="form-control"
          value={userState.Email || ""}
          readOnly
        />
      </div>

      {/* Fullname, Phone, Address */}
      {["fullname", "phone", "address"].map((f) => (
        <div className="mb-3" key={f}>
          <label>{f.charAt(0).toUpperCase() + f.slice(1)}</label>
          {f === "address" ? (
            <textarea
              className="form-control"
              rows={3}
              name={f}
              value={formData[f]}
              onChange={handleChange}
            />
          ) : (
            <input
              type="text"
              className="form-control"
              name={f}
              value={formData[f]}
              onChange={handleChange}
            />
          )}
          {errors[f] && <small className="text-danger">{errors[f]}</small>}
        </div>
      ))}

      <div className="d-flex gap-2">
        <button type="submit" className="btn btn-primary">
          Cập nhật
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleCancel}
        >
          Hủy
        </button>
      </div>
    </form>
  );
}
