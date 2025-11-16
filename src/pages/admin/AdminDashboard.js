import React, { useEffect, useState } from "react";
import axios from "axios";
import { Line } from "react-chartjs-2";
import { getImageUrl } from "../../utils/imageUtils";
import { buildApiUrl } from "../../utils/apiConfig";
import "bootstrap/dist/css/bootstrap.min.css";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { useNavigate } from "react-router-dom";
import "../../styles/pages/AdminDashboard.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await axios.get(buildApiUrl("/api/admin/home"));
        setData(res.data);
      } catch (err) {
        console.error("Error fetching dashboard:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) return <p className="text-center mt-5">Đang tải...</p>;
  if (!data) return <p className="text-center mt-5">Không có dữ liệu</p>;

  const {
    totalProducts,
    totalIngredients,
    totalOrders,
    totalSales,
    statusCount,
    monthlySales,
    bestSellers,
    lowStockIngredients,
    topAddresses,
    recentOrders,
  } = data;

  // ✅ THÊM: Debug log cho bestSellers và lowStockIngredients
  // console.log("🔥 BestSellers data:", bestSellers); // Check array và ImageURL
  // console.log("⚠️ LowStockIngredients data:", lowStockIngredients); // Tương tự
  // console.log("📊 Dashboard data:", { monthlySales, totalSales }); // Debug log

  // Ensure monthlySales exists and has proper format
  const safelyMonthlySales = monthlySales || [];
  console.log("📈 Monthly sales data:", safelyMonthlySales); // Debug log
  console.log("🔍 Raw data from API:", {
    totalSales,
    monthlySales,
    statusCount,
  }); // Debug API data
  console.log(
    "📊 TotalSales type and value:",
    typeof totalSales,
    totalSales,
    Number(totalSales)
  ); // Check number conversion

  const monthlyLabels = Array.from({ length: 12 }, (_, i) => `Tháng ${i + 1}`);
  const monthlyRevenueData = Array.from({ length: 12 }, (_, i) => {
    const monthData = safelyMonthlySales.find((m) => m.Month === i + 1);
    const revenue = monthData ? monthData.TotalRevenue : 0;
    console.log(`📅 Tháng ${i + 1}:`, { monthData, revenue }); // Debug each month
    return revenue || 0;
  });

  console.log("📊 Chart data array:", monthlyRevenueData); // Debug log

  // Check if there's any revenue data - use multiple checks
  const hasRevenueData =
    totalSales > 0 || monthlyRevenueData.some((value) => value > 0);
  const totalRevenue =
    totalSales || monthlyRevenueData.reduce((sum, value) => sum + value, 0);

  console.log("🔍 Revenue check - totalSales > 0:", totalSales > 0);
  console.log(
    "🔍 Revenue check - monthlyData has values:",
    monthlyRevenueData.some((value) => value > 0)
  );
  console.log("🔍 Final hasRevenueData:", hasRevenueData);
  console.log("💰 Final totalRevenue:", totalRevenue);

  const chartData = {
    labels: monthlyLabels,
    datasets: [
      {
        label: "Doanh thu (VNĐ)",
        data: monthlyRevenueData,
        borderColor: "#28a745",
        backgroundColor: "rgba(40, 167, 69, 0.1)",
        fill: true,
        tension: 0.3,
        pointBackgroundColor: "#28a745",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointRadius: 5,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          font: {
            size: 14,
            weight: "bold",
          },
        },
      },
      title: {
        display: true,
        text: "Doanh thu theo tháng năm 2025 (VNĐ)",
        font: {
          size: 16,
          weight: "bold",
        },
        color: "#2c3e50",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(0,0,0,0.1)",
        },
        ticks: {
          font: {
            size: 12,
          },
          callback: function (value) {
            if (value === 0) return "0 ₫";
            return new Intl.NumberFormat("vi-VN").format(value) + " ₫";
          },
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 12,
            weight: "bold",
          },
        },
      },
    },
  };

  // ✅ Helper function để lấy img src an toàn (fallback nếu null hoặc double URL)
  const safeImageUrl = (imageUrl) => {
    if (!imageUrl) return "/images/no-image.png";

    // Nếu double URL (detect 'http://localhost:5000https://'), extract phần sau
    if (imageUrl.includes("http://localhost:5000https://")) {
      console.warn("⚠️ Detected double URL, fixing:", imageUrl);
      return imageUrl.replace("http://localhost:5000", ""); // Bỏ prefix local
    }

    return getImageUrl(imageUrl); // Gọi utils nếu OK
  };

  return (
    <div className="container admin-dashboard mt-4">
      {/* Thống kê */}
      <div className="row">
        <div className="col-md-3">
          <div
            className="card text-center p-3 bg-light clickable-card"
            onClick={() => navigate("/admin/food")}
            style={{ cursor: "pointer" }}
          >
            <h5>📦 Sản phẩm</h5>
            <p className="display-6">{totalProducts}</p>
          </div>
        </div>
        <div className="col-md-3">
          <div
            className="card text-center p-3 bg-light clickable-card"
            onClick={() => navigate("/admin/ingredient")}
            style={{ cursor: "pointer" }}
          >
            <h5>🏭 Nguyên liệu</h5>
            <p className="display-6">{totalIngredients}</p>
          </div>
        </div>
        <div className="col-md-3">
          <div
            className="card text-center p-3 bg-light clickable-card"
            onClick={() => navigate("/admin/order")}
            style={{ cursor: "pointer" }}
          >
            <h5>🛒 Đơn hàng</h5>
            <p className="display-6">{totalOrders}</p>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-center p-3 bg-light">
            <h5>💰 Tổng doanh thu</h5>
            <p className="display-6">
              {Math.round(totalSales).toLocaleString("vi-VN")} ₫
            </p>
          </div>
        </div>
      </div>

      {/* Trạng thái đơn hàng */}
      <div className="row mt-4">
        {Object.entries(statusCount).map(([status, count], i) => (
          <div className="col-md-3" key={i}>
            <div
              className="card text-center p-3 bg-light clickable-card"
              style={{ cursor: "pointer" }}
              onClick={() =>
                navigate(`/admin/order?status=${encodeURIComponent(status)}`)
              }
            >
              <h5>{status}</h5>
              <p className="display-6">{count}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Biểu đồ Doanh thu */}
      <section className="mt-5">
        <div className="row">
          <div className="col-12">
            <div className="card shadow-lg border-0">
              <div className="card-header bg-gradient-success text-white">
                <h4 className="mb-0 text-center">
                  📊 Biểu Đồ Doanh Thu Theo Tháng Năm 2025
                </h4>
              </div>
              <div className="card-body p-4">
                <div className="row mb-4">
                  <div className="col-md-6">
                    <div className="text-center">
                      <small className="text-muted">Tổng doanh thu năm</small>
                      <h5 className="text-success mb-0">
                        {new Intl.NumberFormat("vi-VN").format(totalRevenue)} ₫
                      </h5>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="text-center">
                      <small className="text-muted">
                        Số tháng có doanh thu
                      </small>
                      <h5 className="text-info mb-0">
                        {monthlyRevenueData.filter((v) => v > 0).length} / 12
                        tháng
                      </h5>
                    </div>
                  </div>
                </div>

                <div
                  className="chart-container"
                  style={{ height: "450px", position: "relative" }}
                >
                  <Line data={chartData} options={chartOptions} />
                </div>

                {!hasRevenueData && (
                  <div className="text-center mt-3">
                    <div className="alert alert-info" role="alert">
                      📈 Chưa có dữ liệu doanh thu trong năm nay. Biểu đồ sẽ
                      hiển thị khi có đơn hàng đầu tiên!
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Top sản phẩm + địa chỉ */}
      <div className="row mt-5">
        <div className="col-md-6">
          <h3 className="text-center">🔥 Sản phẩm bán chạy 🔥</h3>
          <div className="row">
            {bestSellers && bestSellers.length > 0 ? (
              bestSellers.map((item, i) => (
                <div className="col-md-4 mb-3" key={i}>
                  <div className="card text-center p-3 bg-light">
                    <img
                      src={safeImageUrl(item.ImageURL)} // ✅ Sử dụng safeImageUrl
                      alt={item.FoodName}
                      onError={(e) => {
                        // ✅ onError fallback
                        console.error(
                          "❌ BestSeller image fail:",
                          item.FoodName,
                          item.ImageURL
                        );
                        e.target.src = "/images/no-image.png";
                      }}
                      style={{
                        maxWidth: "100%",
                        height: "150px",
                        objectFit: "cover",
                        borderRadius: "8px",
                      }}
                      className="img-fluid"
                    />
                    <h5 className="mt-2">{item.FoodName}</h5>
                    <p style={{ color: "#C19A6B", fontWeight: "bold" }}>
                      {Math.round(parseFloat(item.Price || 0)).toLocaleString(
                        "vi-VN"
                      )}
                      ₫
                    </p>
                    <p>Đã bán: {item.TotalSold || 0}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-danger">
                Không có dữ liệu sản phẩm bán chạy
              </p>
            )}
          </div>
        </div>

        <div className="col-md-6">
          <h3 className="text-center">📍 Top địa chỉ đặt hàng</h3>
          <ul className="list-group">
            {topAddresses && topAddresses.length > 0 ? (
              topAddresses.map((addr, i) => (
                <li
                  key={i}
                  className="list-group-item d-flex justify-content-between align-items-center"
                >
                  {addr.Address || "N/A"}
                  <span className="badge bg-primary rounded-pill">
                    {addr.OrderCount || 0}
                  </span>
                </li>
              ))
            ) : (
              <li className="list-group-item text-center">Không có dữ liệu</li>
            )}
          </ul>
        </div>
      </div>

      <div className="row mt-5">
        {/* Bảng Đơn hàng gần đây */}
        <div className="col-md-6">
          <h3 className="text-center">📝 Đơn hàng gần đây</h3>
          <table className="table table-bordered">
            <thead>
              <tr>
                <th>ID</th>
                <th>Người dùng</th>
                <th>Trạng thái</th>
                <th>Ngày đặt</th>
                <th>Tổng tiền</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders && recentOrders.length > 0 ? (
                recentOrders.map((o, i) => (
                  <tr key={i}>
                    <td>{o.OrderId}</td>
                    <td>{o.FullName}</td>
                    <td>{o.StatusName}</td>
                    <td>{new Date(o.OrderDate).toLocaleString()}</td>
                    <td>
                      {Math.round(o.TotalAmount).toLocaleString("vi-VN")}₫
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center">
                    Không có dữ liệu
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Bảng Nguyên liệu sắp hết */}
        <div className="col-md-6">
          <h3 className="text-center">⚠️ Nguyên liệu sắp hết ⚠️</h3>
          <table className="table table-bordered">
            <thead>
              <tr>
                <th>Hình ảnh</th>
                <th>Tên</th>
                <th>Số lượng</th>
              </tr>
            </thead>
            <tbody>
              {lowStockIngredients && lowStockIngredients.length > 0 ? (
                lowStockIngredients.map((item, i) => (
                  <tr key={i}>
                    <td>
                      <img
                        src={safeImageUrl(item.ImageURL)} // ✅ Sử dụng safeImageUrl
                        alt={item.IngredientName}
                        onError={(e) => {
                          // ✅ onError fallback
                          console.error(
                            "❌ LowStock image fail:",
                            item.IngredientName,
                            item.ImageURL
                          );
                          e.target.src = "/images/no-image.png";
                        }}
                        className="ingredient-img img-fluid"
                        style={{
                          width: "50px",
                          height: "50px",
                          objectFit: "cover",
                          borderRadius: "4px",
                        }}
                      />
                    </td>
                    <td>{item.IngredientName}</td>
                    <td>
                      <span className="badge bg-warning">
                        {item.SoLuong || 0}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="text-center">
                    Không có nguyên liệu sắp hết
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
