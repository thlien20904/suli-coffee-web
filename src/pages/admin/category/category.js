import React, { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { buildApiUrl } from "../../../utils/apiConfig";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { Link, useNavigate } from "react-router-dom";

import "../../../styles/components/admin/Food.css";

const Category = () => {
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [loadingId, setLoadingId] = useState(null);

  const navigate = useNavigate();

  // Fetch danh mục
  const fetchData = async () => {
    try {
      const res = await axios.get(buildApiUrl("/api/admin/categories"), {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setCategories(res.data.data || []);
    } catch (err) {
      console.error("Lỗi khi fetch categories:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Xóa category
  const deleteCategory = (id, name) => {
    Swal.fire({
      title: `Bạn có chắc chắn muốn xóa "${name}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Xóa",
      cancelButtonText: "Hủy",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          setLoadingId(id);

          const res = await axios.post(
            buildApiUrl("/api/admin/categories/delete"),
            { id },
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            }
          );

          if (res.data.success) {
            Swal.fire({
              icon: "success",
              title: res.data.message || `Đã xóa "${name}" thành công!`,
              showConfirmButton: true, // ✅ Có nút OK
              allowOutsideClick: false,
              timer: 1000, // ✅ Auto close sau 2s
              timerProgressBar: true,
            }).then(() => {
              fetchData(); // refresh danh sách
            });
          } else {
            Swal.fire(
              "",
              res.data.message || "Không thể xóa danh mục",
              "error"
            );
          }
        } catch (err) {
          Swal.fire(
            "",
            err.response?.data?.message || "Không thể xóa danh mục",
            "error"
          );
        } finally {
          setLoadingId(null);
        }
      }
    });
  };

  // Lọc theo search
  const filteredCategories = categories.filter((c) =>
    c.CategoryName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-container">
      <div className="top-bar">
        <input
          type="text"
          placeholder="Tìm kiếm..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Link to="/admin/category/add" className="btn-add">
          <i className="fas fa-plus"></i> Thêm danh mục
        </Link>
      </div>

      <table className="table category-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Tên danh mục</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {filteredCategories.length > 0 ? (
            filteredCategories.map((item) => (
              <tr key={item.CategoryId}>
                <td>{item.CategoryId}</td>
                <td>{item.CategoryName}</td>
                <td className="action-buttons">
                  <button
                    className="btn-edit"
                    onClick={() =>
                      navigate(`/admin/category/edit/${item.CategoryId}`)
                    }
                  >
                    <i className="fas fa-edit"></i>
                  </button>
                  <button
                    className="btn-delete"
                    onClick={() =>
                      deleteCategory(item.CategoryId, item.CategoryName)
                    }
                    disabled={loadingId === item.CategoryId}
                  >
                    {loadingId === item.CategoryId ? (
                      <i className="fas fa-spinner fa-spin"></i>
                    ) : (
                      <i className="fas fa-trash"></i>
                    )}
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="3" style={{ textAlign: "center" }}>
                Không có dữ liệu
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Category;
