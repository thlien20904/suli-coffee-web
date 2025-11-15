import React, { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { Link, useNavigate } from "react-router-dom";
import { buildApiUrl } from "../../../utils/apiConfig";

import "../../../styles/components/admin/Food.css";

const Ingredient = () => {
  const [ingredients, setIngredients] = useState([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingId, setLoadingId] = useState(null);
  const itemsPerPage = 10;

  const navigate = useNavigate();

  // Fetch nguyên liệu
  const fetchData = async () => {
    try {
      const res = await axios.get(buildApiUrl("/api/admin/ingredients"), {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        params: { limit: 1000 },
      });
      setIngredients(res.data.data || []);
    } catch (err) {
      console.error("❌ Lỗi khi fetch ingredients:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Xóa nguyên liệu
  const deleteIngredient = (id, name) => {
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
          await axios.post(
            buildApiUrl("/api/admin/ingredients/delete"),
            { id },
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            }
          );

          Swal.fire({
            icon: "success",
            title: "Đã xóa thành công!",
            confirmButtonText: "OK",
            timer: 1000,
            timerProgressBar: true,
          }).then(() => {
            fetchData(); // load lại bảng sau khi bấm OK hoặc khi tự đóng
          });
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

  // Lọc dữ liệu theo search
  const filteredIngredients = ingredients.filter((ing) =>
    ing.IngredientName.toLowerCase().includes(search.toLowerCase())
  );

  // Phân trang
  const totalPages = Math.ceil(filteredIngredients.length / itemsPerPage);
  const paginatedIngredients = filteredIngredients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const changePage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="page-container">
      <div className="top-bar">
        <input
          type="text"
          placeholder="Tìm kiếm nguyên liệu..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
        />
        <Link to="/admin/ingredient/add" className="btn-add">
          <i className="fas fa-plus"></i> Thêm nguyên liệu
        </Link>
      </div>

      <table className="table ingredient-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Tên nguyên liệu</th>
            <th>Ảnh</th>
            <th>Số lượng</th>
            <th>Phân loại</th>
            <th>Ngày cập nhật</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {paginatedIngredients.length > 0 ? (
            paginatedIngredients.map((item) => (
              <tr key={item.IngredientId}>
                <td>{item.IngredientId}</td>
                <td>{item.IngredientName}</td>
                <td>
                  <img
                    src={item.ImageURL ? item.ImageURL : "/images/no-image.png"}
                    alt={item.IngredientName}
                    width={80}
                    height={80}
                    style={{ borderRadius: "5px", objectFit: "cover" }}
                  />
                </td>
                <td>{item.SoLuong ?? 0}</td>
                <td>{item.PhanLoai || "Không có"}</td>
                <td>
                  {item.LastUpdated
                    ? new Date(item.LastUpdated).toLocaleDateString()
                    : "Chưa cập nhật"}
                </td>
                <td className="action-buttons">
                  <button
                    className="btn-edit"
                    onClick={() =>
                      navigate(`/admin/ingredient/edit/${item.IngredientId}`)
                    }
                  >
                    <i className="fas fa-edit"></i>
                  </button>
                  <button
                    className="btn-delete"
                    onClick={() =>
                      deleteIngredient(item.IngredientId, item.IngredientName)
                    }
                    disabled={loadingId === item.IngredientId}
                  >
                    {loadingId === item.IngredientId ? (
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
              <td colSpan="7" style={{ textAlign: "center" }}>
                Không có dữ liệu
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="pagination">
        <button
          onClick={() => changePage(currentPage - 1)}
          disabled={currentPage === 1}
        >
          &lt; Trước
        </button>
        {[...Array(totalPages)].map((_, i) => (
          <button
            key={i}
            className={currentPage === i + 1 ? "active" : ""}
            onClick={() => changePage(i + 1)}
          >
            {i + 1}
          </button>
        ))}
        <button
          onClick={() => changePage(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Sau &gt;
        </button>
      </div>
    </div>
  );
};

export default Ingredient;
