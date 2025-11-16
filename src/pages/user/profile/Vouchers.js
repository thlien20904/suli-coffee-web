import React, { useEffect, useState } from "react";
import axios from "axios";
import { buildApiUrl } from "../../../utils/apiConfig";
import Swal from "sweetalert2";
import "../../../styles/pages/Vouchers.css";

export default function VoucherTab() {
  const [available, setAvailable] = useState([]);
  const [myVouchers, setMyVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("available");
  const [message, setMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchAllVouchers();
    setCurrentPage(1); // Reset page khi đổi tab
  }, [tab]);

  // 🔹 Lấy danh sách voucher khả dụng + đã nhận
  const fetchAllVouchers = async () => {
    try {
      setLoading(true);
      const [resAvailable, resMy] = await Promise.all([
        axios.get(buildApiUrl("/api/profile/vouchers"), {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(buildApiUrl("/api/profile/vouchers/my"), {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const myList = resMy.data.success ? resMy.data.data || [] : [];
      const allList = resAvailable.data.success
        ? resAvailable.data.data || []
        : [];

      // đánh dấu voucher đã nhận
      const updatedAvailable = allList.map((v) => ({
        ...v,
        isReceived: myList.some((m) => m.Code === v.Code),
      }));

      setAvailable(updatedAvailable);
      setMyVouchers(myList);
      setMessage("");
    } catch (err) {
      console.error("FETCH ERROR:", err);
      setMessage("Không thể tải danh sách voucher.");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Nhận voucher
  const claimVoucher = async (voucherId) => {
    try {
      const res = await axios.post(
        buildApiUrl("/api/profile/vouchers/receive"),
        { voucherId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        Swal.fire({
          icon: "success",
          title: "🎉 Thành công!",
          text: res.data.message || "Bạn đã nhận voucher thành công!",
          timer: 1200,
          showConfirmButton: false,
        });
        // ✅ Cập nhật giao diện ngay
        fetchAllVouchers();
      } else {
        Swal.fire({
          icon: "warning",
          title: "⚠️ Thông báo",
          text: res.data.message || "Không thể nhận voucher.",
          showConfirmButton: true,
        });
      }
    } catch (err) {
      console.error("CLAIM VOUCHER ERROR:", err);
      Swal.fire({
        icon: "error",
        title: "Lỗi!",
        text: err.response?.data?.message || "Không thể kết nối server.",
        showConfirmButton: true,
      });
    }
  };

  const renderVoucherCard = (v, isMy = false) => (
    <div key={v.Code} className="voucher-card">
      <div className="voucher-left">
        <h5>{v.Code}</h5>
        <p>{v.Description}</p>
        <p>
          <strong>Điều kiện:</strong> Đơn tối thiểu{" "}
          {Math.round(v.MinOrderAmount || 0).toLocaleString("vi-VN")}₫
        </p>
        {v.DiscountAmount && (
          <p>
            <strong>Giảm:</strong>{" "}
            {Math.round(v.DiscountAmount).toLocaleString("vi-VN")}₫
          </p>
        )}
        {v.DiscountPercentage && (
          <p>
            <strong>Giảm:</strong> {v.DiscountPercentage}%
          </p>
        )}
        <p>
          <strong>HSD:</strong>{" "}
          {new Date(v.ExpiryDate).toLocaleDateString("vi-VN")}
        </p>
      </div>

      <div className="voucher-right">
        {isMy ? (
          <span className={`badge ${v.IsUsed ? "bg-secondary" : "bg-success"}`}>
            {v.IsUsed ? "Đã dùng" : "Chưa dùng"}
          </span>
        ) : v.isReceived ? (
          <button className="btn-received" disabled>
            ✅ Đã nhận
          </button>
        ) : (
          <button
            className="btn-claim"
            onClick={() => claimVoucher(v.VoucherId)}
          >
            🎁 Nhận
          </button>
        )}
      </div>
    </div>
  );

  // Pagination logic
  const currentVouchers = tab === "available" ? available : myVouchers;
  const totalPages = Math.ceil(currentVouchers.length / itemsPerPage);
  const displayedVouchers = currentVouchers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="voucher-tab">
      <div className="voucher-header">
        <button
          className={`tab-btn ${tab === "available" ? "active" : ""}`}
          onClick={() => setTab("available")}
        >
          🎁 Voucher khả dụng
        </button>
        <button
          className={`tab-btn ${tab === "my" ? "active" : ""}`}
          onClick={() => setTab("my")}
        >
          🪪 Voucher của tôi
        </button>
      </div>

      {loading ? (
        <p className="text-center mt-4">⏳ Đang tải voucher...</p>
      ) : (
        <>
          {message && <p className="text-center text-danger">{message}</p>}
          <div className="voucher-list">
            {displayedVouchers.map((v) => renderVoucherCard(v, tab === "my"))}
            {currentVouchers.length === 0 && (
              <p className="text-center mt-3">Không có voucher nào.</p>
            )}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn-pagination"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                ← Trước
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    className={`btn-page ${
                      currentPage === page ? "active" : ""
                    }`}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                )
              )}
              <button
                className="btn-pagination"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                Sau →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
