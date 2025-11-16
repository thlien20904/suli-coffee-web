import React, { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { Link, useNavigate } from "react-router-dom";
import { buildApiUrl } from "../../../utils/apiConfig";

import "../../../styles/components/admin/Food.css";

const Food = () => {
  const [foods, setFoods] = useState([]);
  const [search, setSearch] = useState("");
  const [sortAsc, setSortAsc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingId, setLoadingId] = useState(null); // ✅ id món đang xóa
  const itemsPerPage = 10;

  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const res = await axios.get(buildApiUrl("/api/admin/foods"), {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        params: { limit: 1000 },
      });
      setFoods(res.data.data);
    } catch (err) {
      console.error("Lỗi khi fetch foods:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Xóa món ăn
  const deleteFood = (id, name) => {
    Swal.fire({
      title: `Bạn có chắc chắn xóa ${name}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Xóa",
      cancelButtonText: "Hủy",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          setLoadingId(id); // ✅ bật loading cho món này
          await axios.post(
            buildApiUrl("/api/admin/foods/delete"),
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
            showConfirmButton: false,
            timer: 1000,
            timerProgressBar: true,
            didClose: () => {
              fetchData(); // ✅ refresh sau khi Swal biến mất
            },
          });
        } catch (err) {
          Swal.fire(
            "",
            err.response?.data?.message || "Không thể xóa danh mục",
            "error"
          );
        } finally {
          setLoadingId(null); // ✅ tắt loading
        }
      }
    });
  };

  // Lọc & sort
  const filteredFoods = [...foods]
    .filter((f) => f.FoodName.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortAsc === null) return b.FoodId - a.FoodId;
      return sortAsc ? a.Price - b.Price : b.Price - a.Price;
    });

  // Phân trang
  const totalPages = Math.ceil(filteredFoods.length / itemsPerPage);
  const paginatedFoods = filteredFoods.slice(
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
          placeholder="Tìm kiếm..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
        />
        <button
          className="btn-sort"
          onClick={() => setSortAsc(sortAsc === true ? false : true)}
          disabled={search !== ""}
        >
          Giá {sortAsc === true ? "↓" : sortAsc === false ? "↑" : ""}
        </button>
        <Link to="/admin/food/add" className="btn-add">
          <i className="fas fa-plus"></i> Thêm món
        </Link>
      </div>

      <table className="table category-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Tên món</th>
            <th>Loại</th>
            <th>Hình ảnh</th>
            <th>Nguyên liệu</th>
            <th>Giá</th>
            <th>Giảm giá (%)</th>
            <th>Trạng thái</th>
            <th>Ngày cập nhật</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {paginatedFoods.map((item) => (
            <tr key={item.FoodId}>
              <td>{item.FoodId}</td>
              <td>{item.FoodName}</td>
              <td>{item.Category?.CategoryName || "Không có"}</td>
              <td>
                <img
                  src={item.ImageURL ? item.ImageURL : "/images/no-image.png"}
                  alt={item.FoodName}
                  width={80}
                  height={80}
                  style={{ borderRadius: "5px", objectFit: "cover" }}
                />
              </td>
              <td>
                {item.Ingredients?.length
                  ? item.Ingredients.join(", ")
                  : "Không có"}
              </td>

              <td>{Math.round(item.Price).toLocaleString("vi-VN")} ₫</td>
              <td>{item.Discount}</td>
              <td>{item.Status ? "Còn bán" : "Ngừng bán"}</td>
              <td>
                {item.UpdatedDate
                  ? new Date(item.UpdatedDate).toLocaleDateString()
                  : "Chưa cập nhật"}
              </td>
              <td className="action-buttons">
                <button
                  className="btn-edit"
                  onClick={() => navigate(`/admin/food/edit/${item.FoodId}`)}
                >
                  <i className="fas fa-edit"></i>
                </button>
                <button
                  className="btn-delete"
                  onClick={() => deleteFood(item.FoodId, item.FoodName)}
                  disabled={loadingId === item.FoodId} // ✅ disable khi đang xóa
                >
                  {loadingId === item.FoodId ? (
                    <i className="fas fa-spinner fa-spin"></i>
                  ) : (
                    <i className="fas fa-trash"></i>
                  )}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

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

export default Food;
