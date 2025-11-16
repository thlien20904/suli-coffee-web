import React, { useEffect, useState } from "react";
import axios from "axios";
import { buildApiUrl } from "../../utils/apiConfig";
import Swal from "sweetalert2";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "../../styles/components/admin/users.css";

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loadingId, setLoadingId] = useState(null);

  // ✅ Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;

  // Fetch danh sách users
  const fetchData = async () => {
    try {
      const res = await axios.get(buildApiUrl("/api/admin/users"), {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      let fetchedUsers = res.data.data || [];

      // ✅ THÊM: Optional frontend filter (backup nếu backend fail) – Exclude Role="admin"
      fetchedUsers = fetchedUsers.filter(
        (u) => u.Role !== "admin" && u.Role !== "Admin"
      );

      console.log(
        "🔍 Fetched & filtered users:",
        fetchedUsers.map((u) => ({ Id: u.Id, Role: u.Role }))
      ); // Debug

      setUsers(fetchedUsers);
    } catch (err) {
      console.error("❌ Lỗi khi fetch users:", err);
      Swal.fire("Lỗi", "Không thể tải danh sách users", "error");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 👉 Cấm hoặc bỏ cấm user
  const toggleBanUser = (id, isBanned) => {
    Swal.fire({
      title: isBanned
        ? "Bạn có chắc chắn muốn bỏ cấm user này?"
        : "Bạn có chắc chắn muốn cấm user này?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: isBanned ? "Bỏ cấm" : "Cấm",
      cancelButtonText: "Hủy",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          setLoadingId(id);

          // ✅ FIX: Sửa URL – Dùng isBanned thay action (undefined)
          const endpoint = isBanned ? "unban" : "ban";
          const url = buildApiUrl(`/api/admin/users/${id}/${endpoint}`);

          const res = await axios.patch(url, null, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          });

          if (res.data.success) {
            Swal.fire({
              icon: "success",
              title: res.data.message,
              confirmButtonText: "OK",
              timer: 1000,
              timerProgressBar: true,
            }).then(() => {
              fetchData(); // load lại sau khi đóng popup
            });
          } else {
            Swal.fire({
              icon: "error",
              title: "",
              text: res.data.message,
              confirmButtonText: "OK",
              timer: 1000,
              timerProgressBar: true,
            });
          }
        } catch (err) {
          console.error("❌ Lỗi toggle ban:", err);
          Swal.fire({
            icon: "error",
            title: "",
            text: err.response?.data?.message || "Không thể kết nối server",
            confirmButtonText: "OK",
            timer: 1500,
            timerProgressBar: true,
          });
        } finally {
          setLoadingId(null);
        }
      }
    });
  };

  // 👉 Lọc theo search
  const filteredUsers = users.filter(
    (u) =>
      u.Username.toLowerCase().includes(search.toLowerCase()) ||
      (u.FullName && u.FullName.toLowerCase().includes(search.toLowerCase())) ||
      u.Email.toLowerCase().includes(search.toLowerCase())
  );

  // 👉 Phân trang
  const indexOfLast = currentPage * usersPerPage;
  const indexOfFirst = indexOfLast - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  return (
    <div className="page-container">
      <div className="top-bar">
        <input
          type="text"
          placeholder="Tìm kiếm..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1); // reset về trang 1 khi search
          }}
        />
      </div>

      <table className="table category-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Username</th>
            <th>Họ và tên</th>
            <th>Email</th>
            <th>Số điện thoại</th>
            <th>Địa chỉ</th>
            <th>Vai trò</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {currentUsers.length > 0 ? (
            currentUsers.map((item) => (
              <tr key={item.Id}>
                <td>{item.Id}</td>
                <td>{item.Username}</td>
                <td>{item.FullName || "—"}</td>
                <td>{item.Email}</td>
                <td>{item.Phone || "—"}</td>
                <td>{item.Address || "—"}</td>
                <td>
                  {item.Role === "Banned" ? (
                    <span style={{ color: "red", fontWeight: "bold" }}>
                      Banned
                    </span>
                  ) : (
                    item.Role
                  )}
                </td>
                <td className="action-buttons">
                  <button
                    className={`btn-${
                      item.Role === "Banned" ? "unban" : "ban"
                    }`}
                    onClick={() =>
                      toggleBanUser(item.Id, item.Role === "Banned")
                    }
                    disabled={loadingId === item.Id}
                  >
                    {loadingId === item.Id ? (
                      <i className="fas fa-spinner fa-spin"></i>
                    ) : item.Role === "Banned" ? (
                      <i className="fas fa-unlock"></i>
                    ) : (
                      <i className="fas fa-ban"></i>
                    )}
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="8" style={{ textAlign: "center" }}>
                Không có dữ liệu
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            « Trước
          </button>
          {[...Array(totalPages)].map((_, idx) => (
            <button
              key={idx}
              className={currentPage === idx + 1 ? "active" : ""}
              onClick={() => setCurrentPage(idx + 1)}
            >
              {idx + 1}
            </button>
          ))}
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            Sau »
          </button>
        </div>
      )}
    </div>
  );
};

export default UserList;
