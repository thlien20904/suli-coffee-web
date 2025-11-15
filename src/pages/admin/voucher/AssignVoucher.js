import React, { useEffect, useState } from "react";
import axios from "axios";
import { buildApiUrl } from "../../../utils/apiConfig";
import Swal from "sweetalert2";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "../../../styles/components/admin/AssignVoucher.css";

const AssignVoucher = () => {
  const [users, setUsers] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [assigned, setAssigned] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedVoucher, setSelectedVoucher] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const API_USER = buildApiUrl("/api/admin/users");
  const API_VOUCHER = buildApiUrl("/api/admin/voucher");
  const API_ASSIGN = buildApiUrl("/api/admin/voucher/assign");
  const API_ASSIGNED = buildApiUrl("/api/admin/voucher/assigned");
  const API_ASSIGN_ALL = buildApiUrl("/api/admin/voucher/assign/all"); // ✅ thêm

  // ================== FETCH DATA ==================
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [userRes, voucherRes, assignedRes] = await Promise.all([
          axios.get(API_USER),
          axios.get(API_VOUCHER),
          axios.get(API_ASSIGNED),
        ]);

        setUsers(userRes.data.data || []);
        setVouchers(voucherRes.data.data || []);
        setAssigned(assignedRes.data.data || []);
      } catch (err) {
        console.error("❌ Lỗi tải dữ liệu:", err);
        Swal.fire("Lỗi", "Không thể tải dữ liệu từ server", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  // ================== REFRESH ASSIGNED ==================
  const refreshAssigned = async () => {
    try {
      const assignedRes = await axios.get(API_ASSIGNED);
      setAssigned(assignedRes.data.data || []);
    } catch (err) {
      console.error("❌ Lỗi refresh assigned:", err);
    }
  };

  // ================== CẤP CHO 1 USER ==================
  const handleAssign = async () => {
    if (!selectedUser || !selectedVoucher) {
      Swal.fire("Thiếu thông tin", "Vui lòng chọn user và voucher!", "warning");
      return;
    }

    try {
      const res = await axios.post(API_ASSIGN, {
        UserId: parseInt(selectedUser),
        VoucherId: parseInt(selectedVoucher),
      });

      if (res.data.success) {
        Swal.fire({
          icon: "success",
          title: "🎉 Thành công!",
          text: res.data.message,
          showConfirmButton: false,
          timer: 1200,
        });
        setSelectedUser("");
        setSelectedVoucher("");
        await refreshAssigned(); // ← THÊM: Refresh bảng realtime
      } else {
        Swal.fire(
          "Thông báo",
          res.data.message || "Không thể cấp voucher",
          "info"
        );
      }
    } catch (err) {
      console.error("❌ Lỗi khi cấp voucher:", err);

      // ← FIX CHÍNH: Xử lý lỗi backend (400: "Người dùng đã nhận", etc.)
      if (err.response) {
        const { status, data } = err.response;
        const errorMsg = data?.message || "Lỗi không xác định từ server";

        if (status === 400) {
          // Lỗi validate/duplicate (ví dụ: "Người dùng đã nhận voucher này")
          Swal.fire("Thông báo", errorMsg, "info"); // Dùng "info" cho non-error, hoặc "warning"
        } else if (status === 401) {
          Swal.fire(
            "Cảnh báo",
            "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!",
            "warning"
          );
        } else if (status >= 500) {
          Swal.fire("Lỗi", "Lỗi server. Vui lòng thử lại sau!", "error");
        } else {
          Swal.fire("Lỗi", errorMsg, "error");
        }
      } else if (err.request) {
        // Network error
        Swal.fire(
          "Lỗi",
          "Không thể kết nối đến server! Kiểm tra mạng.",
          "error"
        );
      } else {
        Swal.fire("Lỗi", "Đã xảy ra lỗi không mong muốn!", "error");
      }
    }
  };

  // ================== 🎯 CẤP CHO TẤT CẢ NGƯỜI DÙNG ==================
  const handleAssignAll = async () => {
    if (!selectedVoucher) {
      Swal.fire("Thiếu thông tin", "Vui lòng chọn voucher!", "warning");
      return;
    }

    Swal.fire({
      title: "Xác nhận?",
      text: "Bạn có chắc muốn cấp voucher này cho TẤT CẢ người dùng?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Có, cấp ngay!",
      cancelButtonText: "Hủy",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await axios.post(API_ASSIGN_ALL, {
            VoucherId: parseInt(selectedVoucher),
          });

          if (res.data.success) {
            Swal.fire({
              icon: "success",
              title: "🎁 Thành công!",
              text: res.data.message, // Ví dụ: "Đã gửi cho 3 users"
              showConfirmButton: false,
              timer: 1500,
            });
            setSelectedVoucher(""); // Reset select
            await refreshAssigned(); // ← THÊM: Refresh bảng
          } else {
            Swal.fire("Thông báo", res.data.message || "Không thể cấp", "info");
          }
        } catch (err) {
          console.error("❌ Lỗi khi cấp tất cả:", err);

          // ← FIX CHÍNH: Tương tự handleAssign
          if (err.response) {
            const { status, data } = err.response;
            const errorMsg = data?.message || "Lỗi không xác định từ server";

            if (status === 400) {
              Swal.fire("Thông báo", errorMsg, "info");
            } else if (status === 401) {
              Swal.fire(
                "Cảnh báo",
                "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!",
                "warning"
              );
            } else if (status >= 500) {
              Swal.fire("Lỗi", "Lỗi server. Vui lòng thử lại sau!", "error");
            } else {
              Swal.fire("Lỗi", errorMsg, "error");
            }
          } else if (err.request) {
            Swal.fire(
              "Lỗi",
              "Không thể kết nối đến server! Kiểm tra mạng.",
              "error"
            );
          } else {
            Swal.fire("Lỗi", "Đã xảy ra lỗi không mong muốn!", "error");
          }
        }
      }
    });
  };

  if (loading) return <p className="loading-text">⏳ Đang tải dữ liệu...</p>;

  // ================== UI ==================
  return (
    <div className="assign-container">
      <h3 className="assign-title">🎁 Cấp Voucher cho Người Dùng</h3>

      <div className="assign-card">
        <div className="form-group">
          <label>👤 Chọn User:</label>
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
          >
            <option value="">-- Chọn user --</option>
            {users.map((u) => (
              <option key={u.Id} value={u.Id}>
                {u.FullName} (ID: {u.Id})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>🎫 Chọn Voucher:</label>
          <select
            value={selectedVoucher}
            onChange={(e) => setSelectedVoucher(e.target.value)}
          >
            <option value="">-- Chọn voucher --</option>
            {vouchers.map((v) => (
              <option key={v.VoucherId} value={v.VoucherId}>
                {v.Code} - {v.Description}
              </option>
            ))}
          </select>
        </div>

        <div className="btn-group">
          <button className="btn-green" onClick={handleAssign}>
            <i className="fas fa-gift"></i> Cấp Voucher
          </button>

          <button className="btn-blue" onClick={handleAssignAll}>
            <i className="fas fa-users"></i> Cấp cho tất cả
          </button>
        </div>
      </div>

      {/* ================== BẢNG HIỂN THỊ VOUCHER ĐÃ CẤP ================== */}
      <h4 className="table-title">📋 Danh sách Voucher đã cấp</h4>

      {assigned.length === 0 ? (
        <p className="no-data">Chưa có voucher nào được cấp.</p>
      ) : (
        <>
          <div className="table-wrapper">
            <table className="assign-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Người Dùng</th>
                  <th>Voucher</th>
                  <th>Mô tả</th>
                  <th>Ngày cấp</th>
                  <th>Hết hạn</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {assigned
                  .slice(
                    (currentPage - 1) * itemsPerPage,
                    currentPage * itemsPerPage
                  )
                  .map((item, index) => (
                    <tr key={item.UserVoucherId || item.id || index}>
                      <td>
                        {item.UserVoucherId ||
                          item.id ||
                          (currentPage - 1) * itemsPerPage + index + 1}
                      </td>
                      <td>{item.User?.FullName || "N/A"}</td>
                      <td>{item.Voucher?.Code || "N/A"}</td>
                      <td>{item.Voucher?.Description || "N/A"}</td>
                      <td>
                        {new Date(item.ReceivedDate).toLocaleDateString(
                          "vi-VN"
                        )}
                      </td>
                      <td>
                        {item.Voucher?.ExpiryDate
                          ? new Date(
                              item.Voucher.ExpiryDate
                            ).toLocaleDateString("vi-VN")
                          : "—"}
                      </td>
                      <td>
                        <span
                          className={
                            new Date(item.Voucher?.ExpiryDate) < new Date()
                              ? "status expired"
                              : "status active"
                          }
                        >
                          {new Date(item.Voucher?.ExpiryDate) < new Date()
                            ? "Hết hạn"
                            : "Còn hiệu lực"}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* ================== PAGINATION ================== */}
          <div className="pagination">
            <button
              className="btn-page"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Trước
            </button>

            {Array.from(
              { length: Math.ceil(assigned.length / itemsPerPage) },
              (_, i) => i + 1
            ).map((page) => (
              <button
                key={page}
                className={`btn-page ${currentPage === page ? "active" : ""}`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}

            <button
              className="btn-page"
              onClick={() =>
                setCurrentPage((prev) =>
                  Math.min(prev + 1, Math.ceil(assigned.length / itemsPerPage))
                )
              }
              disabled={
                currentPage === Math.ceil(assigned.length / itemsPerPage)
              }
            >
              Sau
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default AssignVoucher;
