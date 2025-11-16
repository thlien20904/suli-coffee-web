// frontend/src/components/admin/BestSeller.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Container,
  Row,
  Col,
  Card,
  Badge,
  Button,
  Carousel,
} from "react-bootstrap";
import { getImageUrl, getDefaultImage } from "../../../utils/imageUtils";
import { buildApiUrl } from "../../../utils/apiConfig";
import "../../../styles/components/admin/bestseller.css";

const BestSeller = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(buildApiUrl("/api/home"));
        if (res.data.success) {
          console.log("✅ API /home response:", res.data.data);
          setProducts(res.data.data);
        }
      } catch (err) {
        console.error("❌ Lỗi khi load bestseller:", err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Chia thành slide, 4 sản phẩm mỗi slide
  const chunkArray = (arr, size) => {
    const result = [];
    for (let i = 0; i < arr.length; i += size)
      result.push(arr.slice(i, i + size));
    return result;
  };
  const slides = chunkArray(products, 4);

  return (
    <Container className="mt-4 bestseller-container">
      <h2 className="text-center mb-4">🔥 SẢN PHẨM BÁN CHẠY 🔥</h2>

      {loading ? (
        <p className="text-center">Đang tải dữ liệu...</p>
      ) : products.length === 0 ? (
        <p className="text-center text-danger">Không có dữ liệu</p>
      ) : (
        <Carousel interval={5000} indicators={slides.length > 1}>
          {slides.map((group, slideIndex) => (
            <Carousel.Item key={slideIndex}>
              <Row className="g-4 justify-content-center">
                {group.map((item) => {
                  const imgUrl = getImageUrl(
                    item.DefaultImage || "/images/no-image.png"
                  );
                  return (
                    <Col key={item.ProductID} xs={12} sm={6} md={3}>
                      <Card className="product-card h-100">
                        <div className="thumb-wrap">
                          <Card.Img
                            variant="top"
                            src={imgUrl}
                            onError={(e) => {
                              console.warn(
                                "❌ Image load failed, fallback to default:",
                                imgUrl
                              );
                              e.target.src = getDefaultImage();
                            }}
                            className="product-img"
                            style={{
                              width: "100%",
                              height: "180px",
                              objectFit: "contain",
                              background: "#fdf6ee",
                              borderRadius: "18px",
                              padding: "18px",
                            }}
                          />
                          {item.DiscountPercent > 0 && (
                            <Badge bg="danger" className="discount-badge">
                              -{item.DiscountPercent}%
                            </Badge>
                          )}
                        </div>

                        <Card.Body className="d-flex flex-column">
                          <Card.Title className="product-name">
                            {item.Name}
                          </Card.Title>
                          <Card.Text
                            className="price"
                            style={{ color: "#C19A6B", fontWeight: "bold" }}
                          >
                            {Number(
                              item.DiscountedPrice || item.Price
                            ).toLocaleString()}
                            đ
                          </Card.Text>
                          <Card.Text className="sold">
                            Đã bán: {item.SoldQuantity}
                          </Card.Text>
                          <div className="mt-auto d-flex justify-content-center">
                            <Button
                              href="/admin/Food"
                              variant="outline-dark"
                              size="sm"
                            >
                              Quản lý sản phẩm
                            </Button>
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            </Carousel.Item>
          ))}
        </Carousel>
      )}
    </Container>
  );
};

export default BestSeller;
