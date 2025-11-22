// components/profile/ReviewDetailPopup.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { buildApiUrl } from "../../../utils/apiConfig";
import Swal from "sweetalert2";
import ReviewPopup from "./ReviewPopup"; // Dùng lại popup đánh giá để sửa
import "../../../styles/pages/ReviewDetailPopup.css";

const ReviewDetailPopup = ({ orderId, onClose }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditPopup, setShowEditPopup] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, [orderId]);

  const fetchReviews = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        buildApiUrl(`/api/profile/order/${orderId}/review`),
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        const items = res.data.data.items;
        const reviewedItems = items
          .filter((item) => item.review)
          .map((item) => ({
            ...item,
            ...item.review,
            FoodImage: item.ImageUrl,
            FoodName: item.FoodName,
            SizeName: item.SizeName,
            Toppings: item.Toppings,
            UserInfo: item.review?.User || {}, // ✅ Lấy user info từ review
          }));
        console.log("📄 Reviewed items:", reviewedItems);
        setReviews(reviewedItems);
      }
    } catch (err) {
      console.error("❌ Fetch reviews error:", err);
      Swal.fire("Lỗi", "Không tải được đánh giá", "error");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date
      .toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
      .replace(",", " -");
  };

  const renderStars = (rating) => {
    return "★★★★★".substring(0, rating) + "☆☆☆☆☆".substring(rating);
  };

  if (loading)
    return <div className="text-center p-5">Đang tải đánh giá...</div>;

  return (
    <>
      <div className="review-detail-overlay" onClick={onClose}>
        <div
          className="review-detail-popup"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="popup-header">
            <h4>Đánh Giá Shop</h4>
            <button className="close-x" onClick={onClose}>
              ×
            </button>
          </div>

          <div className="reviews-list">
            {reviews.length === 0 ? (
              <p className="text-center text-muted py-5">
                Bạn chưa có đánh giá nào cho đơn hàng này
              </p>
            ) : (
              reviews.map((r) => (
                <div key={r.ReviewId} className="review-card">
                  <div className="review-header-info">
                    <div className="user-avatar">
                      <img
                        src={r.UserInfo?.AvatarUrl || "/default-avatar.png"}
                        alt={r.UserInfo?.Username || "User"}
                        onError={(e) => {
                          e.target.src = "/default-avatar.png";
                        }}
                      />
                    </div>
                    <div className="user-info">
                      <div className="username">
                        {r.UserInfo?.FullName || r.UserInfo?.Username || "Bạn"}
                      </div>
                      <div className="rating">
                        <span className="stars">{renderStars(r.Rating)}</span>
                      </div>
                      <div className="date">
                        {formatDate(r.CreatedAt || new Date())}
                      </div>
                    </div>
                    <button
                      className="edit-btn"
                      onClick={() => setShowEditPopup(true)}
                    >
                      Sửa
                    </button>
                  </div>

                  <div className="product-info">
                    <img
                      src={r.FoodImage || "/placeholder.jpg"}
                      alt={r.FoodName}
                    />
                    <div>
                      <strong>{r.FoodName}</strong>
                      {r.SizeName && (
                        <div className="size">Phân loại: {r.SizeName}</div>
                      )}
                      {r.Toppings.length > 0 && (
                        <div className="toppings">
                          Phần thêm: {r.Toppings.join(", ")}
                        </div>
                      )}
                    </div>
                  </div>

                  {r.Comment && <div className="comment">{r.Comment}</div>}

                  {(r.Images?.length > 0 || r.Videos?.length > 0) && (
                    <div className="media-grid">
                      {r.Images?.map((img, i) => (
                        <img key={`img-${i}`} src={img} alt="Review" />
                      ))}
                      {r.Videos?.map((vid, i) => (
                        <video key={`vid-${i}`} controls>
                          <source src={vid} />
                        </video>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="popup-footer">
            <button className="btn-ok" onClick={onClose}>
              OK
            </button>
          </div>
        </div>
      </div>

      {/* Dùng lại ReviewPopup để sửa */}
      {showEditPopup && (
        <ReviewPopup
          orderId={orderId}
          onClose={() => {
            setShowEditPopup(false);
            fetchReviews(); // Reload lại sau khi sửa xong
            onClose();
          }}
        />
      )}
    </>
  );
};

export default ReviewDetailPopup;
