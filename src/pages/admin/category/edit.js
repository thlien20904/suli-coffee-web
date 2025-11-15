import React, { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { useNavigate, useParams } from "react-router-dom";
import { buildApiUrl } from "../../../utils/apiConfig";
import "../../../styles/components/admin/AddCategory.css";

const CategoryEdit = () => {
  const { id } = useParams();
  const [name, setName] = useState("");
  const navigate = useNavigate();

  // 📦 Lấy thông tin danh mục
  useEffect(() => {
    const fetchCategory = async () => {
      try {
        const res = await axios.get(
          buildApiUrl(`/api/admin/categories/edit/${id}`),
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        if (res.data.success && res.data.data) {
          setName(res.data.data.CategoryName);
        } else {
          Swal.fire("", "Không tìm thấy danh mục", "error");
          navigate("/admin/category");
        }
      } catch (err) {
        console.error("❌ Fetch category error:", err.response?.data || err);
        Swal.fire(
          "",
          err.response?.data?.message || "Không thể kết nối server",
          "error"
        );
      }
    };
    fetchCategory();
  }, [id, navigate]);

  // ✏️ Cập nhật danh mục
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      return Swal.fire("", "Tên danh mục không được để trống", "error");
    }

    try {
      const res = await axios.post(
        buildApiUrl(`/api/admin/categories/edit/${id}`),
        { CategoryName: name },
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
          title: res.data.message || "Cập nhật thành công!",
          confirmButtonText: "OK",
          timer: 1000,
          timerProgressBar: true,
        }).then(() => {
          navigate("/admin/category");
        });
      } else {
        Swal.fire("", res.data.message || "Không thể cập nhật", "error");
      }
    } catch (err) {
      console.error("❌ Update category error:", err.response?.data || err);

      // 👉 Lấy message cụ thể từ backend (nếu có)
      const errorMessage =
        err.response?.data?.message || "Đã xảy ra lỗi khi cập nhật danh mục.";

      Swal.fire("", errorMessage, "error");
    }
  };

  return (
    <div className="category-form-page">
      <div className="page-container">
        <h2>Sửa danh mục</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Tên danh mục:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nhập tên danh mục"
              style={{ color: "black" }}
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary">
              Cập nhật
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

export default CategoryEdit;
