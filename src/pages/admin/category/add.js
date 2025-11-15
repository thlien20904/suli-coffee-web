import React, { useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { buildApiUrl } from "../../../utils/apiConfig";
import { useNavigate } from "react-router-dom";
import "../../../styles/components/admin/AddCategory.css";

const AddCategory = () => {
  const [categoryName, setCategoryName] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 👉 Validate trước khi gửi
    if (!categoryName.trim()) {
      Swal.fire("", "Tên danh mục không được để trống", "error");
      return;
    }

    try {
      const res = await axios.post(
        buildApiUrl("/api/admin/categories/add"),
        { CategoryName: categoryName },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (res.data.success) {
        Swal.fire({
          icon: "success",
          title: res.data.message || "Thêm danh mục thành công!",
          confirmButtonText: "OK",
          timer: 1000,
          timerProgressBar: true,
        }).then(() => {
          navigate("/admin/category");
        });
      } else {
        Swal.fire("", res.data.message || "Không thể thêm danh mục", "error");
      }
    } catch (err) {
      console.error("❌ Lỗi khi thêm:", err.response?.data || err);

      // 👉 Hiển thị thông báo lỗi cụ thể từ backend nếu có
      const errorMessage =
        err.response?.data?.message || "Đã xảy ra lỗi khi thêm danh mục.";

      Swal.fire("", errorMessage, "error");
    }
  };

  return (
    <div className="category-form-page">
      <div className="page-container">
        <h2>Thêm danh mục</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label style={{ color: "black" }}>Tên danh mục</label>
            <input
              type="text"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              style={{ color: "black" }}
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary">
              Lưu
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate("/admin/category")}
            >
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCategory;
