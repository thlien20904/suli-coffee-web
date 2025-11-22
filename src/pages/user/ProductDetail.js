import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Row, Col, Button, Spinner, Alert, Form } from "react-bootstrap";
import { useDispatch } from "react-redux";
import { setCartCount } from "../../redux/userSlice";
import { getImageUrl, getDefaultImage } from "../../utils/imageUtils";
import {
  API_BASE_URL,
  API_ENDPOINTS,
  buildApiUrl,
} from "../../utils/apiConfig";
import { useSuccessBanner } from "../../components/SuccessBanner";
import "../../styles/pages/ProductDetail.css";

const PLACEHOLDER = "/placeholder.jpg";

const fmtVND = (n) =>
  typeof n === "number"
    ? n.toLocaleString("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
      })
    : "";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { showBanner, BannerContainer } = useSuccessBanner();

  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState(null);
  const [sizes, setSizes] = useState([]);
  const [toppings, setToppings] = useState([]);
  const [related, setRelated] = useState([]);
  const [error, setError] = useState("");

  // Lựa chọn người dùng
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedToppings, setSelectedToppings] = useState([]);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!id) return;
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const { data } = await axios.get(buildApiUrl(`/api/products/${id}`));
        if (data.success) {
          const pdata = data.data; // data.data mới chứa product, sizes, toppings, related
          setProduct(pdata.product);
          setSizes(pdata.sizes || []);
          setToppings(pdata.toppings || []);
          setRelated(pdata.related || []);
          setSelectedSize(pdata.sizes?.[0]?.SizeID || null); // chọn size đầu tiên
        } else {
          setError(data.message || "Không tải được chi tiết sản phẩm");
        }
      } catch (e) {
        console.error("FETCH PRODUCT ERROR:", e);
        setError("Không tải được chi tiết sản phẩm");
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  const handleToggleTopping = (tid) => {
    setSelectedToppings((prev) =>
      prev.includes(tid) ? prev.filter((x) => x !== tid) : [...prev, tid]
    );
  };

  const handleAddToCart = async () => {
    if (!selectedSize && product.CategoryId !== 4) {
      alert("Vui lòng chọn size!");
      return;
    }
    if (quantity < 1) {
      alert("Số lượng phải lớn hơn 0!");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      showBanner("Bạn chưa đăng nhập! Đang chuyển đến trang đăng nhập...", 2000);
      setTimeout(() => navigate("/login"), 2000);
      return;
    }

    const payload = {
      productId: product.FoodId,
      sizeId: selectedSize,
      toppingIds: selectedToppings,
      quantity,
    };

    try {
      const res = await axios.post(buildApiUrl("/api/cart/add"), payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.data.success) {
        // Cập nhật số lượng giỏ hàng
        const cartRes = await axios.get(buildApiUrl("/api/cart"), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (cartRes.data && cartRes.data.cart) {
          const total = cartRes.data.cart.reduce(
            (sum, item) => sum + (item.SoLuong ?? 0),
            0
          );
          dispatch(setCartCount(total));
        }

        showBanner("✓ Đã thêm vào giỏ hàng thành công!");
      }
    } catch (err) {
      console.error("ADD TO CART ERROR:", err.response?.data || err);
      const msg =
        err.response?.data?.message ||
        err.response?.data ||
        err.message ||
        "Có lỗi xảy ra, vui lòng thử lại.";
      if (err.response?.status === 401) {
        showBanner(msg + " - Đang chuyển đến trang đăng nhập...", 2500);
        setTimeout(() => navigate("/login"), 2500);
      } else {
        alert(msg);
      }
    }
  };

  const handleBuyNow = () => {
    if (!selectedSize && product.CategoryId !== 4) {
      alert("Vui lòng chọn size!");
      return;
    }
    if (quantity < 1) {
      alert("Số lượng phải lớn hơn 0!");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      showBanner("Bạn chưa đăng nhập! Đang chuyển đến trang đăng nhập...", 2000);
      setTimeout(() => navigate("/login"), 2000);
      return;
    }

    // Tạo object item khớp với định dạng của Checkout.js
    const selectedSizeObj =
      sizes.find((s) => s.SizeID === selectedSize) || null;
    const selectedToppingObjs = toppings.filter((t) =>
      selectedToppings.includes(t.ToppingID)
    );

    const item = {
      FoodId: product.FoodId,
      FoodName: product.FoodName,
      ImageURL: product.ImageURL,
      Price: product.Price,
      DiscountPrice: product.DiscountPrice,
      Size: selectedSizeObj
        ? {
            SizeID: selectedSizeObj.SizeID,
            SizeName: selectedSizeObj.SizeName,
            ExtraPrice: selectedSizeObj.ExtraPrice,
          }
        : null,
      Toppings: selectedToppingObjs.map((t) => ({
        ToppingID: t.ToppingID,
        ToppingName: t.ToppingName,
        ToppingPrice: t.ToppingPrice,
      })),
      SoLuong: quantity,
    };

    // Chuyển hướng đến checkout với dữ liệu item
    navigate("/checkout", { state: { items: [item] } });
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <Spinner animation="border" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-5">
        <Alert variant="danger">{error}</Alert>
      </div>
    );
  }

  if (!product) return null;

  const discountedPrice = product.DiscountPrice ?? product.Price;

  return (
    <>
      <BannerContainer />
    <div className="container py-4 product-detail-page">
      {/* SỬA CHỮA CHÍNH: Thêm align-items-start vào Row để các cột căn trên */}
      <Row className="g-4 align-items-start">
        {/* Ảnh sản phẩm */}
        <Col md={5} className="text-center">
          <img
            src={getImageUrl(product.ImageURL)}
            alt={product.FoodName}
            className="product-image"
            onError={(e) => (e.currentTarget.src = getDefaultImage())}
          />
        </Col>

        {/* Thông tin sản phẩm */}
        <Col md={7}>
          <h2 className="product-name">{product.FoodName}</h2>
          <p className="product-price">{fmtVND(discountedPrice)}</p>

          {/* Size (bắt buộc nếu không phải bánh/snack) */}
          {product.CategoryId !== 4 && (
            <>
              <p>Chọn size (bắt buộc):</p>
              <div className="d-flex flex-wrap mb-3">
                {sizes.map((s) => (
                  <button
                    key={s.SizeID}
                    className={`size-option btn btn-outline-dark me-2 mb-2 ${
                      selectedSize === s.SizeID ? "active" : ""
                    }`}
                    onClick={() => setSelectedSize(s.SizeID)}
                  >
                    {s.SizeName} (+{fmtVND(s.ExtraPrice)})
                  </button>
                ))}
              </div>

              {/* Topping */}
              <p>Topping:</p>
              <div className="d-flex flex-wrap mb-3">
                {toppings.map((t) => (
                  <button
                    key={t.ToppingID}
                    className={`topping-option btn btn-outline-secondary me-2 mb-2 ${
                      selectedToppings.includes(t.ToppingID) ? "active" : ""
                    }`}
                    onClick={() => handleToggleTopping(t.ToppingID)}
                  >
                    {t.ToppingName} (+{fmtVND(t.ToppingPrice)})
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Số lượng */}
          <div className="quantity-container mb-3">
            <label className="me-2">Số lượng:</label>
            <Form.Control
              type="number"
              value={quantity}
              min={1}
              onChange={(e) => setQuantity(Number(e.target.value))}
              // SỬA CHỮA CHÍNH: Xóa inline style và thay bằng class Bootstrap
              className="w-auto"
            />
          </div>

          {/* Nút hành động */}
          <div className="d-flex gap-3">
            <Button variant="success" onClick={handleBuyNow}>
              Mua ngay
            </Button>
            <Button variant="primary" onClick={handleAddToCart}>
              Thêm vào giỏ hàng
            </Button>
          </div>
        </Col>
      </Row>

      {/* Mô tả sản phẩm */}
      <div className="container-fluid bg-light mt-5 py-4 text-center">
        <h2>Mô tả sản phẩm</h2>
        <p>{product.Description}</p>
      </div>

      {/* Sản phẩm liên quan */}
      <div className="container-fluid bg-white py-4 text-center">
        <h2>Sản phẩm liên quan</h2>
        <div className="d-flex justify-content-center flex-wrap">
          {related && related.length > 0 ? (
            related.map((item) => (
              <a
                key={item.FoodId}
                href={`/product/${item.FoodId}`}
                className="related-item p-2 m-2"
                style={{
                  width: "150px",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <img
                  src={getImageUrl(item.ImageURL)}
                  alt={item.FoodName}
                  className="related-image rounded"
                  onError={(e) => (e.currentTarget.src = getDefaultImage())}
                />
                <p className="related-name mt-2">{item.FoodName}</p>
                <p className="related-price text-muted">{fmtVND(item.Price)}</p>
              </a>
            ))
          ) : (
            <p>Không có sản phẩm liên quan.</p>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
