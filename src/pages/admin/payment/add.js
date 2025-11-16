import React, { useState } from "react";
import axios from "axios";
import { buildApiUrl } from "../../../utils/apiConfig"; // ✅ Đã có, giữ nguyên
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import "../../../styles/components/admin/AddCategory.css";

const AddPayment = () => {
  const [name, setName] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      Swal.fire("", "Tên phương thức không được để trống.", "error");
      return;
    }

    try {
      const res = await axios.post(
        buildApiUrl("/api/admin/payment/add"),
        { TenPhuongThuc: name.trim() },
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
          title: res.data.message || "Thêm phương thức thành công!",
          confirmButtonText: "OK",
          timer: 1000,
          timerProgressBar: true,
        }).then(() => {
          navigate("/admin/payment");
        });
      } else {
        Swal.fire("", res.data.message || "Không thể thêm.", "error");
      }
    } catch (err) {
      console.error("❌ Lỗi khi thêm:", err.response || err);
      const msg = err.response?.data?.message || "Không thể thêm phương thức thanh toán.";
      Swal.fire("", msg, "error"); // ✅ FIX: Hiển thị message backend rõ ràng (e.g., "Tên phương thức đã tồn tại.")
    }
  };

  return (
    <div className="category-form-page">
      <div className="page-container">
        <h2>Thêm phương thức thanh toán</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label style={{ color: "black" }}>Tên phương thức</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
              onClick={() => navigate("/admin/payment")}
            >
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPayment;