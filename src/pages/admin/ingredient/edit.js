import React, { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { FaSave, FaTimes } from "react-icons/fa";
import { useParams } from "react-router-dom";
import { buildApiUrl } from "../../../utils/apiConfig";
import "../../../styles/components/admin/AddIngredient.css"; // Có thể tách css riêng

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

        // ✅ BỎ: Fetch foods (không cần nữa)
        const ingRes = await axios.get(
          buildApiUrl(`/api/admin/ingredients/${id}`),
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        // ✅ FIX: Kiểm tra response structure (hỗ trợ cả data và ingredient để tương thích old backend)
        let ing;
        if (ingRes.data.data) {
          // New backend
          ing = ingRes.data.data;
        } else if (ingRes.data.ingredient) {
          // Old backend
          ing = ingRes.data.ingredient;
        } else {
          throw new Error("Dữ liệu nguyên liệu không hợp lệ");
        }

        // ✅ FIX: Kiểm tra ing tồn tại trước khi access properties
        if (!ing) {
          throw new Error("Không tìm thấy nguyên liệu");
        }

        setForm({
          IngredientName: ing.IngredientName || "",
          SoLuong: ing.SoLuong || 0,
          PhanLoai: ing.PhanLoai || "Khác",
          // ✅ BỎ: Foods (không load nữa)
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
    // ✅ BỎ: rules Foods
    ImageFile: (v) =>
      v === null ? null : !v ? "Bạn phải chọn ảnh nguyên liệu" : null,
  };

  const validateField = (name, value) => rules[name]?.(value) || null;

  const validateForm = () => {
    const newErrors = {};
    Object.keys(rules).forEach((key) => {
      let value = form[key];
      if (key === "ImageFile") value = imageFile;
      // ✅ BỎ: Foods validate
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

  // ✅ BỎ: handleFoodSelect, removeFood

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
      // ✅ BỎ: Foods append (không gửi nữa, backend sẽ xóa hết FoodIngredient cũ nếu không gửi)
      formData.append(key, form[key]);
    });
    if (imageFile) formData.append("ImageFile", imageFile);

    try {
      const res = await axios.post(
        buildApiUrl(`/api/admin/ingredients/edit/${id}`),
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
        Swal.fire(
          "",
          res.data.message || "Không thể cập nhật nguyên liệu",
          "error"
        );
      }
    } catch (err) {
      console.error("❌ Lỗi cập nhật nguyên liệu:", err);

      if (err.response) {
        const { status, data } = err.response;
        const errorMsg = data?.message || "Lỗi không xác định từ server";

        if (status === 400) {
          Swal.fire("", errorMsg, "error");
          if (errorMsg.includes("Tên nguyên liệu")) {
            setErrors((prev) => ({ ...prev, IngredientName: errorMsg }));
          }
        } else if (status === 401) {
          Swal.fire(
            "",
            "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!",
            "warning"
          );
        } else if (status >= 500) {
          Swal.fire("", "Lỗi server. Vui lòng thử lại sau!", "error");
        } else {
          Swal.fire("", errorMsg, "error");
        }
      } else if (err.request) {
        Swal.fire("", "Không thể kết nối server! Kiểm tra mạng.", "error");
      } else {
        Swal.fire("", "Đã xảy ra lỗi không mong muốn!", "error");
      }
    }
  };

  // ================= FIELDS CONFIG =================
  const fields = [
    { name: "IngredientName", label: "Tên nguyên liệu", type: "text" },
    { name: "SoLuong", label: "Số lượng", type: "number", min: 1 },
    { name: "PhanLoai", label: "Phân loại", type: "text" },
  ];

  return (
    <div className="add-food-page">
      <div className="page-container">
        <h2>✏️ Cập nhật nguyên liệu</h2>
        <form onSubmit={handleSubmit} className="form-add">
          {fields.map((f) => (
            <FormField key={f.name} label={f.label} error={errors[f.name]}>
              <input
                {...f}
                name={f.name}
                value={form[f.name]}
                onChange={handleChange}
                onBlur={handleBlur}
                className={errors[f.name] ? "input-error" : ""}
              />
            </FormField>
          ))}

          {/* ✅ BỎ: FormField "Món ăn sử dụng" và chips */}

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
