// src/pages/user/ForgotPassword.js
import { useState } from "react";
import { Form, Button, Alert, Spinner } from "react-bootstrap";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { buildApiUrl } from "../../utils/apiConfig";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);
    try {
      const res = await axios.post(buildApiUrl("/api/password/forgot"), {
        email,
      });
      setMessage(res.data.message || "OTP đã được gửi đến email của bạn!");
      setTimeout(() => {
        navigate("/reset-password", { state: { email } });
      }, 1000);
    } catch (err) {
      setError(
        err.response?.data?.message || "Có lỗi xảy ra, vui lòng thử lại!"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="forgot-container"
      style={{
        minHeight: "100vh",
        background: "url(/images/nen6.png) no-repeat center center fixed",
        backgroundSize: "cover",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <style>{`
        .forgot-card {
          max-width: 400px;
          width: 100%;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          border-radius: 15px;
          padding: 20px;
          box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }
        .forgot-title {
          color: #d81b60;
          font-weight: 700;
          font-size: 24px;
          text-align: center;
          margin-bottom: 10px;
        }
        .forgot-sub {
          color: #777;
          text-align: center;
          margin-bottom: 20px;
          font-size: 14px;
        }
        .form-control {
          border-radius: 25px !important;
          background: rgba(255, 255, 255, 0.8);
        }
        .form-control:focus {
          border-color: #d81b60;
          box-shadow: 0 0 5px rgba(216, 27, 96, 0.3);
        }
        .btn-forgot {
          width: 100%;
          padding: 10px;
          background-color: #d81b60;
          border: none;
          color: white;
          border-radius: 25px;
          font-weight: 600;
          margin-top: 10px;
        }
      `}</style>
      <div className="forgot-card">
        <div className="forgot-title">Forgot Password</div>
        <div className="forgot-sub">
          Nhập email để nhận mã OTP đặt lại mật khẩu.
        </div>
        {message && <Alert variant="success">{message}</Alert>}
        {error && <Alert variant="danger">{error}</Alert>}
        <Form onSubmit={handleSubmit}>
          <Form.Group controlId="formEmail" className="mb-3">
            <Form.Control
              type="email"
              placeholder="Nhập email của bạn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Form.Group>
          <Button type="submit" className="btn-forgot" disabled={loading}>
            {loading ? <Spinner size="sm" animation="border" /> : "Gửi OTP"}
          </Button>
        </Form>
      </div>
    </div>
  );
}

export default ForgotPassword;
