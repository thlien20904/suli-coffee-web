import React, { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { Link, useNavigate } from "react-router-dom";
import { buildApiUrl } from "../../../utils/apiConfig";

import "../../../styles/components/admin/Food.css"; // Dùng lại style table chung

const Staff = () => {
  const [staffs, setStaffs] = useState([]);
  const [search, setSearch] = useState("");
  const [loadingId, setLoadingId] = useState(null);

  const navigate = useNavigate();

  // ================== Fetch danh sách staff ==================
  const fetchData = async () => {
    try {
      const res = await axios.get(buildApiUrl("/api/admin/staff"), {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setStaffs(res.data.data || []);
    } catch (err) {
      console.error("❌ Lỗi khi fetch staff:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ================== Xóa staff ==================
  const deleteStaff = (id, name) => {
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
            buildApiUrl("/api/admin/staff/delete"),
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
            }).then(() => fetchData());
          } else {
            Swal.fire(
              "",
              res.data.message || "Không thể xóa nhân viên",
              "error"
            );
          }
        } catch (err) {
          Swal.fire("", "Không thể kết nối server", "error");
        } finally {
          setLoadingId(null);
        }
      }
    });
  };

  // ================== Lọc search ==================
  const filteredStaff = staffs.filter((s) =>
    s.FullName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-container">
      <div className="top-bar">
        <input
          type="text"
          placeholder="Tìm kiếm nhân viên..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Link to="/admin/staff/add" className="btn-add">
          <i className="fas fa-plus"></i> Thêm nhân viên
        </Link>
      </div>

      <table className="table category-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Họ và tên</th>
            <th>Điện thoại</th>
            <th>Email</th>
            <th>Giới tính</th>
            <th>Ngày sinh</th>
            <th>Role</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {filteredStaff.length > 0 ? (
            filteredStaff.map((item) => (
              <tr key={item.StaffId}>
                <td>{item.StaffId}</td>
                <td>{item.FullName}</td>
                <td>{item.Phone || "-"}</td>
                <td>{item.Email || "-"}</td>
                <td>{item.Gender || "-"}</td>
                <td>
                  {item.DateOfBirth
                    ? new Date(item.DateOfBirth).toLocaleDateString("vi-VN")
                    : "-"}
                </td>
                <td>{item.Role?.RoleName || "-"}</td>
                <td className="action-buttons">
                  <button
                    className="btn-edit"
                    onClick={() =>
                      navigate(`/admin/staff/edit/${item.StaffId}`)
                    }
                  >
                    <i className="fas fa-edit"></i>
                  </button>
                  <button
                    className="btn-delete"
                    onClick={() => deleteStaff(item.StaffId, item.FullName)}
                    disabled={loadingId === item.StaffId}
                  >
                    {loadingId === item.StaffId ? (
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
              <td colSpan="9" style={{ textAlign: "center" }}>
                Không có dữ liệu
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Staff;
