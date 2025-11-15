import React, { useEffect, useState } from "react";
import axios from "axios";
import { Bar } from "react-chartjs-2";
import { buildApiUrl } from "../../../utils/apiConfig";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
} from "chart.js";

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale
);

const RevenueReport = () => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);

  const [dailyRevenue, setDailyRevenue] = useState([]);
  const [weeklyRevenue, setWeeklyRevenue] = useState([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState([]);

  const [loading, setLoading] = useState(true);

  const fetchRevenue = async (type, setData) => {
    try {
      setLoading(true);
      const res = await axios.get(
        buildApiUrl(
          `/api/admin/report/revenue?year=${year}&month=${month}&type=${type}`
        )
      );
      if (res.data.success) {
        setData(res.data.revenueData || []);
      }
    } catch (err) {
      console.error("❌ Lỗi fetch revenue:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRevenue("day", setDailyRevenue);
    fetchRevenue("week", setWeeklyRevenue);
    fetchRevenue("month", setMonthlyRevenue);
  }, [year, month]);

  const dayLabels = [
    "Thứ 2",
    "Thứ 3",
    "Thứ 4",
    "Thứ 5",
    "Thứ 6",
    "Thứ 7",
    "Chủ nhật",
  ];
  const monthLabels = [
    "Tháng 1",
    "Tháng 2",
    "Tháng 3",
    "Tháng 4",
    "Tháng 5",
    "Tháng 6",
    "Tháng 7",
    "Tháng 8",
    "Tháng 9",
    "Tháng 10",
    "Tháng 11",
    "Tháng 12",
  ];

  const chartOptions = (xTitle) => ({
    responsive: true,
    plugins: { legend: { position: "top" } },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: "Doanh thu (VND)" },
      },
      x: { title: { display: true, text: xTitle } },
    },
  });

  return (
    <div className="container mt-4">
      <h2>📊 Thống kê Doanh Thu</h2>

      {/* Chọn năm & tháng */}
      <div className="mb-3">
        <label>Chọn Năm: </label>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="form-control d-inline-block ms-2"
          style={{ width: "150px" }}
        >
          {[...Array(5)].map((_, i) => {
            const y = currentYear - i;
            return (
              <option key={y} value={y}>
                {y}
              </option>
            );
          })}
        </select>

        <label className="ms-3">Chọn Tháng: </label>
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="form-control d-inline-block ms-2"
          style={{ width: "150px" }}
        >
          {monthLabels.map((m, i) => (
            <option key={i + 1} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {/* Doanh thu theo ngày trong tuần */}
      <div className="card mb-4">
        <div className="card-body">
          <h4>Theo ngày trong tuần</h4>
          {loading ? (
            <p>Đang tải dữ liệu...</p>
          ) : (
            <Bar
              data={{
                labels: dayLabels,
                datasets: [
                  {
                    label: "Doanh thu theo ngày trong tuần",
                    data: dailyRevenue.map((d) => Number(d.TotalRevenue) || 0),
                    backgroundColor: "rgba(54, 162, 235, 0.5)",
                    borderColor: "rgba(54, 162, 235, 1)",
                    borderWidth: 1,
                  },
                ],
              }}
              height={100}
              options={chartOptions("Ngày trong tuần")}
            />
          )}
        </div>
      </div>

      {/* Doanh thu theo tuần trong tháng */}
      <div className="card mb-4">
        <div className="card-body">
          <h4>Theo tuần trong tháng</h4>
          {loading ? (
            <p>Đang tải dữ liệu...</p>
          ) : (
            <Bar
              data={{
                labels: ["Tuần 1", "Tuần 2", "Tuần 3", "Tuần 4", "Tuần 5"],
                datasets: [
                  {
                    label: `Doanh thu theo tuần (Tháng ${month})`,
                    data: weeklyRevenue.map((w) => Number(w.TotalRevenue) || 0),
                    backgroundColor: "rgba(75, 192, 192, 0.5)",
                    borderColor: "rgba(75, 192, 192, 1)",
                    borderWidth: 1,
                  },
                ],
              }}
              height={100}
              options={chartOptions("Tuần")}
            />
          )}
        </div>
      </div>

      {/* Doanh thu theo tháng trong năm */}
      <div className="card mb-4">
        <div className="card-body">
          <h4>Theo tháng trong năm</h4>
          {loading ? (
            <p>Đang tải dữ liệu...</p>
          ) : (
            <Bar
              data={{
                labels: monthLabels,
                datasets: [
                  {
                    label: `Doanh thu theo tháng (${year})`,
                    data: monthlyRevenue.map(
                      (m) => Number(m.TotalRevenue) || 0
                    ),
                    backgroundColor: "rgba(255, 99, 132, 0.5)",
                    borderColor: "rgba(255, 99, 132, 1)",
                    borderWidth: 1,
                  },
                ],
              }}
              height={100}
              options={chartOptions("Tháng")}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default RevenueReport;
