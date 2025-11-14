import React, { useState } from "react";
import VoucherList from "./VoucherList";
import AssignVoucher from "./AssignVoucher";
import "../../../styles/components/admin/VoucherTabs.css";

const Voucher = () => {
  const [activeTab, setActiveTab] = useState("list");

  return (
    <div className="voucher-tabs-page">
      <div className="tab-header">
        <button
          className={`tab-btn ${activeTab === "list" ? "active" : ""}`}
          onClick={() => setActiveTab("list")}
        >
          🧾 Quản lý Voucher
        </button>
        <button
          className={`tab-btn ${activeTab === "assign" ? "active" : ""}`}
          onClick={() => setActiveTab("assign")}
        >
          🎁 Cấp Voucher cho User
        </button>
      </div>

      <div className="tab-content">
        {activeTab === "list" ? <VoucherList /> : <AssignVoucher />}
      </div>
    </div>
  );
};

export default Voucher;
