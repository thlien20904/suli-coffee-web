import React from "react";
import { Container, Row, Col, Image, Card } from "react-bootstrap";

const COFFEE_IMG = "/images/cafe1.png";
const MILESTONE_IMG1 = "/images/gt.png";
const MILESTONE_IMG2 = "/images/gt3.png";
const MILESTONE_IMG3 = "/images/gt5.png";

/* Fallback SVG nếu ảnh không có */
const FALLBACK_DATA_URI =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='800'>
      <rect width='100%' height='100%' fill='#fff'/>
      <text x='50%' y='48%' font-family='Georgia,serif' font-size='30' text-anchor='middle' fill='#e91e63'>SuLi Coffee</text>
      <text x='50%' y='56%' font-family='Arial' font-size='16' text-anchor='middle' fill='#777'>Hình ảnh đang tải…</text>
    </svg>`
  );

export default function About() {
  const onImgError = (e) => {
    e.currentTarget.src = FALLBACK_DATA_URI;
  };

  return (
    <>
      {/* --- PHẦN 1: CÂU CHUYỆN & NGUYÊN LIỆU --- */}
      <section className="about-section py-5">
        <Container>
          <h2 className="about-title text-center mb-4">
            SULI VÀ NHỮNG ĐIỀU KHÁC BIỆT
          </h2>

          <Row className="align-items-center gx-4">
            <Col md={4} className="about-col">
              <h3 className="about-subtitle">CÂU CHUYỆN THƯƠNG HIỆU</h3>
              <p className="about-text">
                Nốt Hương Đặc Sản - SuLi luôn trân quý, nâng niu những giá trị
                Nguyên Bản ở mỗi vùng đất mà chúng tôi đi qua, nơi tâm hồn được
                đồng điệu với thiên nhiên, với nỗi vất vả nhọc nhằn của người
                nông dân; cảm nhận được hết thảy những tầng hương ẩn sâu trong
                từng nguyên liệu.
              </p>
              <p className="about-text">
                Một chặng đường dài đang chờ phía trước, SuLi đã sẵn sàng viết
                tiếp câu chuyện Nốt Hương Đặc Sản – Nguyên Bản – Thủ Công đầy
                cảm hứng và càng tự hào hơn khi được mang sứ mệnh: “Đánh thức
                những nốt hương đặc sản của nông sản Việt Nam”.
              </p>
            </Col>

            <Col md={4} className="d-flex justify-content-center mb-4 mb-md-0">
              <div className="center-image-wrap">
                <Image
                  src={COFFEE_IMG}
                  alt="Ly cà phê SuLi"
                  rounded
                  fluid
                  onError={onImgError}
                  className="center-image"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            </Col>

            <Col md={4} className="about-col">
              <h3 className="about-subtitle">NGUYÊN LIỆU ĐẶC SẢN</h3>
              <p className="about-text">
                Trà Ô Long đặc sản tại SuLi còn được ươm trồng với phương pháp
                chăm bón hữu cơ, hoàn toàn với trứng gà, đậu nành và thu hái thủ
                công để có được những búp trà tươi và non nhất, tạo nên điểm
                khác biệt mạnh mẽ so với các thương hiệu khác.
              </p>
              <p className="about-text">
                Có thể nói, dòng trà đặc sản của SuLi luôn giữ được hương vị
                thơm ngon nguyên bản nhất và được nhiều người biết đến như một
                nguồn nguyên liệu tinh hoa của Đà Lạt.
              </p>
            </Col>
          </Row>
        </Container>
      </section>

      {/* --- PHẦN 2: THÀNH TỰU NỔI BẬT --- */}
      <section className="achievements-section py-5 bg-light">
        <Container>
          <h2 className="text-center achievements-title mb-5">
            Thành tựu nổi bật và đáng tự hào
          </h2>

          <Row className="text-center g-4">
            <Col md={4}>
              <Card className="achievement-card h-100 p-4">
                <div className="achievement-icon">👁️</div>
                <h3 className="achievement-number">210.000+</h3>
                <p className="achievement-text">
                  Sản phẩm được bán ra trên thị trường trong vòng 5 tháng kinh
                  doanh trong tình hình dịch bệnh căng thẳng
                </p>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="achievement-card h-100 p-4">
                <div className="achievement-icon">💬</div>
                <h3 className="achievement-number">5836</h3>
                <p className="achievement-text">
                  Lần được nhắc đến trên Facebook và Instagram trong 4 tháng
                  (theo Sprout Social)
                </p>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="achievement-card h-100 p-4">
                <div className="achievement-icon">💖</div>
                <h3 className="achievement-number">98%</h3>
                <p className="achievement-text">
                  Khách hàng hài lòng về chất lượng sản phẩm và dịch vụ của SuLi
                  (theo đánh giá trên Baemin và Shopee Fresh)
                </p>
              </Card>
            </Col>
          </Row>
        </Container>
      </section>

      {/* --- PHẦN 3: NHỮNG DẤU ẤN TRONG HÀNH TRÌNH --- */}
      <section className="milestone-section py-5">
        <Container>
          <h2 className="text-center milestone-title mb-5">
            Những dấu ấn trong hành trình của chúng tôi
          </h2>

          <Row className="g-4 justify-content-center">
            <Col md={4} sm={6}>
              <Card className="milestone-card h-100">
                <Card.Body>
                  <p className="milestone-date">8/2020</p>
                  <Image
                    src={MILESTONE_IMG1}
                    alt="SuLi và những bước đi đầu tiên"
                    fluid
                    rounded
                    className="mb-3"
                    onError={onImgError}
                  />
                  <Card.Title>SuLi và những bước đi đầu tiên</Card.Title>
                  <Card.Text>
                    Thương hiệu SuLi được đăng ký bảo hộ độc quyền tại Việt Nam
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>

            <Col md={4} sm={6}>
              <Card className="milestone-card h-100">
                <Card.Body>
                  <p className="milestone-date">8/3/2021</p>
                  <Image
                    src={MILESTONE_IMG2}
                    alt="Ra mắt thị trường"
                    fluid
                    rounded
                    className="mb-3"
                    onError={onImgError}
                  />
                  <Card.Title>Ra mắt thị trường</Card.Title>
                  <Card.Text>
                    SuLi chính thức xuất hiện trên thị trường với cửa hàng đầu
                    tiên tại Phạm Ngọc Thạch
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>

            <Col md={4} sm={6}>
              <Card className="milestone-card h-100">
                <Card.Body>
                  <p className="milestone-date">16/3/2021</p>
                  <Image
                    src={MILESTONE_IMG3}
                    alt="Phủ sóng các kênh bán hàng online"
                    fluid
                    rounded
                    className="mb-3"
                    onError={onImgError}
                  />
                  <Card.Title>Phủ sóng các kênh bán hàng online</Card.Title>
                  <Card.Text>
                    Lần lượt xuất hiện trên các ứng dụng giao hàng hàng đầu như
                    Baemin và Shopee Fresh
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </section>

      {/* --- CSS --- */}
      <style>{`
        .about-section {
          background: #fff;
          padding-bottom: 40px;

        }
        .about-title {
          color: #e91e63;
          font-weight: 700;
          letter-spacing: 1px;
          font-size: 22px;
          margin-bottom: 30px;
                    padding-top: 40px;

        }
        .about-subtitle {
          color: #333;
          font-weight: 700;
          font-size: 18px;
          margin-bottom: 12px;
        }
        .about-text {
          color: #666;
          line-height: 1.7;
          text-align: justify;
          margin-bottom: 14px;
        }
        .center-image-wrap {
          width: 260px;
          height: 260px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #fff;
          border-radius: 14px;
          box-shadow: 0 6px 20px rgba(0,0,0,0.06);
          padding: 8px;
        }
        .center-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 10px;
        }

        /* Thành tựu nổi bật */
        .achievements-title {
          color: #e91e63;
          font-weight: 700;
          font-size: 22px;
        }
        .achievement-card {
          border: none;
          border-radius: 16px;
          box-shadow: 0 6px 20px rgba(0,0,0,0.06);
          background: #fff;
          transition: transform 0.2s;
        }
        .achievement-card:hover {
          transform: translateY(-4px);
        }
        .achievement-icon {
          font-size: 36px;
          color: #e91e63;
          margin-bottom: 12px;
        }
        .achievement-number {
          color: #333;
          font-weight: 700;
          font-size: 24px;
        }
        .achievement-text {
          color: #666;
          font-size: 15px;
          line-height: 1.6;
        }

        /* Dấu ấn hành trình */
        .milestone-title {
          color: #000;
          font-weight: 700;
          font-size: 22px;
        }
        .milestone-card {
          border: none;
          border-radius: 14px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.05);
          transition: transform 0.2s;
        }
        .milestone-card:hover {
          transform: translateY(-5px);
        }
        .milestone-date {
          color: #e91e63;
          font-weight: 700;
          font-size: 14px;
          margin-bottom: 8px;
        }
        /* Căn giữa ảnh trong milestone-card */
        .milestone-card img {
          display: block;
          margin: 0 auto 16px auto; /* căn giữa ngang + khoảng cách dưới */
          width: 80%;
          height: auto;
          object-fit: cover;
          border-radius: 10px;
        }

        /* Responsive */
        @media (max-width: 767.98px) {
          .about-title, .achievements-title, .milestone-title {
            font-size: 20px;
          }
          .center-image-wrap {
            width: 220px;
            height: 220px;
            margin: 0 auto;
          }
          .about-col {
            margin-top: 20px;
          }
        }
      `}</style>
    </>
  );
}
