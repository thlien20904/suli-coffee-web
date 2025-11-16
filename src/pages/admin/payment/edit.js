import React, { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { useNavigate, useParams } from "react-router-dom";
import { buildApiUrl } from "../../../utils/apiConfig"; // ✅ FIX: Import buildApiUrl
import "../../../styles/components/admin/AddCategory.css";

const EditPayment = () => {
  const { id } = useParams();
  const [name, setName] = useState("");
  const navigate = useNavigate();

  // Lấy thông tin payment theo ID
  useEffect(() => {
    const fetchPayment = async () => {
      if (!id || isNaN(id)) {
        Swal.fire("", "ID phương thức không hợp lệ.", "error");
        navigate("/admin/payment");
        return;
      }

      try {
        const res = await axios.get(
          buildApiUrl(`/api/admin/payment/${id}`), // ✅ Giữ URL chuẩn (getById)
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        if (res.data.success && res.data.data) {
          setName(res.data.data.TenPhuongThuc || "");
        } else {
          Swal.fire("", "Không tìm thấy phương thức.", "error");
          navigate("/admin/payment");
        }
      } catch (err) {
        console.error("❌ Fetch payment error:", err);
        let msg = "Không thể kết nối server.";
        if (err.response?.status === 404) {
          msg = "Không tìm thấy phương thức với ID này."; // ✅ FIX: Handle 404 rõ ràng
        } else if (err.response?.data?.message) {
          msg = err.response.data.message;
        }
        Swal.fire("", msg, "error").then(() => navigate("/admin/payment"));
      }
    };
    fetchPayment();
  }, [id, navigate]);

  // Cập nhật payment
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      return Swal.fire("", "Tên phương thức không được để trống.", "error");
    }

    try {
      const res = await axios.post(
        buildApiUrl(`/api/admin/payment/edit/${id}`),
        { TenPhuongThuc: name.trim() },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
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
          navigate("/admin/payment");
        });
      } else {
        Swal.fire("", res.data.message || "Không thể cập nhật.", "error");
      }
    } catch (err) {
      console.error("❌ Update payment error:", err);
      const msg = err.response?.data?.message || "Không thể kết nối server.";
      Swal.fire("", msg, "error");
    }
  };

  return (
    <div className="category-form-page">
      <div className="page-container">
        <h2>Sửa phương thức thanh toán</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Tên phương thức:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nhập tên phương thức"
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary">
              Cập nhật
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

export default EditPayment;