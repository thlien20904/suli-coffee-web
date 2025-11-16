import React, { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { FaSave, FaTimes } from "react-icons/fa";
import { buildApiUrl } from "../../../utils/apiConfig";
import "../../../styles/components/admin/AddFood.css";

const FormField = ({ label, error, children }) => (
  <div className={`form-group ${error ? "has-error" : ""}`}>
    <label>{label}</label>
    {children}
    {error && <small className="error-text">{error}</small>}
  </div>
);

const AddFood = () => {
  const [categories, setCategories] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [form, setForm] = useState({
    FoodName: "",
    CategoryId: "",
    Ingredients: [],
    Price: "",
    Discount: 0,
    Stock: "",
    Description: "",
    Status: true,
    UpdatedDate: new Date().toISOString().split("T")[0],
  });
  const [errors, setErrors] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState("/images/no-image.png");

  // ================= FETCH =================
  useEffect(() => {
    (async () => {
      try {
        const [catRes, ingRes] = await Promise.all([
          axios.get(buildApiUrl("/api/admin/categories")),
          axios.get(buildApiUrl("/api/admin/ingredients")),
        ]);
        setCategories(catRes.data.data || []);
        setIngredients(ingRes.data.data || []);
      } catch (err) {
        console.error("❌ Lỗi load categories/ingredients:", err);
      }
    })();
  }, []);

  // ================= VALIDATE =================
  const rules = {
    FoodName: (v) => (!v.trim() ? "Tên món ăn không được để trống" : null),
    CategoryId: (v) => (!v ? "Bạn phải chọn loại" : null),
    Price: (v) => (!v || v <= 0 ? "Giá phải lớn hơn 0" : null),
    Discount: (v) => (v < 0 || v > 100 ? "Giảm giá phải từ 0 đến 100%" : null),
    Stock: (v) =>
      v === "" || v === null
        ? "Số lượng tồn không được để trống"
        : v < 0
        ? "Số lượng tồn không được âm"
        : null,
    Description: (v) =>
      !v.trim() || v.length < 10 ? "Mô tả phải có ít nhất 10 ký tự" : null,
    Ingredients: (v) =>
      !v || v.length === 0 ? "Bạn phải chọn ít nhất 1 nguyên liệu" : null,
    ImageFile: (v) => (!v ? "Bạn phải chọn ảnh món ăn" : null),
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
    let processedValue = value;

    // Xử lý format tiền cho Price
    if (name === "Price") {
      const numericValue = value.replace(/[^0-9]/g, "");
      if (numericValue) {
        processedValue = parseInt(numericValue).toLocaleString("vi-VN");
      } else {
        processedValue = "";
      }
    }

    const newForm = { ...form, [name]: processedValue };
    setForm(newForm);

    // validate realtime cho Stock
    if (name === "Stock") {
      setErrors((prev) => ({
        ...prev,
        Stock: validateField("Stock", value),
      }));
    }
  };

  const handleIngredientSelect = (e) => {
    const selectedId = parseInt(e.target.value, 10);
    if (selectedId && !form.Ingredients.includes(selectedId)) {
      setForm({ ...form, Ingredients: [...form.Ingredients, selectedId] });
    }
    e.target.value = "";
  };

  const removeIngredient = (id) =>
    setForm({
      ...form,
      Ingredients: form.Ingredients.filter((ing) => ing !== id),
    });

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
      let value = form[key];
      // Chuyển Price về số trước khi gửi
      if (key === "Price") {
        value = parseInt(value.replace(/[^0-9]/g, "")) || 0;
      }
      formData.append(
        key,
        key === "Ingredients" ? JSON.stringify(form[key]) : value
      );
    });
    if (imageFile) formData.append("ImageFile", imageFile);

    try {
      const res = await axios.post(
        buildApiUrl("/api/admin/foods/add"),
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
          title: "Thêm món ăn thành công!",
          showConfirmButton: true,
          timer: 1000,
        }).then(() => window.history.back()); // quay lại trang trước
      } else {
        // Xử lý response không success (status 200 nhưng data.success=false, hiếm xảy ra)
        Swal.fire("", res.data.message || "Không thể thêm món ăn", "error");
      }
    } catch (err) {
      console.error("❌ Lỗi thêm món ăn:", err);

      // ← FIX CHÍNH: Xử lý lỗi từ backend (400, 401, etc.)
      if (err.response) {
        const { status, data } = err.response;
        const errorMsg = data?.message || "Lỗi không xác định từ server";

        if (status === 400) {
          // Lỗi validation/duplicate từ backend (ví dụ: tên trùng)
          Swal.fire("", errorMsg, "error");

          // Bonus: Set error cho field cụ thể nếu backend chỉ rõ (ví dụ: nếu message chứa "Tên món ăn")
          if (errorMsg.includes("Tên món ăn")) {
            setErrors((prev) => ({ ...prev, FoodName: errorMsg }));
          }
        } else if (status === 401) {
          Swal.fire(
            "",
            "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!",
            "warning"
          );
          // Có thể redirect login: window.location.href = "/login";
        } else if (status >= 500) {
          Swal.fire("", "Lỗi server. Vui lòng thử lại sau!", "error");
        } else {
          Swal.fire("", errorMsg, "error");
        }
      } else if (err.request) {
        // Không kết nối được server (network error)
        Swal.fire("", "Không thể kết nối server! Kiểm tra mạng.", "error");
      } else {
        // Lỗi khác (config axios)
        Swal.fire("", "Đã xảy ra lỗi không mong muốn!", "error");
      }
    }
  };

  // ================= FIELDS CONFIG =================
  const fields = [
    { name: "FoodName", label: "Tên món", type: "text" },
    { name: "Price", label: "Giá", type: "text" },
    {
      name: "Discount",
      label: "Giảm giá (%)",
      type: "number",
      min: 0,
      max: 100,
    },
    { name: "Stock", label: "Số lượng tồn", type: "number", min: 0 },
  ];

  return (
    <div className="add-food-page">
      <div className="page-container">
        <h2>➕ Thêm món ăn</h2>
        <form onSubmit={handleSubmit} className="form-add">
          {/* input text/number (map fields) */}
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

          {/* category */}
          <FormField label="Loại" error={errors.CategoryId}>
            <select
              name="CategoryId"
              value={form.CategoryId}
              onChange={handleChange}
              onBlur={handleBlur}
              className={errors.CategoryId ? "input-error" : ""}
            >
              <option value="">-- Chọn loại --</option>
              {categories.map((c) => (
                <option key={c.CategoryId} value={c.CategoryId}>
                  {c.CategoryName}
                </option>
              ))}
            </select>
          </FormField>

          {/* ingredients */}
          <FormField label="Nguyên liệu" error={errors.Ingredients}>
            <select onChange={handleIngredientSelect}>
              <option value="">-- Chọn nguyên liệu --</option>
              {ingredients.map((i) => (
                <option key={i.IngredientId} value={i.IngredientId}>
                  {i.IngredientName}
                </option>
              ))}
            </select>
            <div className="chips-container">
              {form.Ingredients.map((id) => {
                const ing = ingredients.find((i) => i.IngredientId === id);
                return (
                  <span key={id} className="chip">
                    {ing?.IngredientName || "??"}
                    <button
                      type="button"
                      className="chip-remove"
                      onClick={() => removeIngredient(id)}
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
          </FormField>

          {/* description */}
          <FormField label="Mô tả" error={errors.Description}>
            <textarea
              name="Description"
              value={form.Description}
              onChange={handleChange}
              onBlur={handleBlur}
              className={errors.Description ? "input-error" : ""}
            />
          </FormField>

          {/* image */}
          <FormField label="Ảnh món ăn" error={errors.ImageFile}>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.gif,.webp"
              onChange={handleImageChange}
              className={errors.ImageFile ? "input-error" : ""}
            />
            <img src={preview} alt="Preview" className="preview-img" />
          </FormField>

          {/* status */}
          <FormField label="Trạng thái">
            <select
              name="Status"
              value={form.Status}
              onChange={(e) =>
                setForm({ ...form, Status: e.target.value === "true" })
              }
            >
              <option value="true">Còn bán</option>
              <option value="false">Ngừng bán</option>
            </select>
          </FormField>

          {/* actions */}
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

export default AddFood;
