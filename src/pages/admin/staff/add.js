import React, { useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { FaSave, FaTimes } from "react-icons/fa";
import "../../../styles/components/admin/AddFood.css"; // reuse CSS form

const FormField = ({ label, error, children }) => (
  <div className={`form-group ${error ? "has-error" : ""}`}>
    <label>{label}</label>
    {children}
    {error && <small className="error-text">{error}</small>}
  </div>
);

const AddStaff = () => {
  const [form, setForm] = useState({
    FullName: "",
    Phone: "",
    DateOfBirth: "",
    Email: "",
    Gender: "",
    RoleId: "", // Giữ Role để phân quyền
  });
  const [errors, setErrors] = useState({});
  const [roles, setRoles] = useState([]);

  // ===== Lấy danh sách vai trò =====
  React.useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(buildApiUrl("/api/admin/roles"), {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (res.data.success) setRoles(res.data.data || []);
      } catch (err) {
        console.error("❌ Lỗi load roles:", err);
      }
    })();
  }, []);

  // ===== Validate =====
  const rules = {
    FullName: (v) =>
      !v.trim()
        ? "Họ tên không được để trống"
        : v.trim().length < 3
        ? "Họ tên phải từ 3 ký tự trở lên"
        : null,
    Phone: (v) =>
      !v
        ? "Số điện thoại không được để trống"
        : !/^(0|\+84)(\d{9})$/.test(v)
        ? "Số điện thoại không hợp lệ"
        : null,
    DateOfBirth: (v) => {
      if (!v) return "Ngày sinh không được để trống";
      const dob = new Date(v);
      const now = new Date();
      if (dob > now) return "Ngày sinh không được lớn hơn hiện tại";
      return null;
    },
    Email: (v) =>
      !v
        ? "Email không được để trống"
        : !/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v)
        ? "Email không hợp lệ"
        : null,
    Gender: (v) => (!v ? "Bạn phải chọn giới tính" : null),
    RoleId: (v) => (!v ? "Bạn phải chọn vai trò" : null),
  };

  const validateField = (name, value) => rules[name]?.(value) || null;

  const validateForm = () => {
    const newErr = {};
    Object.keys(rules).forEach((k) => {
      const msg = validateField(k, form[k]);
      if (msg) newErr[k] = msg;
    });
    setErrors(newErr);
    return Object.keys(newErr).length === 0;
  };

  // ===== Handlers =====
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      Swal.fire("", "Vui lòng kiểm tra lại các trường nhập!", "error");
      return;
    }

    try {
      const res = await axios.post(buildApiUrl("/api/admin/staff/add"), form, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      if (res.data.success) {
        Swal.fire({
          icon: "success",
          title: "Thêm nhân viên thành công!",
          timer: 1000,
          timerProgressBar: true,
        }).then(() => window.history.back());
      } else {
        Swal.fire("", res.data.message || "Không thể thêm nhân viên", "error");
      }
    } catch (err) {
      console.error("❌ Lỗi thêm staff:", err);
      Swal.fire("", "Không thể kết nối server!", "error");
    }
  };

  return (
    <div className="add-food-page">
      <div className="page-container">
        <h2>➕ Thêm nhân viên</h2>
        <form onSubmit={handleSubmit} className="form-add">
          <FormField label="Họ tên" error={errors.FullName}>
            <input
              name="FullName"
              value={form.FullName}
              onChange={handleChange}
              onBlur={handleBlur}
            />
          </FormField>

          <FormField label="Số điện thoại" error={errors.Phone}>
            <input
              name="Phone"
              value={form.Phone}
              onChange={handleChange}
              onBlur={handleBlur}
            />
          </FormField>

          <FormField label="Ngày sinh" error={errors.DateOfBirth}>
            <input
              type="date"
              name="DateOfBirth"
              value={form.DateOfBirth}
              onChange={handleChange}
              onBlur={handleBlur}
            />
          </FormField>

          <FormField label="Email" error={errors.Email}>
            <input
              type="email"
              name="Email"
              value={form.Email}
              onChange={handleChange}
              onBlur={handleBlur}
            />
          </FormField>

          <FormField label="Giới tính" error={errors.Gender}>
            <select
              name="Gender"
              value={form.Gender}
              onChange={handleChange}
              onBlur={handleBlur}
            >
              <option value="">-- Chọn giới tính --</option>
              <option value="Nam">Nam</option>
              <option value="Nữ">Nữ</option>
            </select>
          </FormField>

          <FormField label="Vai trò" error={errors.RoleId}>
            <select
              name="RoleId"
              value={form.RoleId}
              onChange={handleChange}
              onBlur={handleBlur}
            >
              <option value="">-- Chọn vai trò --</option>
              {roles.map((r) => (
                <option key={r.RoleId} value={r.RoleId}>
                  {r.RoleName}
                </option>
              ))}
            </select>
          </FormField>

          <div className="form-actions">
            <button type="submit" className="btn-primary">
              <FaSave /> Lưu
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => window.history.back()}
            >
              <FaTimes /> Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddStaff;
