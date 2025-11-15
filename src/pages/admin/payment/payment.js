import React, { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { Link, useNavigate } from "react-router-dom";
import { buildApiUrl } from "../../../utils/apiConfig";

import "../../../styles/components/admin/Food.css";

const Payment = () => {
  const [payments, setPayments] = useState([]);
  const [search, setSearch] = useState("");
  const [loadingId, setLoadingId] = useState(null);

  const navigate = useNavigate();

  // Fetch danh sách phương thức thanh toán
  const fetchData = async () => {
    try {
      const res = await axios.get(buildApiUrl("/api/admin/payment"), {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setPayments(res.data.data || []);
    } catch (err) {
      console.error("❌ Lỗi khi fetch payment:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Xóa payment
  const deletePayment = (id, name) => {
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
            buildApiUrl("/api/admin/payment/delete"),
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
              showConfirmButton: true,
              allowOutsideClick: false,
              timer: 1000,
              timerProgressBar: true,
            }).then(() => {
              fetchData(); // refresh danh sách
            });
          } else {
            Swal.fire("", res.data.message || "Không thể xóa", "error");
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
  const filteredPayments = payments.filter((p) =>
    p.TenPhuongThuc.toLowerCase().includes(search.toLowerCase())
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
        <Link to="/admin/payment/add" className="btn-add">
          <i className="fas fa-plus"></i> Thêm phương thức
        </Link>
      </div>

      <table className="table category-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Tên phương thức</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {filteredPayments.length > 0 ? (
            filteredPayments.map((item) => (
              <tr key={item.Id}>
                <td>{item.Id}</td>
                <td>{item.TenPhuongThuc}</td>
                <td className="action-buttons">
                  <button
                    className="btn-edit"
                    onClick={() => navigate(`/admin/payment/edit/${item.Id}`)}
                  >
                    <i className="fas fa-edit"></i>
                  </button>
                  <button
                    className="btn-delete"
                    onClick={() => deletePayment(item.Id, item.TenPhuongThuc)}
                    disabled={loadingId === item.Id}
                  >
                    {loadingId === item.Id ? (
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

export default Payment;
