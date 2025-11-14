// src/pages/user/ResetPassword.js
import { useState } from "react";
import { Form, Button, Alert, Spinner } from "react-bootstrap";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";

function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || "";

  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Mật khẩu nhập lại không khớp!");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post("http://localhost:5000/api/password/reset", {
        email,
        otp,
        newPassword,
      });

      setMessage(res.data.message || "Đặt lại mật khẩu thành công!");
      setTimeout(() => {
        navigate("/login");
      }, 1500);
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
      className="reset-container"
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
        .reset-card {
          max-width: 400px;
          width: 100%;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          border-radius: 15px;
          padding: 20px;
          box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }
        .reset-title {
          color: #d81b60;
          font-weight: 700;
          font-size: 24px;
          text-align: center;
          margin-bottom: 10px;
        }
        .reset-sub {
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
        .btn-reset {
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
      <div className="reset-card">
        <div className="reset-title">Reset Password</div>
        <div className="reset-sub">Nhập OTP và mật khẩu mới để đặt lại.</div>
        {message && <Alert variant="success">{message}</Alert>}
        {error && <Alert variant="danger">{error}</Alert>}
        <Form onSubmit={handleSubmit}>
          <Form.Group controlId="formOtp" className="mb-3">
            <Form.Control
              type="text"
              placeholder="OTP đã gửi đến email"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
            />
          </Form.Group>
          <Form.Group controlId="formNewPassword" className="mb-3">
            <Form.Control
              type="password"
              placeholder="Nhập mật khẩu mới"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </Form.Group>
          <Form.Group controlId="formConfirmPassword" className="mb-3">
            <Form.Control
              type="password"
              placeholder="Xác nhận mật khẩu mới"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </Form.Group>
          <Button type="submit" className="btn-reset" disabled={loading}>
            {loading ? (
              <Spinner size="sm" animation="border" />
            ) : (
              "Đặt lại mật khẩu"
            )}
          </Button>
        </Form>
      </div>
    </div>
  );
}

export default ResetPassword;
