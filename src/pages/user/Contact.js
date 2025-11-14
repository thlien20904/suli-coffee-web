import React, { useState } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button,
  Badge,
  Alert,
  ListGroup,
  Ratio,
} from "react-bootstrap";
import {
  FiUser,
  FiMail,
  FiPhone,
  FiMessageCircle,
  FiSend,
  FiMapPin,
  FiClock,
  FiPhoneCall,
  FiFacebook,
  FiInstagram,
} from "react-icons/fi";

export default function Contact() {
  const [validated, setValidated] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const gold = "#d4af37";

  const handleSubmit = (event) => {
    const form = event.currentTarget;
    event.preventDefault();
    if (form.checkValidity() === false) {
      event.stopPropagation();
      setValidated(true);
      return;
    }
    // TODO: gửi form lên API của bạn tại đây
    form.reset();
    setValidated(false);
    setSubmitted(true);
    // Ẩn Alert sau vài giây
    setTimeout(() => setSubmitted(false), 4500);
  };

  return (
    <div
      style={{
        background: "linear-gradient(135deg,#f8f6ef 0%,#ffffff 50%)",
      }}
    >
      {/* HERO SMALL */}
      <section
        className="py-5 position-relative"
        style={{ borderBottom: "1px solid #eee" }}
      >
        <Container>
          <Row className="align-items-center">
            <Col>
              <h1 className="fw-bold mb-1" style={{ color: "#333" }}>
                Liên hệ SuLi Coffee
              </h1>
              <p className="text-muted mb-0">
                Rất hân hạnh được lắng nghe bạn — đội CSKH phản hồi trong vòng{" "}
                <strong>24h</strong>.
              </p>
            </Col>
          </Row>
        </Container>
      </section>

      <Container className="py-5">
        <Row className="g-lg-5 g-4">
          {/* ===== FORM ===== */}
          <Col lg={7}>
            <Card
              className="border-0 shadow-lg contact-form-card"
              style={{
                borderTop: `5px solid ${gold}`,
                borderRadius: 14,
                background:
                  "linear-gradient(180deg,#fff,rgba(255,255,255,.96))",
              }}
            >
              <Card.Body className="p-4 p-md-5">
                <div className="d-flex align-items-center mb-3">
                  <Badge
                    className="me-2"
                    bg="warning"
                    text="dark"
                    style={{ backgroundColor: gold, border: "none" }}
                  >
                    Form liên hệ
                  </Badge>
                  <span className="text-muted small">* Trường bắt buộc</span>
                </div>

                {submitted && (
                  <Alert variant="success" className="rounded-3 py-2">
                    Cảm ơn bạn! Chúng tôi đã nhận được thông tin và sẽ phản hồi
                    sớm nhất.
                  </Alert>
                )}

                <Form
                  noValidate
                  validated={validated}
                  onSubmit={handleSubmit}
                  className="contact-form"
                >
                  {/* Họ tên */}
                  <Form.Group className="mb-2" controlId="contactName">
                    <Form.Label className="fw-semibold mb-1">
                      <FiUser className="me-2" />
                      Họ và tên *
                    </Form.Label>
                    <Form.Control
                      required
                      type="text"
                      placeholder="Nguyễn Văn A"
                      className="shadow-sm"
                    />
                    <Form.Control.Feedback type="invalid">
                      Vui lòng nhập họ và tên.
                    </Form.Control.Feedback>
                  </Form.Group>

                  {/* Email */}
                  <Form.Group className="mb-2" controlId="contactEmail">
                    <Form.Label className="fw-semibold mb-1">
                      <FiMail className="me-2" />
                      Email *
                    </Form.Label>
                    <Form.Control
                      required
                      type="email"
                      placeholder="email@domain.com"
                      className="shadow-sm"
                    />
                    <Form.Control.Feedback type="invalid">
                      Vui lòng nhập email hợp lệ.
                    </Form.Control.Feedback>
                  </Form.Group>

                  {/* Phone + Subject */}
                  <Row className="g-2">
                    <Col md={6}>
                      <Form.Group controlId="contactPhone">
                        <Form.Label className="fw-semibold mb-1">
                          <FiPhone className="me-2" />
                          Điện thoại
                        </Form.Label>
                        <Form.Control
                          type="tel"
                          placeholder="098x xxx xxx"
                          pattern="^[0-9+\s()-]{8,}$"
                          className="shadow-sm"
                        />
                        <Form.Text className="text-muted small">
                          Có thể bỏ trống
                        </Form.Text>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group controlId="contactSubject">
                        <Form.Label className="fw-semibold mb-1">
                          Chủ đề *
                        </Form.Label>
                        <Form.Select
                          required
                          defaultValue=""
                          className="shadow-sm"
                        >
                          <option value="" disabled>
                            Chọn chủ đề
                          </option>
                          <option>Hỏi về sản phẩm</option>
                          <option>Đổi trả – bảo hành</option>
                          <option>Hợp tác / B2B</option>
                          <option>Góp ý dịch vụ</option>
                        </Form.Select>
                        <Form.Control.Feedback type="invalid">
                          Vui lòng chọn chủ đề.
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                  </Row>

                  {/* Message */}
                  <Form.Group className="mt-3" controlId="contactMessage">
                    <Form.Label className="fw-semibold mb-1">
                      <FiMessageCircle className="me-2" />
                      Nội dung *
                    </Form.Label>
                    <Form.Control
                      as="textarea"
                      required
                      rows={4}
                      placeholder="Mô tả yêu cầu của bạn..."
                      className="shadow-sm"
                    />
                    <Form.Control.Feedback type="invalid">
                      Vui lòng nhập nội dung.
                    </Form.Control.Feedback>
                  </Form.Group>

                  {/* Submit */}
                  <div className="d-flex align-items-center gap-3 mt-4">
                    <Button
                      type="submit"
                      className="px-4 py-2 fw-bold"
                      style={{
                        background: gold,
                        borderColor: gold,
                        color: "#111",
                        borderRadius: 12,
                        boxShadow: "0 6px 16px rgba(212,175,55,.35)",
                      }}
                    >
                      <FiSend className="me-2" /> Gửi liên hệ
                    </Button>
                    <div className="text-muted small">
                      Chúng tôi bảo mật thông tin theo chính sách riêng tư.
                    </div>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>

          {/* ===== INFO ===== */}
          <Col lg={5}>
            <Card
              className="border-0 shadow-lg mb-4"
              style={{ borderRadius: 14 }}
            >
              <Card.Body className="p-4 p-md-5">
                <h5 className="fw-bold mb-3" style={{ color: "#333" }}>
                  Thông tin liên hệ
                </h5>
                <ListGroup variant="flush" className="mb-3">
                  <ListGroup.Item className="px-0 d-flex align-items-start border-0">
                    <FiMapPin className="me-3 mt-1" color={gold} />
                    <div>
                      <div className="fw-semibold">Showroom chính</div>
                      <div className="text-muted">123 Trần Phú, Hà Nội</div>
                    </div>
                  </ListGroup.Item>
                  <ListGroup.Item className="px-0 d-flex align-items-center border-0">
                    <FiPhoneCall className="me-3" color={gold} />
                    <a href="tel:0987654321" className="text-decoration-none">
                      0987 654 321
                    </a>
                  </ListGroup.Item>
                  <ListGroup.Item className="px-0 d-flex align-items-center border-0">
                    <FiMail className="me-3" color={gold} />
                    <a
                      href="mailto:support@sulicoffee.vn"
                      className="text-decoration-none"
                    >
                      support@sulicoffee.vn
                    </a>
                  </ListGroup.Item>
                  <ListGroup.Item className="px-0 d-flex align-items-start border-0">
                    <FiClock className="me-3 mt-1" color={gold} />
                    <div>
                      <div className="fw-semibold">Giờ mở cửa</div>
                      <div className="text-muted">Thứ 2–CN: 9:00 – 21:00</div>
                    </div>
                  </ListGroup.Item>
                </ListGroup>

                <div className="d-flex gap-3">
                  <Button
                    as="a"
                    href="https://facebook.com"
                    target="_blank"
                    rel="noreferrer"
                    variant="outline-dark"
                    className="rounded-pill px-3 py-2"
                  >
                    <FiFacebook className="me-2" /> Facebook
                  </Button>
                  <Button
                    as="a"
                    href="https://instagram.com"
                    target="_blank"
                    rel="noreferrer"
                    variant="outline-dark"
                    className="rounded-pill px-3 py-2"
                  >
                    <FiInstagram className="me-2" /> Instagram
                  </Button>
                </div>
              </Card.Body>
            </Card>

            {/* Map */}
            <Card className="border-0 shadow-lg" style={{ borderRadius: 14 }}>
              <Card.Body className="p-2">
                <Ratio aspectRatio="16x9">
                  <iframe
                    title="Bản đồ SuLi Coffee"
                    src="https://www.google.com/maps?q=123+Tr%E1%BA%A7n+Ph%C3%BA,+H%C3%A0+N%E1%BB%99i&output=embed"
                    style={{ border: 0, borderRadius: 12 }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </Ratio>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
      <style>{`
  .contact-form-card .form-control,
  .contact-form-card .form-select {
    margin-bottom: 6px !important;
  }
  .contact-form-card label {
    margin-bottom: 3px !important;
    font-weight: 500;
  }
  .contact-form .row {
    margin-bottom: 4px !important;
  }
  .contact-form .form-text {
    margin-top: 2px;
    font-size: 12px;
  }
  .contact-form .form-group {
    margin-bottom: 8px !important;
  }
  .contact-form-card {
    --gold: #d4af37;
  }
  .contact-form-card .form-control:focus,
  .contact-form-card .form-select:focus {
    border-color: var(--gold);
    box-shadow: 0 0 0 0.15rem rgba(212,175,55,0.25);
  }
  .contact-form-card button[type="submit"]:hover {
    filter: brightness(1.08);
  }
`}</style>
    </div>
  );
}
