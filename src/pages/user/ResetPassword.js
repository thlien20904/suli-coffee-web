// src/pages/user/ResetPassword.js
import { useState, useMemo } from "react";
import { Form, Button, Alert, Spinner } from "react-bootstrap";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import { buildApiUrl } from "../../utils/apiConfig";
import { BsLock, BsShieldLock, BsKey, BsEye, BsEyeSlash, BsExclamationCircle } from "react-icons/bs";

const isStrongPassword = (v) =>
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/.test(v || "");
const isOtp = (v) => /^\d{6}$/.test((v || "").trim());

export default function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const emailFromState = location.state?.email || "";

  const [form, setForm] = useState({
    email: emailFromState,
    otp: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPwd, setShowPwd] = useState({ new: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [alertMsg, setAlertMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const setField = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setTouched((t) => ({ ...t, [k]: true }));
    setErrors((prev) => ({ ...prev, [k]: undefined }));
    setAlertMsg("");
  };

  const clientErrors = useMemo(() => {
    const e = {};
    if (!form.otp) e.otp = "Vui lòng nhập mã OTP.";
    else if (!isOtp(form.otp)) e.otp = "OTP phải là 6 chữ số.";

    if (!form.newPassword) e.newPassword = "Vui lòng nhập mật khẩu mới.";
    else if (!isStrongPassword(form.newPassword))
      e.newPassword = "Mật khẩu ≥8 ký tự, gồm chữ HOA, thường, số và ký tự đặc biệt.";

    if (!form.confirmPassword) e.confirmPassword = "Vui lòng nhập lại mật khẩu.";
    else if (form.newPassword !== form.confirmPassword)
      e.confirmPassword = "Mật khẩu nhập lại không khớp!";

    return e;
  }, [form]);

  const showFieldError = (field) =>
    (touched[field] || errors[field]) && (errors[field] || clientErrors[field]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlertMsg("");
    setSuccessMsg("");
    setErrors({});

    const ce = clientErrors;
    if (Object.keys(ce).length) {
      setErrors(ce);
      setAlertMsg("Vui lòng kiểm tra lại các trường bên dưới.");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(buildApiUrl("/api/password/reset"), form, {
        timeout: 30000,
      });

      if (res.data.success) {
        setSuccessMsg(res.data.message);
        setTimeout(() => navigate("/login"), 2000);
      }
    } catch (err) {
      const resp = err.response?.data;
      if (resp?.errors) {
        const fieldErrs = {};
        resp.errors.forEach((it) => {
          if (it.field) fieldErrs[it.field] = it.msg;
        });
        setErrors(fieldErrs);
        setAlertMsg(resp.message || "Vui lòng sửa lỗi và thử lại.");
      } else {
        setAlertMsg(resp?.message || "Có lỗi xảy ra. Vui lòng thử lại!");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="d-flex align-items-center justify-content-center min-vh-100 py-5"
      style={{
        background: "url(/images/nen6.png) no-repeat center center fixed",
        backgroundSize: "cover",
      }}
    >
      <style>{`
        .reset-card {
          max-width: 420px; width: 100%; padding: 40px 32px;
          background: rgba(255,255,255,0.2); backdrop-filter: blur(12px);
          border-radius: 20px; box-shadow: 0 8px 32px rgba(0,0,0,0.25);
        }
        .title { color: #d81b60; font-weight: 700; font-size: 26px; text-align: center; }
        .sub { color: #fff; text-align: center; font-size: 14px; margin-bottom: 20px; }
        .input-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #6c757d; }
        .has-icon { padding-left: 44px !important; height: 48px; border-radius: 12px; }
        .toggle-eye { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); cursor: pointer; color: #6c757d; }
        .btn-reset { background: #d81b60; border: none; height: 48px; border-radius: 999px; font-weight: 600; }
      `}</style>

      <div className="reset-card">
        <h2 className="title">Đặt lại mật khẩu</h2>
        <p className="sub">Nhập OTP và mật khẩu mới để hoàn tất</p>

        {alertMsg && (
          <Alert variant="danger" className="d-flex align-items-center gap-2">
            <BsExclamationCircle /> {alertMsg}
          </Alert>
        )}
        {successMsg && <Alert variant="success">{successMsg}</Alert>}

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3 position-relative">
            <BsKey className="input-icon" />
            <Form.Control
              className={`has-icon ${showFieldError("otp") ? "is-invalid" : ""}`}
              type="text"
              placeholder="Nhập mã OTP (6 số)"
              value={form.otp}
              onChange={setField("otp")}
              maxLength={6}
            />
            {showFieldError("otp") && (
              <Form.Control.Feedback type="invalid">
                {errors.otp || clientErrors.otp}
              </Form.Control.Feedback>
            )}
          </Form.Group>

          <Form.Group className="mb-3 position-relative">
            <BsLock className="input-icon" />
            <Form.Control
              className={`has-icon ${showFieldError("newPassword") ? "is-invalid" : ""}`}
              type={showPwd.new ? "text" : "password"}
              placeholder="Mật khẩu mới"
              value={form.newPassword}
              onChange={setField("newPassword")}
            />
            <span
              className="toggle-eye"
              onClick={() => setShowPwd((p) => ({ ...p, new: !p.new }))}
            >
              {showPwd.new ? <BsEyeSlash /> : <BsEye />}
            </span>
            {showFieldError("newPassword") && (
              <Form.Control.Feedback type="invalid">
                {errors.newPassword || clientErrors.newPassword}
              </Form.Control.Feedback>
            )}
          </Form.Group>

          <Form.Group className="mb-4 position-relative">
            <BsShieldLock className="input-icon" />
            <Form.Control
              className={`has-icon ${showFieldError("confirmPassword") ? "is-invalid" : ""}`}
              type={showPwd.confirm ? "text" : "password"}
              placeholder="Nhập lại mật khẩu"
              value={form.confirmPassword}
              onChange={setField("confirmPassword")}
            />
            <span
              className="toggle-eye"
              onClick={() => setShowPwd((p) => ({ ...p, confirm: !p.confirm }))}
            >
              {showPwd.confirm ? <BsEyeSlash /> : <BsEye />}
            </span>
            {showFieldError("confirmPassword") && (
              <Form.Control.Feedback type="invalid">
                {errors.confirmPassword || clientErrors.confirmPassword}
              </Form.Control.Feedback>
            )}
          </Form.Group>

          <Button type="submit" className="w-100 btn-reset" disabled={loading}>
            {loading ? <Spinner size="sm" /> : "Đặt lại mật khẩu"}
          </Button>
        </Form>
      </div>
    </div>
  );
}