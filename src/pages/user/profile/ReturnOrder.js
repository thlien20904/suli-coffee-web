// frontend/src/pages/user/profile/ReturnOrder.js
import React from "react";
import { useNavigate } from "react-router-dom";
import { Container, Button } from "react-bootstrap";

const ReturnOrder = () => {
  const navigate = useNavigate();

  return (
    <Container className="mt-5 text-center">
      <h3>Tính năng trả hàng</h3>
      <p className="text-muted">Tính năng đang được phát triển...</p>
      <Button variant="primary" onClick={() => navigate("/profile/orders")}>
        Quay lại đơn hàng
      </Button>
    </Container>
  );
};

export default ReturnOrder;
