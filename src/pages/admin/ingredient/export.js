import React, { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { FaFileExcel } from "react-icons/fa";
import { buildApiUrl } from "../../../utils/apiConfig";
import "../../../styles/components/admin/export.css";

const ExportIngredient = () => {
  const [ingredients, setIngredients] = useState([]);

  // Lấy danh sách nguyên liệu
  useEffect(() => {
    const fetchIngredients = async () => {
      try {
        const res = await axios.get(buildApiUrl("/api/admin/ingredients"));
        setIngredients(res.data.data || []);
      } catch (err) {
        console.error("❌ Lỗi khi tải nguyên liệu:", err);
        Swal.fire("", "Không thể tải danh sách nguyên liệu", "error");
      }
    };
    fetchIngredients();
  }, []);

  // Hàm export
  const handleExport = async () => {
    try {
      const res = await axios.get(buildApiUrl("/api/admin/export"), {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "NguyenLieu.xlsx");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("❌ Lỗi export:", err);
      Swal.fire("", "Không thể export Excel", "error");
    }
  };

  return (
    <div className="page-container">
      <h2>📦 Danh sách nguyên liệu</h2>
      <button className="btn-export" onClick={handleExport}>
        <FaFileExcel /> Xuất Excel
      </button>

      <table className="table ingredient-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Tên nguyên liệu</th>
            <th>Số lượng</th>
            <th>Phân loại</th>
            <th>Ngày cập nhật</th>
          </tr>
        </thead>
        <tbody>
          {ingredients.length > 0 ? (
            ingredients.map((item) => (
              <tr key={item.IngredientId}>
                <td>{item.IngredientId}</td>
                <td>{item.IngredientName}</td>
                <td>{item.SoLuong}</td>
                <td>{item.PhanLoai}</td>
                <td>
                  {item.LastUpdated
                    ? new Date(item.LastUpdated).toLocaleDateString("vi-VN")
                    : "Chưa cập nhật"}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5" style={{ textAlign: "center" }}>
                Không có dữ liệu
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ExportIngredient;
