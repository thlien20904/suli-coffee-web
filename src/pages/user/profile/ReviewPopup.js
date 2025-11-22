import React, { useState, useEffect } from "react";
import axios from "axios";
import { buildApiUrl } from "../../../utils/apiConfig";
import Swal from "sweetalert2";
import { FaStar, FaStore, FaCamera, FaVideo } from "react-icons/fa";
import "../../../styles/pages/ReviewPopup.css";

const ReviewPopup = ({ orderId, onClose }) => {
  const [items, setItems] = useState([]);
  const [shopInfo, setShopInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reviews, setReviews] = useState({});
  const [shopRating, setShopRating] = useState(5);
  const [shippingRating, setShippingRating] = useState(5);

  useEffect(() => {
    fetchReviewableItems();
  }, [orderId]);

  const fetchReviewableItems = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        buildApiUrl(`/api/profile/order/${orderId}/review`),
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.data.success) {
        const { items, shopInfo } = res.data.data;
        console.log("Review items data:", items);
        setItems(items);
        setShopInfo(shopInfo);
        const initReviews = {};
        items.forEach((item) => {
          initReviews[item.OrderDetailId] = item.review
            ? {
                rating: item.review.Rating,
                comment: item.review.Comment || "",
                images: item.review.Images || [],
                videos: item.review.Videos || [],
              }
            : { rating: 5, comment: "", images: [], videos: [] };
        });
        setReviews(initReviews);
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Loi", "Khong the tai thong tin danh gia", "error");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleRating = (orderDetailId, rating) => {
    setReviews((prev) => ({
      ...prev,
      [orderDetailId]: { ...prev[orderDetailId], rating },
    }));
  };

  const handleComment = (orderDetailId, comment) => {
    setReviews((prev) => ({
      ...prev,
      [orderDetailId]: { ...prev[orderDetailId], comment },
    }));
  };

  const handleImageUpload = (orderDetailId, files) => {
    const currentImages = reviews[orderDetailId]?.images || [];
    const maxNew =
      6 - currentImages.filter((img) => img instanceof File).length;

    if (maxNew <= 0) {
      Swal.fire("Thông báo", "Tối đa 6 ảnh cho mỗi sản phẩm!", "info");
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    const validFiles = [];

    // ✅ CHỈ CHẤP NHẬN: JPG, JPEG, PNG
    const validImageTypes = ["image/jpeg", "image/jpg", "image/png"];
    const validImageExts = [".jpg", ".jpeg", ".png"];

    for (let file of Array.from(files).slice(0, maxNew)) {
      // ✅ Check extension
      const ext = "." + file.name.split(".").pop().toLowerCase();
      if (!validImageExts.includes(ext)) {
        Swal.fire(
          "Lỗi định dạng!",
          `Ảnh "${
            file.name
          }" không đúng định dạng!\n\nChỉ chấp nhận: JPG, JPEG, PNG\nĐịnh dạng hiện tại: ${ext.toUpperCase()}`,
          "error"
        );
        continue;
      }

      // ✅ Check MIME type
      if (!validImageTypes.includes(file.type.toLowerCase())) {
        Swal.fire(
          "Lỗi định dạng!",
          `Ảnh "${file.name}" không đúng định dạng!\n\nChỉ chấp nhận: JPG, JPEG, PNG\nMIME type hiện tại: ${file.type}`,
          "error"
        );
        continue;
      }

      // ✅ Check size
      if (file.size > maxSize) {
        Swal.fire(
          "Lỗi dung lượng!",
          `Ảnh "${file.name}" vượt quá 5MB!\nDung lượng: ${(
            file.size /
            1024 /
            1024
          ).toFixed(2)}MB`,
          "error"
        );
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      setReviews((prev) => ({
        ...prev,
        [orderDetailId]: {
          ...prev[orderDetailId],
          images: [...currentImages, ...validFiles],
        },
      }));
    }
  };

  const handleVideoUpload = (orderDetailId, file) => {
    if (!file) return;

    // ✅ CHỈ CHẤP NHẬN: MP4, MOV, AVI
    const validVideoTypes = ["video/mp4", "video/quicktime", "video/x-msvideo"];
    const validVideoExts = [".mp4", ".mov", ".avi"];

    // ✅ Check extension
    const ext = "." + file.name.split(".").pop().toLowerCase();
    if (!validVideoExts.includes(ext)) {
      Swal.fire(
        "Lỗi định dạng!",
        `Video "${
          file.name
        }" không đúng định dạng!\n\nChỉ chấp nhận: MP4, MOV, AVI\nĐịnh dạng hiện tại: ${ext.toUpperCase()}`,
        "error"
      );
      return;
    }

    // ✅ Check MIME type
    if (!validVideoTypes.includes(file.type.toLowerCase())) {
      Swal.fire(
        "Lỗi định dạng!",
        `Video "${file.name}" không đúng định dạng!\n\nChỉ chấp nhận: MP4, MOV, AVI\nMIME type hiện tại: ${file.type}`,
        "error"
      );
      return;
    }

    // ✅ Check size
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      Swal.fire(
        "Lỗi dung lượng!",
        `Video "${file.name}" vượt quá 50MB!\nDung lượng: ${(
          file.size /
          1024 /
          1024
        ).toFixed(2)}MB`,
        "error"
      );
      return;
    }

    // ✅ Check duration
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      const duration = video.duration;

      if (duration > 60) {
        Swal.fire(
          "Lỗi thời lượng!",
          `Video "${
            file.name
          }" không được dài quá 60 giây!\nThời lượng hiện tại: ${Math.round(
            duration
          )}s`,
          "error"
        );
        return;
      }

      if (reviews[orderDetailId]?.videos.length === 0) {
        setReviews((prev) => ({
          ...prev,
          [orderDetailId]: { ...prev[orderDetailId], videos: [file] },
        }));
      } else {
        Swal.fire("Thông báo", "Tối đa 1 video cho mỗi sản phẩm!", "info");
      }
    };
    video.onerror = () => {
      Swal.fire(
        "Lỗi!",
        "Không thể đọc thông tin video. Vui lòng thử file khác!",
        "error"
      );
    };
    video.src = URL.createObjectURL(file);
  };

  const removeMedia = (orderDetailId, type, index) => {
    setReviews((prev) => ({
      ...prev,
      [orderDetailId]: {
        ...prev[orderDetailId],
        [type]: prev[orderDetailId][type].filter((_, i) => i !== index),
      },
    }));
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);

    const formData = new FormData();
    formData.append("orderId", orderId);
    formData.append("shopRating", shopRating);
    formData.append("shippingRating", shippingRating);

    try {
      const reviewList = Object.keys(reviews)
        .map((key) => {
          const orderDetailId = parseInt(key);
          if (isNaN(orderDetailId)) {
            console.warn("Invalid OrderDetailId:", key);
            return null;
          }

          const r = reviews[key];
          const commentLength = r.comment.trim().length;

          if (
            r.rating < 1 &&
            !r.comment.trim() &&
            r.images.length === 0 &&
            r.videos.length === 0
          )
            return null;

          if (commentLength > 0 && commentLength < 10) {
            Swal.fire(
              "Thong bao",
              "Binh luan qua ngan! Vui long viet it nhat 10 ky tu de chia se cam nhan cua ban.",
              "warning"
            );
            throw new Error("Comment too short");
          }

          const newImages = r.images.filter((media) => media instanceof File);
          if (newImages.length > 0) {
            console.log(
              "Appending",
              newImages.length,
              "images for OrderDetailId",
              orderDetailId
            );
            newImages.forEach((file) => {
              formData.append("images_" + orderDetailId, file);
            });
          }

          const newVideos = r.videos.filter((video) => video instanceof File);
          if (newVideos.length > 0) {
            console.log("Appending video for OrderDetailId", orderDetailId);
            formData.append("videos_" + orderDetailId, newVideos[0]);
          }

          return {
            OrderDetailId: orderDetailId,
            Rating: r.rating,
            Comment: r.comment.trim() || null,
          };
        })
        .filter(Boolean);

      if (reviewList.length === 0) {
        Swal.fire(
          "Chua danh gia",
          "Vui long danh gia it nhat 1 san pham (sao hoac comment hoac anh/video)",
          "warning"
        );
        setSubmitting(false);
        return;
      }

      formData.append("reviews", JSON.stringify(reviewList));

      console.log("Final FormData entries:");
      for (let [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(
            key +
              ": [File] " +
              value.name +
              " (" +
              (value.size / 1024).toFixed(2) +
              " KB)"
          );
        } else {
          console.log(key + ":", value);
        }
      }

      const token = localStorage.getItem("token");
      const res = await axios.post(
        buildApiUrl("/api/profile/order/review"),
        formData,
        {
          headers: {
            Authorization: "Bearer " + token,
          },
        }
      );

      if (res.data.success) {
        Swal.fire({
          icon: "success",
          title: "Thanh cong!",
          text: "Danh gia da duoc gui - Ban nhan duoc 200 xu!",
          timer: 2500,
          showConfirmButton: false,
        });
        onClose();
      }
    } catch (err) {
      console.error("Submit review error:", err);
      if (err.message === "Comment too short") {
        // Already shown alert
      } else if (err.response?.status === 400 || err.response?.status === 409) {
        Swal.fire(
          "Loi",
          err.response.data.message ||
            "Du lieu khong hop le (kiem tra anh/video)",
          "error"
        );
      } else if (
        err.code === "ERR_BAD_RESPONSE" ||
        err.response?.status === 500
      ) {
        Swal.fire(
          "Loi server",
          "Co van de upload file. Thu lai voi it anh hon.",
          "error"
        );
      } else {
        Swal.fire("Loi", "Khong the gui danh gia. Vui long thu lai!", "error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center p-5">Dang tai thong tin danh gia...</div>
    );
  }

  return (
    <div className="review-popup-overlay" onClick={onClose}>
      <div className="review-popup" onClick={(e) => e.stopPropagation()}>
        <div className="review-header">
          <h4>Danh Gia San Pham</h4>
          <button className="close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        {shopInfo && (
          <div className="shop-info-banner">
            <FaStore className="shop-icon" />
            <div className="shop-details">
              <strong>
                {shopInfo.CuaHangName || "SuLi Coffee HN Xuan Thuy"}
              </strong>
              <div>
                {shopInfo.Address || "10 Xuan Thuy"},{" "}
                {shopInfo.Ward || "Phuong Dich Vong Hau"},{" "}
                {shopInfo.District || "Cau Giay"},{" "}
                {shopInfo.Province || "Ha Noi"}
              </div>
            </div>
          </div>
        )}

        <div className="review-banner">
          <FaStar className="banner-star" />
          <strong>Danh gia chi tiet de nhan ngay 200 xu!</strong>
        </div>

        <div className="review-items">
          {items.map((item) => {
            const r = reviews[item.OrderDetailId] || {
              rating: 5,
              comment: "",
              images: [],
              videos: [],
            };
            return (
              <div key={item.OrderDetailId} className="review-item-card">
                <div className="item-info">
                  <img
                    src={item.ImageUrl || "/placeholder-food.jpg"}
                    alt={item.FoodName}
                  />
                  <div>
                    <strong>{item.FoodName}</strong>
                    {item.SizeName && (
                      <div className="size">Size: {item.SizeName}</div>
                    )}
                    {item.Toppings && item.Toppings.length > 0 && (
                      <div className="toppings">
                        Phan them: {item.Toppings.join(", ")}
                      </div>
                    )}
                  </div>
                </div>

                <div className="review-section">
                  <div className="label">Chat luong san pham</div>
                  <div className="stars">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <FaStar
                        key={star}
                        className={
                          "star-icon" + (star <= r.rating ? " active" : "")
                        }
                        onClick={() => handleRating(item.OrderDetailId, star)}
                      />
                    ))}
                    <span className="rating-text">
                      {r.rating >= 5
                        ? "Tuyet voi"
                        : r.rating >= 4
                        ? "Rat tot"
                        : r.rating >= 3
                        ? "Tot"
                        : "Tam duoc"}
                    </span>
                  </div>

                  <textarea
                    placeholder="Chia se trai nghiem cua ban ve mon nay nhe..."
                    value={r.comment}
                    onChange={(e) =>
                      handleComment(item.OrderDetailId, e.target.value)
                    }
                    rows="4"
                  />

                  <div className="upload-area">
                    <label className="upload-btn photo">
                      <FaCamera /> Them anh (
                      {r.images.filter((img) => img instanceof File).length}/6)
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                        multiple
                        onChange={(e) =>
                          handleImageUpload(item.OrderDetailId, e.target.files)
                        }
                      />
                    </label>
                    <label className="upload-btn video">
                      <FaVideo /> Them video {r.videos.length > 0 ? "(1)" : ""}
                      <input
                        type="file"
                        accept=".mp4,.mov,.avi,video/mp4,video/quicktime,video/x-msvideo"
                        onChange={(e) =>
                          handleVideoUpload(
                            item.OrderDetailId,
                            e.target.files[0]
                          )
                        }
                      />
                    </label>
                  </div>

                  <div className="media-preview">
                    {r.images.map((media, idx) => (
                      <div key={idx} className="media-thumb">
                        <img
                          src={
                            typeof media === "string"
                              ? media
                              : URL.createObjectURL(media)
                          }
                          alt="preview"
                        />
                        <button
                          onClick={() =>
                            removeMedia(item.OrderDetailId, "images", idx)
                          }
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                    {r.videos.map((media, idx) => (
                      <div key={idx} className="media-thumb video">
                        <video
                          src={
                            typeof media === "string"
                              ? media
                              : URL.createObjectURL(media)
                          }
                          controls
                        />
                        <button
                          onClick={() =>
                            removeMedia(item.OrderDetailId, "videos", idx)
                          }
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="tip">
                    Viet it nhat 20 ky tu + 1 anh/video de nhan 200 xu! (Video
                    max 60s, anh max 5MB)
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="review-services">
          <div className="service-section">
            <div className="label">Dich vu cua nguoi ban</div>
            <div className="stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <FaStar
                  key={star}
                  className={
                    "star-icon" + (star <= shopRating ? " active" : "")
                  }
                  onClick={() => setShopRating(star)}
                />
              ))}
              <span className="rating-text">
                {shopRating >= 5
                  ? "Tuyet voi"
                  : shopRating >= 4
                  ? "Rat tot"
                  : shopRating >= 3
                  ? "Tot"
                  : "Tam duoc"}
              </span>
            </div>
          </div>
          <div className="service-section">
            <div className="label">Dich vu van chuyen</div>
            <div className="stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <FaStar
                  key={star}
                  className={
                    "star-icon" + (star <= shippingRating ? " active" : "")
                  }
                  onClick={() => setShippingRating(star)}
                />
              ))}
              <span className="rating-text">
                {shippingRating >= 5
                  ? "Tuyet voi"
                  : shippingRating >= 4
                  ? "Rat tot"
                  : shippingRating >= 3
                  ? "Tot"
                  : "Tam duoc"}
              </span>
            </div>
          </div>
        </div>

        <div className="review-footer">
          <div className="actions">
            <button className="btn-back" onClick={onClose}>
              Tro lai
            </button>
            <button
              className="btn-submit"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? "Dang gui..." : "HOAN THANH"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewPopup;
