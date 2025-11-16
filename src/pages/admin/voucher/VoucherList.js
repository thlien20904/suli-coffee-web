import React, { useEffect, useState } from "react";
import axios from "axios";
import { buildApiUrl } from "../../../utils/apiConfig";
import Swal from "sweetalert2";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "../../../styles/components/admin/Voucher.css";

const VoucherList = () => {
  const [vouchers, setVouchers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState(null);
  const [form, setForm] = useState({
    Code: "",
    Description: "",
    DiscountAmount: "",
    DiscountPercentage: "",
    MinOrderAmount: "",
    ExpiryDate: "",
    MaxUsage: "",
    IsActive: true,
  });
  const [errors, setErrors] = useState({});

  const [currentPage, setCurrentPage] = useState(1);

  // ===================== FORMAT CURRENCY =====================
  const formatCurrency = (value) => {
    if (!value) return "";
    return Math.round(value).toLocaleString("vi-VN");
  };

  const parseCurrency = (value) => {
    if (!value) return "";
    return value.toString().replace(/[.,]/g, "");
  };
  const itemsPerPage = 5;

  const API_URL = buildApiUrl("/api/admin/voucher");

  // ===================== FETCH =====================
  const fetchVouchers = async () => {
    try {
      setLoading(true);
      const res = await axios.get(API_URL, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setVouchers(res.data.data || []);
      setFiltered(res.data.data || []);
    } catch (err) {
      Swal.fire("Lỗi", "Không thể tải danh sách voucher!", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, []);

  // ===================== SEARCH =====================
  useEffect(() => {
    const lower = search.toLowerCase();
    const result = vouchers.filter(
      (v) =>
        v.Code?.toLowerCase().includes(lower) ||
        v.Description?.toLowerCase().includes(lower)
    );
    setFiltered(result);
    setCurrentPage(1);
  }, [search, vouchers]);

  // ===================== PAGINATION =====================
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const displayed = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // ===================== MODAL OPEN =====================
  const openModal = (voucher = null) => {
    if (voucher) {
      setEditingVoucher(voucher);
      setForm({
        Code: voucher.Code,
        Description: voucher.Description,
        DiscountAmount: formatCurrency(voucher.DiscountAmount) || "",
        DiscountPercentage: voucher.DiscountPercentage || "",
        MinOrderAmount: formatCurrency(voucher.MinOrderAmount) || "",
        ExpiryDate: voucher.ExpiryDate?.split(" ")[0] || "", // Chỉ lấy YYYY-MM-DD
        MaxUsage: voucher.MaxUsage || "",
        IsActive: voucher.IsActive,
      });
    } else {
      setEditingVoucher(null);
      setForm({
        Code: "",
        Description: "",
        DiscountAmount: "",
        DiscountPercentage: "",
        MinOrderAmount: "",
        ExpiryDate: "",
        MaxUsage: "",
        IsActive: true,
      });
    }
    setErrors({});
    setModalOpen(true);
  };

  // ===================== VALIDATE =====================
  const rules = {
    Code: (v) => (!v.trim() ? "Mã voucher không được để trống" : null),
    Description: (v) =>
      !v.trim() ? "Mô tả voucher không được để trống" : null,
    ExpiryDate: (v) => (!v ? "Phải chọn ngày hết hạn" : null),

    DiscountAmount: (v, f) => {
      if (!v && !f.DiscountPercentage)
        return "Phải nhập giảm giá tiền hoặc phần trăm";
      if (v && v < 0) return "Giảm giá tiền không được âm";
      return null;
    },

    DiscountPercentage: (v, f) => {
      if (!v && !f.DiscountAmount)
        return "Phải nhập giảm giá tiền hoặc phần trăm";
      if (v && (v < 0 || v > 100)) return "Phần trăm giảm phải từ 0 đến 100";
      return null;
    },

    MinOrderAmount: (v) =>
      v < 0
        ? "Đơn tối thiểu không được âm"
        : v === ""
        ? "Nhập đơn tối thiểu"
        : null,

    MaxUsage: (v) =>
      v <= 0
        ? "Giới hạn lượt dùng phải > 0"
        : v === ""
        ? "Nhập giới hạn lượt dùng"
        : null,
  };

  const validateForm = () => {
    const newErrors = {};
    Object.keys(rules).forEach((key) => {
      const msg = rules[key](form[key], form);
      if (msg) newErrors[key] = msg;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ===================== HANDLERS =====================
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === "DiscountAmount" || name === "MinOrderAmount") {
      // Chỉ cho phép số và format hiển thị
      const numericValue = value.replace(/[^0-9]/g, "");
      const formattedValue = numericValue
        ? Math.round(parseInt(numericValue)).toLocaleString("vi-VN")
        : "";

      setForm({
        ...form,
        [name]: formattedValue,
      });
    } else {
      setForm({
        ...form,
        [name]: type === "checkbox" ? checked : value,
      });
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    const msg = rules[name]?.(value, form);
    setErrors((prev) => ({ ...prev, [name]: msg }));
  };

  // ===================== SAVE =====================
  const saveVoucher = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      Swal.fire("", "Vui lòng kiểm tra lại các trường nhập!", "error");
      return;
    }

    try {
      // Parse currency values back to numbers
      const formData = {
        ...form,
        DiscountAmount: form.DiscountAmount
          ? parseCurrency(form.DiscountAmount)
          : "",
        MinOrderAmount: form.MinOrderAmount
          ? parseCurrency(form.MinOrderAmount)
          : "",
      };

      let res;
      if (editingVoucher) {
        res = await axios.post(
          `${API_URL}/edit/${editingVoucher.VoucherId}`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
      } else {
        res = await axios.post(`${API_URL}/add`, formData, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
      }

      // THÀNH CÔNG → success: true
      if (res.data.success) {
        Swal.fire({
          icon: "success",
          title: editingVoucher
            ? "Cập nhật voucher thành công!"
            : "Thêm voucher thành công!",
          showConfirmButton: false,
          timer: 1000,
        }).then(() => {
          setModalOpen(false);
          fetchVouchers();
        });
        return;
      }

      // LỖI TỪ BACKEND → success: false (400, 404, v.v.)
      const message = res.data.message || "Không thể lưu voucher";
      Swal.fire("Lỗi", message, "error");

      // Nếu backend trả lỗi theo field
      if (res.data.errors && typeof res.data.errors === "object") {
        setErrors(res.data.errors);
      }
    } catch (err) {
      // CHỈ LỖI MẠNG HOẶC SERVER 500
      console.error("Lỗi kết nối:", err);
      const isNetworkError = !err.response;
      const message = isNetworkError
        ? "Không thể kết nối tới máy chủ!"
        : err.response?.data?.message || "Lỗi không xác định";

      Swal.fire("Lỗi", message, "error");
    }
  };

  // ===================== TOGGLE ACTIVE STATUS =====================
  const toggleStatus = async (voucher) => {
    const action = voucher.IsActive ? "ngừng hoạt động" : "kích hoạt lại";
    const confirm = await Swal.fire({
      title: `Xác nhận ${action} voucher "${voucher.Code}"?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Xác nhận",
      cancelButtonText: "Hủy",
    });

    if (!confirm.isConfirmed) return;

    try {
      const res = await axios.put(
        `${API_URL}/toggle/${voucher.VoucherId}`,
        {},
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      if (res.data.success) {
        Swal.fire({
          icon: "success",
          title: res.data.message,
          showConfirmButton: false,
          timer: 1000,
        });
        fetchVouchers();
      } else {
        Swal.fire("", res.data.message || "Không thể cập nhật", "error");
      }
    } catch {
      Swal.fire("Lỗi", "Không thể cập nhật trạng thái voucher", "error");
    }
  };

  // ===================== DELETE =====================
  const deleteVoucher = async (voucher) => {
    const result = await Swal.fire({
      title: `Xóa voucher "${voucher.Code}"?`,
      text: "Thao tác này không thể hoàn tác!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Xóa",
      cancelButtonText: "Hủy",
    });

    if (!result.isConfirmed) return;

    try {
      const res = await axios.post(
        `${API_URL}/delete`,
        {
          id: voucher.VoucherId,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

      if (res.data.success) {
        Swal.fire({
          icon: "success",
          title: "Đã xóa!",
          text: res.data.message || "Voucher đã được ngưng kích hoạt.",
          showConfirmButton: false,
          timer: 1000,
        }).then(fetchVouchers);
      } else {
        Swal.fire("", res.data.message || "Không thể xóa", "error");
      }
    } catch (err) {
      const msg =
        err.response?.data?.message || "Không thể kết nối tới máy chủ.";
      Swal.fire({
        icon: "error",
        title: "Không thể xóa voucher",
        text: msg,
      });
    }
  };

  // ===================== RENDER =====================
  return (
    <div className="voucher-page">
      <div className="header-bar">
        <input
          type="text"
          placeholder="Tìm theo mã hoặc mô tả..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn-green" onClick={() => openModal()}>
          Thêm Voucher
        </button>
      </div>

      <table className="voucher-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Mã</th>
            <th>Mô tả</th>
            <th>Giảm</th>
            <th>Đơn tối thiểu</th>
            <th>Ngày hết hạn</th>
            <th>Tối đa</th>
            <th>Đã dùng</th>
            <th>Trạng thái</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan="10" style={{ textAlign: "center" }}>
                Đang tải dữ liệu...
              </td>
            </tr>
          ) : displayed.length > 0 ? (
            displayed.map((v) => (
              <tr key={v.VoucherId}>
                <td>{v.VoucherId}</td>
                <td>{v.Code}</td>
                <td>{v.Description}</td>
                <td>
                  {v.DiscountAmount
                    ? `${Math.round(v.DiscountAmount).toLocaleString(
                        "vi-VN"
                      )} ₫`
                    : v.DiscountPercentage
                    ? `${v.DiscountPercentage}%`
                    : "—"}
                </td>
                <td>
                  {v.MinOrderAmount
                    ? Math.round(v.MinOrderAmount).toLocaleString("vi-VN") +
                      " ₫"
                    : "—"}
                </td>
                <td>
                  {v.ExpiryDate
                    ? new Date(v.ExpiryDate).toLocaleDateString("vi-VN")
                    : "—"}
                </td>
                <td>{v.MaxUsage || "—"}</td>
                <td>{v.UsedCount || 0}</td>
                <td>
                  {v.IsActive ? (
                    <span className="status-active">Hoạt động</span>
                  ) : (
                    <span className="status-inactive">Ngừng</span>
                  )}
                </td>
                <td>
                  <button
                    className="btn-blue"
                    onClick={() => openModal(v)}
                    title="Sửa"
                  >
                    Sửa
                  </button>
                  <button
                    className={`btn-toggle ${v.IsActive ? "active" : ""}`}
                    onClick={() => toggleStatus(v)}
                    title={v.IsActive ? "Ngừng hoạt động" : "Kích hoạt lại"}
                  >
                    {v.IsActive ? "Ngừng" : "Kích hoạt"}
                  </button>
                  <button
                    className="btn-red"
                    onClick={() => deleteVoucher(v)}
                    title="Xóa"
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="10" style={{ textAlign: "center" }}>
                Không có dữ liệu
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="pagination">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              className={`page-btn ${p === currentPage ? "active" : ""}`}
              onClick={() => setCurrentPage(p)}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="voucher-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingVoucher ? "Sửa Voucher" : "Thêm Voucher"}</h3>

            <form onSubmit={saveVoucher} className="form-grid">
              <div>
                <label>Mã voucher *</label>
                <input
                  name="Code"
                  value={form.Code}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={errors.Code ? "input-error" : ""}
                />
                {errors.Code && (
                  <small className="error-text">{errors.Code}</small>
                )}
              </div>

              <div>
                <label>Mô tả *</label>
                <input
                  name="Description"
                  value={form.Description}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={errors.Description ? "input-error" : ""}
                />
                {errors.Description && (
                  <small className="error-text">{errors.Description}</small>
                )}
              </div>

              <div>
                <label>Giảm (VNĐ)</label>
                <input
                  name="DiscountAmount"
                  type="text"
                  placeholder="VD: 10.000"
                  value={form.DiscountAmount}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={errors.DiscountAmount ? "input-error" : ""}
                />
                {errors.DiscountAmount && (
                  <small className="error-text">{errors.DiscountAmount}</small>
                )}
              </div>

              <div>
                <label>Giảm (%)</label>
                <input
                  name="DiscountPercentage"
                  type="number"
                  value={form.DiscountPercentage}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={errors.DiscountPercentage ? "input-error" : ""}
                />
                {errors.DiscountPercentage && (
                  <small className="error-text">
                    {errors.DiscountPercentage}
                  </small>
                )}
              </div>

              <div>
                <label>Đơn tối thiểu *</label>
                <input
                  name="MinOrderAmount"
                  type="text"
                  placeholder="VD: 50.000"
                  value={form.MinOrderAmount}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={errors.MinOrderAmount ? "input-error" : ""}
                />
                {errors.MinOrderAmount && (
                  <small className="error-text">{errors.MinOrderAmount}</small>
                )}
              </div>

              <div>
                <label>Ngày hết hạn *</label>
                <input
                  name="ExpiryDate"
                  type="date"
                  min={new Date().toISOString().split("T")[0]} // 👈 chỉ cho chọn từ hôm nay trở đi
                  value={form.ExpiryDate}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={errors.ExpiryDate ? "input-error" : ""}
                />
                {errors.ExpiryDate && (
                  <small className="error-text">{errors.ExpiryDate}</small>
                )}
              </div>

              <div>
                <label>Giới hạn lượt dùng *</label>
                <input
                  name="MaxUsage"
                  type="number"
                  value={form.MaxUsage}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={errors.MaxUsage ? "input-error" : ""}
                />
                {errors.MaxUsage && (
                  <small className="error-text">{errors.MaxUsage}</small>
                )}
              </div>

              <div>
                <label>
                  <input
                    type="checkbox"
                    name="IsActive"
                    checked={form.IsActive}
                    onChange={handleChange}
                  />{" "}
                  Kích hoạt
                </label>
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn-green">
                  Lưu
                </button>
                <button
                  type="button"
                  className="btn-gray"
                  onClick={() => setModalOpen(false)}
                >
                  Đóng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoucherList;
