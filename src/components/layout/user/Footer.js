import { Container, Row, Col } from "react-bootstrap";
import "../../../styles/components/Footer.css";

const Footer = () => {
  return (
    <footer className="footer">
      <Container>
        <Row>
          {/* Giới thiệu */}
          <Col md={3}>
            <h5>Giới thiệu</h5>
            <ul className="list-unstyled">
              <li>
                <a href="/about">Về Chúng Tôi</a>
              </li>
              <li>
                <a href="/products">Sản phẩm</a>
              </li>
              <li>
                <a href="/products">Khuyến mãi</a>
              </li>
              <li>
                <a href="/about">Chuyện cà phê</a>
              </li>
              <li>
                <a href="/about">Cửa Hàng</a>
              </li>
              <li>
                <a href="#">Tuyển dụng</a>
              </li>
            </ul>
          </Col>
          {/* Điều khoản */}
          <Col md={3}>
            <h5>Điều khoản</h5>
            <ul className="list-unstyled">
              <li>
                <a href="#">Điều khoản sử dụng</a>
              </li>
              <li>
                <a href="#">Chính sách bảo mật thông tin</a>
              </li>
              <li>
                <a href="#">Hướng dẫn xuất hóa đơn GTGT</a>
              </li>
            </ul>
          </Col>
          {/* Đặt hàng */}
          <Col md={3}>
            <h5>Đặt hàng: 1800 6936</h5>
            <ul className="list-unstyled">
              <li>
                <a href="/lienhe">Liên hệ</a>
              </li>
            </ul>
            <p>
              Tặng 7, Trung Tâm Thương Mại GigaMall, 240 - 242 Phạm Văn Đồng, P.
              Hiệp Bình Chánh, TP. Thủ Đức, TP.HCM
            </p>
          </Col>
          {/* Quảng cáo và mạng xã hội */}
          <Col md={3}>
            <div className="advertisement">
              <img
                src="/images/logo.png"
                alt="SuLi Coffee"
                className="ad-image"
              />
              <div className="ad-content">
                <h6>SuLi Coffee</h6>
                <p>713.174 người theo dõi</p>
                <p>Pizza</p>
                <a href="#" className="share-btn">
                  Chia sẻ
                </a>
              </div>
            </div>
            <div className="social-icons">
              <a
                href="https://www.facebook.com/thecoffeehousevn"
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className="fab fa-facebook-f"></i>
              </a>
              <a
                href="https://www.instagram.com/thecoffeehousevn/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className="fab fa-instagram"></i>
              </a>
            </div>
          </Col>
        </Row>
        {/* Bản quyền */}
        <div className="copyright">
          <p>
            Công ty cổ phần thương mại dịch vụ SuLi Coffee
            <br />
            Mã số DN: 0312867172 do sở kế hoạch và đầu tư TP.HCM cấp ngày
            23/07/2014. <br />
            Địa chỉ: 86-88 Cao Thắng, phường 04, quận 3, TP.HCM - Điện thoại:
            (028) 7107 8079 Email: hi@sulicoffee.vn
            <br />© 2014-2025 Công ty cổ phần thương mại dịch vụ SuLi Coffee mọi
            quyền bảo lưu
          </p>
        </div>
      </Container>
    </footer>
  );
};

export default Footer;
