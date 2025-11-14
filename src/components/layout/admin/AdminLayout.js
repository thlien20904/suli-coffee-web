// src/components/layout/admin/AdminLayout.js
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useEffect } from "react";
import "../../../styles/components/AdminLayout.css";

const AdminLayout = () => {
  // Scroll handlers
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToBottom = () => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  };

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <Sidebar />

      {/* Nội dung chính */}
      <div className="admin-main">
        {/* Header */}
        <Header />

        {/* Nội dung trang con */}
        <main className="admin-content">
          <Outlet />
        </main>

        {/* Nút điều hướng lên/xuống */}
        <div className="scroll-buttons">
          <button onClick={scrollToTop}>
            <i className="fas fa-arrow-up"></i>
          </button>
          <button onClick={scrollToBottom}>
            <i className="fas fa-arrow-down"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
