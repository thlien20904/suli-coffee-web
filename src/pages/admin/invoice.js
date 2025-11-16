import React, { useEffect, useState } from "react";
import axios from "axios";
import { buildApiUrl } from "../../utils/apiConfig";
import Swal from "sweetalert2";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "../../styles/components/admin/Invoice.css";

const Invoice = () => {
  const [invoices, setInvoices] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [details, setDetails] = useState([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState(null);
  const itemsPerPage = 10;

  // 🔹 Lấy danh sách hóa đơn
  const fetchData = async () => {
    try {
      const res = await axios.get(buildApiUrl("/api/admin/invoice"), {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        params: { limit: 1000 },
      });
      setInvoices(res.data.data);
      setFiltered(res.data.data);
    } catch (err) {
      console.error("❌ Lỗi fetch invoices:", err);
      Swal.fire("", "Không thể tải danh sách hóa đơn", "error");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 🔹 Lọc hóa đơn
  const applyFilter = () => {
    let result = [...invoices];

    result = result.filter(
      (item) =>
        (item.User?.FullName || "")
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        String(item.OrderId).includes(search)
    );

    result = result.filter((item) => {
      if (!startDate && !endDate) return true;
      const d = new Date(item.OrderDate);
      const from = startDate ? new Date(startDate) : null;
      const to = endDate ? new Date(endDate) : null;
      return (!from || d >= from) && (!to || d <= to);
    });

    result = result.sort((a, b) => {
      switch (sort) {
        case "newest":
          return new Date(b.OrderDate) - new Date(a.OrderDate);
        case "oldest":
          return new Date(a.OrderDate) - new Date(b.OrderDate);
        case "high":
          return b.TotalAmount - a.TotalAmount;
        case "low":
          return a.TotalAmount - b.TotalAmount;
        default:
          return 0;
      }
    });

    setFiltered(result);
    setCurrentPage(1);
  };

  // 🔹 Phân trang
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const pageData = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const changePage = (p) => {
    if (p >= 1 && p <= totalPages) setCurrentPage(p);
  };

  // 🔹 Xem chi tiết
  const viewDetail = async (id) => {
    try {
      const res = await axios.get(buildApiUrl(`/api/admin/invoice/${id}`), {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      setDetails(res.data.details || []);
      setCurrentInvoice(res.data.invoice || null);
      setShowDetailModal(true);
    } catch (err) {
      console.error(err);
      Swal.fire("", "Không thể lấy chi tiết hóa đơn", "error");
    }
  };

  // 🔹 In hóa đơn
  const printInvoice = () => {
    if (!currentInvoice) return;
    window.print();
  };

  return (
    <div className="invoice-page">
      {/* Bộ lọc */}
      <div className="invoice-filter">
        <input
          className="search-box"
          type="text"
          placeholder="Tìm mã đơn / khách hàng..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="date-group">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="newest">Mới nhất</option>
          <option value="oldest">Cũ nhất</option>
          <option value="high">Giá cao nhất</option>
          <option value="low">Giá thấp nhất</option>
        </select>
        <button className="btn-green" onClick={applyFilter}>
          <i className="fas fa-filter"></i> Lọc
        </button>
      </div>

      {/* Bảng hóa đơn */}
      <table className="invoice-table">
        <thead>
          <tr>
            <th>Mã HĐ</th>
            <th>Khách hàng</th>
            <th>Ngày</th>
            <th>Thanh toán</th>
            <th>Trạng thái</th>
            <th>Tổng tiền</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {pageData.length > 0 ? (
            pageData.map((item) => (
              <tr key={item.OrderId}>
                <td>{item.OrderId}</td>
                <td>{item.User?.FullName || "N/A"}</td>
                <td>{new Date(item.OrderDate).toLocaleString()}</td>
                <td>{item.PaymentMethod?.TenPhuongThuc || "N/A"}</td>
                <td>{item.Status?.StatusName || "N/A"}</td>

                {/* 🔥 FIX TIỀN */}
                <td>
                  {Math.round(item.TotalAmount || 0).toLocaleString("vi-VN")} ₫
                </td>

                <td>
                  <button
                    className="btn-green"
                    onClick={() => viewDetail(item.OrderId)}
                  >
                    <i className="fas fa-eye"></i> Xem chi tiết
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

      {/* Phân trang */}
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

      {showDetailModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowDetailModal(false)}
        >
          <div className="invoice-modal" onClick={(e) => e.stopPropagation()}>
            <div className="invoice-print">
              <h2 className="brand-title">SULI COFFEE HOUSE</h2>
              <p className="brand-address">
                234 Hoàng Quốc Việt, Bắc Từ Liêm, Hà Nội
              </p>
              <hr />

              <div className="invoice-info">
                <p>
                  <b>Số HĐ:</b> {currentInvoice?.OrderId}
                </p>
                <p>
                  <b>Ngày:</b>{" "}
                  {new Date(currentInvoice?.OrderDate).toLocaleString()}
                </p>
                <p>
                  <b>Khách hàng:</b> {currentInvoice?.User?.FullName || "N/A"}
                </p>
                <p>
                  <b>Phương thức:</b>{" "}
                  {currentInvoice?.PaymentMethod?.TenPhuongThuc || "N/A"}
                </p>
                <p>
                  <b>Trạng thái:</b>{" "}
                  {currentInvoice?.Status?.StatusName || "N/A"}
                </p>
              </div>

              <table className="invoice-detail-table">
                <thead>
                  <tr>
                    <th>TT</th>
                    <th>Tên món</th>
                    <th>SL</th>
                    <th>Đ.Giá</th>
                    <th>T.Tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {details.map((d, i) => (
                    <tr key={d.OrderDetailId}>
                      <td>{i + 1}</td>
                      <td>
                        {d.Food?.FoodName || "N/A"}
                        {d.Size?.SizeName ? ` (${d.Size.SizeName})` : ""}
                        {d.Topping?.ToppingName
                          ? ` - ${d.Topping.ToppingName}`
                          : ""}
                      </td>
                      <td>{d.Quantity}</td>

                      {/* 🔥 FIX TIỀN */}
                      <td>
                        {Math.round(d.Price || 0).toLocaleString("vi-VN")} ₫
                      </td>
                      <td>
                        {((d.Quantity || 0) * (d.Price || 0)).toLocaleString(
                          "vi-VN"
                        )}{" "}
                        ₫
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="invoice-summary">
                <p>
                  <b>Tổng số lượng:</b>{" "}
                  {details.reduce((sum, d) => sum + (d.Quantity || 0), 0)}
                </p>

                {/* 🔥 FIX TIỀN */}
                <p>
                  <b>Thành tiền:</b>{" "}
                  {Math.round(currentInvoice?.TotalAmount || 0).toLocaleString(
                    "vi-VN"
                  )}{" "}
                  ₫
                </p>
                <p>
                  <b>Thanh toán:</b>{" "}
                  {Math.round(currentInvoice?.TotalAmount || 0).toLocaleString(
                    "vi-VN"
                  )}{" "}
                  ₫
                </p>
                <p>
                  <b>Tiền khách đưa:</b>{" "}
                  {Math.round(currentInvoice?.TotalAmount || 0).toLocaleString(
                    "vi-VN"
                  )}{" "}
                  ₫
                </p>
                <p>
                  <b>Tiền thừa:</b> 0 ₫
                </p>
              </div>

              <div className="qr-section">
                <p>
                  Giá sản phẩm đã bao gồm VAT 8%. Hóa đơn GTGT chỉ xuất tại thời
                  điểm thanh toán. Nếu bạn cần xuất hóa đơn, hãy truy cập
                  website
                  <br />
                  <a href="https://evat.suli.com">https://evat.suli.com</a>
                </p>
                <p>Mọi thắc mắc xin liên hệ: 086868686</p>
                <p className="wifi">Password Wifi: sulicoffee</p>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-green" onClick={printInvoice}>
                <i className="fas fa-print"></i> In hóa đơn
              </button>
              <button
                className="btn-red"
                onClick={() => setShowDetailModal(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoice;
