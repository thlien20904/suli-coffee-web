import React, { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { FaSave, FaTimes } from "react-icons/fa";
import { useParams } from "react-router-dom";
import "../../../styles/components/admin/AddIngredient.css"; // có thể tách css riêng

const FormField = ({ label, error, children }) => (
  <div className={`form-group ${error ? "has-error" : ""}`}>
    <label>{label}</label>
    {children}
    {error && <small className="error-text">{error}</small>}
  </div>
);

const EditIngredient = () => {
  const { id } = useParams();
  const [form, setForm] = useState({
    IngredientName: "",
    SoLuong: 0,
    PhanLoai: "",
    LastUpdated: new Date().toISOString().split("T")[0],
  });
  const [errors, setErrors] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState("/images/no-image.png");

  // ================= FETCH =================
  useEffect(() => {
    (async () => {
      try {
        if (!id) {
          Swal.fire("", "ID nguyên liệu không hợp lệ", "error");
          return;
        }

        const res = await axios.get(
          `http://localhost:5000/api/admin/ingredients/${id}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        const ing = res.data.ingredient;
        setForm({
          IngredientName: ing.IngredientName || "",
          SoLuong: ing.SoLuong || 0,
          PhanLoai: ing.PhanLoai || "",
          LastUpdated: new Date(ing.LastUpdated).toISOString().split("T")[0],
        });
        setPreview(ing.ImageURL || "/images/no-image.png");
      } catch (err) {
        console.error("❌ Lỗi load nguyên liệu:", err);
        Swal.fire("", "Không thể tải thông tin nguyên liệu", "error");
      }
    })();
  }, [id]);

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
    ImageFile: (v) =>
      v === null ? null : !v ? "Bạn phải chọn ảnh nguyên liệu" : null,
  };

  const validateField = (name, value) => rules[name]?.(value) || null;

  const validateForm = () => {
    const newErrors = {};
    Object.keys(rules).forEach((key) => {
      let value = form[key];
      if (key === "ImageFile") value = imageFile;
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

    if (name === "SoLuong") {
      setErrors((prev) => ({
        ...prev,
        SoLuong: validateField("SoLuong", value),
      }));
    }
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
        `http://localhost:5000/api/admin/ingredients/edit/${id}`,
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
          title: "Cập nhật nguyên liệu thành công!",
          showConfirmButton: true,
          timer: 1000,
        }).then(() => window.history.back());
      } else {
        // nếu backend trả 200 nhưng success = false
        Swal.fire(
          "",
          res.data.message || "Không thể cập nhật nguyên liệu",
          "error"
        );
      }
    } catch (err) {
      console.error("❌ Lỗi cập nhật nguyên liệu:", err);

      // Lấy message backend nếu có
      const msg = err.response?.data?.message || "Không thể kết nối server!";
      Swal.fire("", msg, "error");
    }
  };

  return (
    <div className="add-food-page">
      <div className="page-container">
        <h2>✏️ Cập nhật nguyên liệu</h2>
        <form onSubmit={handleSubmit} className="form-add">
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

          <FormField label="Số lượng" error={errors.SoLuong}>
            <input
              type="number"
              name="SoLuong"
              value={form.SoLuong}
              onChange={handleChange}
              onBlur={handleBlur}
              min="0"
              className={errors.SoLuong ? "input-error" : ""}
            />
          </FormField>

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

          <FormField label="Ảnh nguyên liệu" error={errors.ImageFile}>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.gif,.webp"
              onChange={handleImageChange}
              className={errors.ImageFile ? "input-error" : ""}
            />
            <img src={preview} alt="Preview" className="preview-img" />
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

export default EditIngredient;
