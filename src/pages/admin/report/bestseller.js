import React, { useEffect, useState } from "react";
import axios from "axios";
import { getImageUrl } from "../../../utils/imageUtils";
import { buildApiUrl } from "../../../utils/apiConfig";
import "../../../styles/components/admin/bestseller.css";

const BestSeller = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Gọi API backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(buildApiUrl("/api/admin/report/banchay"));
        if (res.data.success) {
          setProducts(res.data.data);
        }
      } catch (err) {
        console.error("❌ Lỗi khi load bestseller:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Chia thành từng slide (4 sản phẩm/slide)
  const chunkArray = (arr, size) => {
    const result = [];
    for (let i = 0; i < arr.length; i += size) {
      result.push(arr.slice(i, i + size));
    }
    return result;
  };

  const slides = chunkArray(products, 4);

  return (
    <div className="container mt-4 bestseller-container">
      <h2 className="text-center mb-4">🔥 SẢN PHẨM BÁN CHẠY 🔥</h2>

      {loading ? (
        <p className="text-center">Đang tải dữ liệu...</p>
      ) : products.length === 0 ? (
        <p className="text-center text-danger">Không có dữ liệu</p>
      ) : (
        <div
          id="carouselBestSellers"
          className="carousel slide"
          data-bs-ride="carousel"
          data-bs-interval="2000" // Tự động chạy sau 2 giây
        >
          <div className="carousel-inner">
            {slides.map((group, slideIndex) => (
              <div
                className={`carousel-item ${slideIndex === 0 ? "active" : ""}`}
                key={slideIndex}
              >
                <div className="row justify-content-center g-4">
                  {group.map((item) => (
                    <div className="col-md-3 d-flex" key={item.FoodId}>
                      <div className="product-card">
                        <img
                          src={getImageUrl(item.ImageURL)}
                          alt={item.FoodName}
                          className="product-img"
                        />
                        <h5>{item.FoodName}</h5>
                        <p className="price">
                          {Number(item.Price).toLocaleString()}đ
                        </p>
                        <p className="sold">Đã bán: {item.TotalSold}</p>
                        <a href="/admin/Food" className="btn-buy">
                          Quản lý sản phẩm
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Controls */}
          <button
            className="carousel-control-prev"
            type="button"
            data-bs-target="#carouselBestSellers"
            data-bs-slide="prev"
          >
            <span className="carousel-control-prev-icon" aria-hidden="true" />
            <span className="visually-hidden">Previous</span>
          </button>
          <button
            className="carousel-control-next"
            type="button"
            data-bs-target="#carouselBestSellers"
            data-bs-slide="next"
          >
            <span className="carousel-control-next-icon" aria-hidden="true" />
            <span className="visually-hidden">Next</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default BestSeller;
