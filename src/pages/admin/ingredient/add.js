import React, { useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { FaSave, FaTimes } from "react-icons/fa";
import "../../../styles/components/admin/AddIngredient.css";

const FormField = ({ label, error, children }) => (
  <div className={`form-group ${error ? "has-error" : ""}`}>
    <label>{label}</label>
    {children}
    {error && <small className="error-text">{error}</small>}
  </div>
);

const AddIngredient = () => {
  const [form, setForm] = useState({
    IngredientName: "",
    SoLuong: "",
    PhanLoai: "",
  });
  const [errors, setErrors] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState("/images/no-image.png");

  // ================= VALIDATE =================
  const rules = {
    IngredientName: (v) =>
      !v.trim() ? "Tên nguyên liệu không được để trống" : null,
    SoLuong: (v) =>
      v === "" || v === null
        ? "Số lượng không được để trống"
        : v <= 0
        ? "Số lượng phải lớn hơn 0"
        : null,
    PhanLoai: (v) => (!v.trim() ? "Phân loại không được để trống" : null),
    ImageFile: (v) => (!v ? "Bạn phải chọn ảnh nguyên liệu" : null),
  };

  const validateField = (name, value) => rules[name]?.(value) || null;

  const validateForm = () => {
    const newErrors = {};
    Object.keys(rules).forEach((key) => {
      let value = form[key];
      if (key === "ImageFile") value = imageFile; // validate ảnh riêng
      const msg = validateField(key, value);
      if (msg) newErrors[key] = msg;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ================= HANDLERS =================
  const handleBlur = (e) => {
    const { name, value } = e.target;
    setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowed = [
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/gif",
        "image/webp",
      ];
      if (!allowed.includes(file.type)) {
        Swal.fire(
          "",
          "Chỉ chấp nhận file ảnh (png, jpg, jpeg, gif, webp)",
          "error"
        );
        e.target.value = null;
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  // ================= SUBMIT =================
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      Swal.fire("", "Vui lòng kiểm tra lại các trường nhập!", "error");
      return;
    }

    const formData = new FormData();
    Object.keys(form).forEach((key) => {
      formData.append(key, form[key]);
    });
    if (imageFile) formData.append("ImageFile", imageFile);

    try {
      const res = await axios.post(
        "http://localhost:5000/api/admin/ingredients/add",
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (res.data.success) {
        Swal.fire({
          icon: "success",
          title: "Thêm nguyên liệu thành công!",
          showConfirmButton: true,
          timer: 1000,
        }).then(() => window.history.back());
      } else {
        Swal.fire(
          "",
          res.data.message || "Không thể thêm nguyên liệu",
          "error"
        );
      }
    } catch (err) {
      // Nếu server trả về lỗi hợp lệ
      if (err.response && err.response.data && err.response.data.message) {
        Swal.fire("", err.response.data.message, "error");
      } else {
        console.error("❌ Lỗi thêm nguyên liệu:", err);
        Swal.fire("", "Không thể kết nối server!", "error");
      }
    }
  };

  return (
    <div className="add-ingredient-page">
      <div className="page-container">
        <h2>➕ Thêm nguyên liệu</h2>
        <form onSubmit={handleSubmit} className="form-add">
          {/* IngredientName */}
          <FormField label="Tên nguyên liệu" error={errors.IngredientName}>
            <input
              type="text"
              name="IngredientName"
              value={form.IngredientName}
              onChange={handleChange}
              onBlur={handleBlur}
              className={errors.IngredientName ? "input-error" : ""}
            />
          </FormField>

          {/* SoLuong */}
          <FormField label="Số lượng" error={errors.SoLuong}>
            <input
              type="number"
              name="SoLuong"
              value={form.SoLuong}
              onChange={handleChange}
              onBlur={handleBlur}
              className={errors.SoLuong ? "input-error" : ""}
              min="0"
            />
          </FormField>

          {/* PhanLoai */}
          <FormField label="Phân loại" error={errors.PhanLoai}>
            <input
              type="text"
              name="PhanLoai"
              value={form.PhanLoai}
              onChange={handleChange}
              onBlur={handleBlur}
              className={errors.PhanLoai ? "input-error" : ""}
            />
          </FormField>

          {/* Image */}
          <FormField label="Ảnh nguyên liệu" error={errors.ImageFile}>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.gif,.webp"
              onChange={handleImageChange}
              className={errors.ImageFile ? "input-error" : ""}
            />
            <img src={preview} alt="Preview" className="preview-img" />
          </FormField>

          {/* Actions */}
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

export default AddIngredient;
