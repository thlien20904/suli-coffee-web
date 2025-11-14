// Home.js
import { useEffect, useState, useRef } from "react";
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
import { Link } from "react-router-dom";
import { getImageUrl, getDefaultImage } from "../../utils/imageUtils";
import "../../styles/pages/Home.css";

export default function Home() {
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);

  // Danh sách video banner
  const bannerVideos = [
    { src: "/video/vd6.mp4", alt: "SuLi Coffee Video 1" },
    { src: "/video/vd.mp4", alt: "SuLi Coffee Video 2" },
    { src: "/video/vd2.mp4", alt: "SuLi Coffee Video 3" },
  ];

  const videoRefs = useRef([]);

  useEffect(() => {
    const fetchHome = async () => {
      setLoading(true);
      try {
        const res = await axios.get("http://localhost:5000/api/home");
        console.log("API response:", res.data);
        // Support multiple response shapes: { success:true, data: [...] } or direct array
        const payload =
          res.data && (res.data.data ?? res.data)
            ? res.data.data ?? res.data
            : [];
        setFoods(Array.isArray(payload) ? payload : []);
      } catch (err) {
        // Log helpful details (message + server response body if available)
        console.error("Lỗi khi lấy dữ liệu trang chủ:", {
          message: err?.message,
          responseBody: err?.response?.data,
          status: err?.response?.status,
          stack: err?.stack,
        });
        // show empty list on error to avoid UI crash
        setFoods([]);
      } finally {
        setLoading(false);
      }
    };
    fetchHome();
  }, []);

  const handleSlide = (idx) => {
    videoRefs.current.forEach((v, i) => {
      if (v) {
        if (i === idx) {
          v.play();
        } else {
          v.pause();
          v.currentTime = 0;
        }
      }
    });
  };

  // 4 món / slide
  const itemsPerSlide = 4;
  const totalItems = foods.length;
  const slides = [];
  for (let i = 0; i < totalItems; i += itemsPerSlide) {
    slides.push(foods.slice(i, i + itemsPerSlide));
  }

  return (
    <div className="home-root">
      {/* Banner video carousel */}
      <Carousel
        fade
        className="home-carousel"
        controls={bannerVideos.length > 1}
        indicators={bannerVideos.length > 1}
        interval={6000}
        onSlid={handleSlide}
      >
        {bannerVideos.map((b, idx) => (
          <Carousel.Item key={idx}>
            <div
              style={{
                width: "100%",
                height: "420px",
                overflow: "hidden",
                background: "#222",
              }}
            >
              <video
                ref={(el) => (videoRefs.current[idx] = el)}
                className="d-block w-100"
                src={b.src}
                alt={b.alt}
                autoPlay={idx === 0}
                loop
                muted
                playsInline
                style={{
                  width: "100%",
                  height: "420px",
                  objectFit: "cover",
                  display: "block",
                  background: "#222",
                }}
              />
            </div>
          </Carousel.Item>
        ))}
      </Carousel>

      <Container className="mt-5">
        {/* Sản phẩm bán chạy */}
        <section className="best-sellers">
          <h3 className="text-center" style={{ marginBottom: "20px" }}>
            🔥 SẢN PHẨM BÁN CHẠY 🔥
          </h3>
          {loading ? (
            <div className="text-center py-5">Đang tải sản phẩm...</div>
          ) : foods.length === 0 ? (
            <p className="text-center text-danger">Không có dữ liệu</p>
          ) : (
            <Carousel
              className="carousel-best-sellers"
              data-bs-ride="carousel"
              indicators={slides.length > 1}
              controls={slides.length > 1}
              interval={5000}
            >
              {slides.map((slideItems, slideIndex) => (
                <Carousel.Item key={slideIndex}>
                  <Row className="g-4">
                    {slideItems.map((food) => (
                      <Col key={food.ProductID} xs={12} sm={6} md={3}>
                        <Card className="product-card h-100">
                          <div className="thumb-wrap">
                            <Card.Img
                              variant="top"
                              src={getImageUrl(food.DefaultImage)}
                              onError={(e) => {
                                e.target.src = getDefaultImage();
                                console.log(
                                  "Image load error for:",
                                  food.Name,
                                  food.DefaultImage
                                );
                              }}
                              className="product-img"
                              style={{
                                maxWidth: "100%",
                                height: "180px",
                                display: "block",
                                background: "#fdf6ee",
                                padding: "18px",
                                borderRadius: "18px",
                                objectFit: "contain",
                              }}
                            />

                            {food.DiscountPercent > 0 && (
                              <Badge bg="danger" className="discount-badge">
                                -{food.DiscountPercent}%
                              </Badge>
                            )}
                          </div>
                          <Card.Body className="d-flex flex-column">
                            <Card.Title className="product-name">
                              {food.Name}
                            </Card.Title>
                            <Card.Text
                              className="price"
                              style={{ color: "#C19A6B", fontWeight: "bold" }}
                            >
                              {Number(
                                food.DiscountedPrice || food.Price
                              ).toLocaleString()}
                              đ
                            </Card.Text>

                            {/* Số lượng đã bán bị ẩn theo yêu cầu */}

                            <div className="mt-auto d-flex justify-content-center">
                              <Button
                                as={Link}
                                to={`/product/${food.ProductID}`}
                                variant="outline-dark"
                                size="sm"
                                className="btn-buy"
                              >
                                Xem chi tiết
                              </Button>
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </Carousel.Item>
              ))}
            </Carousel>
          )}
        </section>
      </Container>
    </div>
  );
}
