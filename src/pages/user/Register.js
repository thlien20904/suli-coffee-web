// src/pages/Auth/Register.jsx
import { useMemo, useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { Form, Button, Alert, Spinner } from "react-bootstrap";
import {
  BsPerson,
  BsEnvelope,
  BsLock,
  BsTelephone,
  BsGeoAlt,
  BsFacebook,
  BsGoogle,
  BsEye,
  BsEyeSlash,
  BsExclamationCircle,
} from "react-icons/bs";
import { buildApiUrl } from "../../utils/apiConfig";

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v || "").trim());
const isUsername = (v) => /^[a-zA-Z0-9_.-]{3,30}$/.test((v || "").trim());
const isStrongPassword = (v) =>
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/.test(v || "");
const isVNPhone10 = (v) =>
  /^0(3|5|7|8|9)\d{8}$/.test((v || "").replace(/\s+/g, ""));

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    fullName: "",
    phone: "",
    address: "",
  });
  const [showPwd, setShowPwd] = useState(false);

  const [loading, setLoading] = useState(false);
  const [alertMsg, setAlertMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const setField = (k) => (e) => {
    const val = e.target.value;
    setForm((f) => ({ ...f, [k]: val }));
    setTouched((t) => ({ ...t, [k]: true }));
    setErrors((prev) => ({ ...prev, [k]: undefined }));
    setAlertMsg("");
  };

  const clientErrors = useMemo(() => {
    const e = {};
    if (!form.username) e.username = "Vui lòng nhập Username.";
    else if (!isUsername(form.username))
      e.username = "Username 3–30 ký tự, chỉ a-z, A-Z, 0-9, _ . -";

    if (!form.email) e.email = "Vui lòng nhập Email.";
    else if (!isEmail(form.email)) e.email = "Email không đúng định dạng.";

    if (!form.password) e.password = "Vui lòng nhập Mật khẩu.";
    else if (!isStrongPassword(form.password))
      e.password =
        "Mật khẩu ≥8 ký tự, gồm chữ HOA, thường, số và ký tự đặc biệt.";

    if (!form.fullName) e.fullName = "Vui lòng nhập Họ và tên.";
    else if (form.fullName.trim().length < 2)
      e.fullName = "Họ tên tối thiểu 2 ký tự.";

    if (!form.phone) e.phone = "Vui lòng nhập Số điện thoại.";
    else if (!isVNPhone10(form.phone))
      e.phone = "SĐT phải 10 số, bắt đầu 03/05/07/08/09.";

    if (!form.address) e.address = "Vui lòng nhập Địa chỉ.";
    else if (form.address.trim().length < 5)
      e.address = "Địa chỉ tối thiểu 5 ký tự.";

    return e;
  }, [form]);

  const showFieldError = (field) =>
    (touched[field] || submitted) && (errors[field] || clientErrors[field]);
const handleSubmit = async (e) => {
  e.preventDefault();
  setSubmitted(true);
  setAlertMsg("");
  setSuccessMsg("");
  setErrors({});

  const ce = clientErrors;
  if (Object.keys(ce).length) {
    setErrors(ce);
    setAlertMsg("Vui lòng kiểm tra và sửa các trường bên dưới.");
    return;
  }

  setLoading(true);
  const apiUrl = buildApiUrl("/api/auth/register");
  console.log(`🆕 REGISTER SUBMIT START: URL=${apiUrl} | Data=`, { // Log request (ẩn password)
    username: form.username.trim(),
    email: form.email.trim(),
    fullName: form.fullName.trim(),
    phone: form.phone.trim(),
    address: form.address.trim(),
  });

  const startTime = Date.now(); // SỬA: Di chuyển ra ngoài try-catch
  try {
    const resp = await axios.post(apiUrl, {
      username: form.username.trim(),
      email: form.email.trim(),
      password: form.password,
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
    }, {
      timeout: 45000, // 45s cho email
      headers: { 'Content-Type': 'application/json' },
    });

    const duration = Date.now() - startTime;
    console.log(`✅ REGISTER SUCCESS: ${duration}ms | Response=`, resp.data);

    if (resp?.data?.success) {
      setSuccessMsg(
        resp.data.message || "Đăng ký tạm thời thành công. Vui lòng kiểm tra email để xác nhận và hoàn tất đăng ký."
      );
    } else {
      setSuccessMsg(resp.data.message || "Đăng ký thành công. Vui lòng kiểm tra email để xác nhận.");
    }
  } catch (err) {
    const duration = Date.now() - startTime; // BÂY GIỜ OK, startTime defined
    console.error(`❌ REGISTER ERROR after ${duration}ms:`, {
      message: err.message,
      status: err.response?.status,
      statusText: err.response?.statusText,
      data: err.response?.data,
      code: err.code, // 'ECONNABORTED' nếu timeout
    });

    const resp = err?.response?.data;
    if (resp) {
      if (Array.isArray(resp.errors) && resp.errors.length) {
        const fieldErrs = {};
        resp.errors.forEach((it) => {
          if (it.field) fieldErrs[it.field] = it.msg || it.message || it.msg;
        });
        setErrors((prev) => ({ ...prev, ...fieldErrs }));
        setAlertMsg("Vui lòng kiểm tra và sửa các trường có lỗi.");
      } else if (resp.message) {
        setAlertMsg(resp.message);
      } else {
        setAlertMsg("Đăng ký thất bại. Vui lòng thử lại.");
      }
    } else if (err.code === 'ECONNABORTED') {
      setAlertMsg("Yêu cầu quá lâu (timeout). Kiểm tra kết nối hoặc thử lại.");
    } else {
      setAlertMsg(err.message || "Đăng ký thất bại. Vui lòng thử lại.");
    }
  } finally {
    setLoading(false);
    console.log(`🔚 REGISTER END: Loading=false | Total time: ${Date.now() - startTime}ms`);
  }
};

  return (
    <div
      className="register-bg d-flex align-items-center justify-content-center py-5"
      style={{
        minHeight: "100vh",
        background: "url(/images/nen6.png) no-repeat center center fixed",
        backgroundSize: "cover",
      }}
    >
      <style>{`
        .register-card {
          width: 100%;
          max-width: 460px;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(12px);
          border-radius: 20px;
          padding: 40px 32px;
          box-shadow: 0 6px 18px rgba(0,0,0,0.25);
        }
        .auth-title { color: #d81b60; font-weight: 700; font-size: 24px; text-align: center; margin-bottom: 8px; }
        .auth-sub { color:#fff; text-align:center; margin-bottom: 22px; font-size:14px; }
        .input-icon { position:absolute; left:12px; top:50%; transform:translateY(-50%); color:#6c757d; pointer-events:none; }
        .has-icon { padding-left:38px; height:44px; border-radius:12px; border:1px solid #ddd; }
        .has-icon.is-invalid { border-color:#dc3545; }
        .has-icon:focus { box-shadow:0 0 0 .2rem rgba(216,27,96,.15); border-color:#f1b4c9; }
        .toggle-eye { position:absolute; right:12px; top:50%; transform:translateY(-50%); cursor:pointer; color:#6c757d; }
        .has-eye { padding-right:44px; }
        .btn-primary-auth { background:#d81b60; border:none; height:44px; border-radius:999px; font-weight:600; }
        .btn-social { width:100%; height:44px; border-radius:999px; font-weight:600; }
        .btn-facebook { background:#3b5998; border-color:#3b5998; }
        .btn-google { background:#ea4335; border-color:#ea4335; }
        .or-line { position:relative; text-align:center; margin:18px 0; color:#eee; font-size:13px; }
        .or-line::before,.or-line::after{ content:""; position:absolute; top:50%; width:40%; height:1px; background:#eee; }
        .or-line::before{ left:0; } .or-line::after{ right:0; }
      `}</style>

      <div className="register-card">
        <div className="auth-title">Sign Up</div>
        <div className="auth-sub">Create your account to continue</div>

        {alertMsg && (
          <Alert
            variant="danger"
            className="mb-3 d-flex align-items-center gap-2"
          >
            <BsExclamationCircle className="fs-5" />
            <span>{alertMsg}</span>
          </Alert>
        )}
        {successMsg && (
          <Alert variant="success" className="mb-3">
            {successMsg}
          </Alert>
        )}

        <Form noValidate onSubmit={handleSubmit}>
          <Form.Group className="mb-3 position-relative">
            <BsPerson className="input-icon" />
            <Form.Control
              className={`has-icon ${
                showFieldError("username") ? "is-invalid" : ""
              }`}
              type="text"
              placeholder="Username"
              value={form.username}
              onChange={setField("username")}
            />
            {showFieldError("username") && (
              <Form.Control.Feedback type="invalid">
                {errors.username || clientErrors.username}
              </Form.Control.Feedback>
            )}
          </Form.Group>

          <Form.Group className="mb-3 position-relative">
            <BsEnvelope className="input-icon" />
            <Form.Control
              className={`has-icon ${
                showFieldError("email") ? "is-invalid" : ""
              }`}
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={setField("email")}
            />
            {showFieldError("email") && (
              <Form.Control.Feedback type="invalid">
                {errors.email || clientErrors.email}
              </Form.Control.Feedback>
            )}
          </Form.Group>

          <Form.Group className="mb-3 position-relative">
            <BsLock className="input-icon" />
            <Form.Control
              className={`has-icon has-eye ${
                showFieldError("password") ? "is-invalid" : ""
              }`}
              type={showPwd ? "text" : "password"}
              placeholder="Password"
              value={form.password}
              onChange={setField("password")}
            />
            <span className="toggle-eye" onClick={() => setShowPwd((v) => !v)}>
              {showPwd ? <BsEyeSlash /> : <BsEye />}
            </span>
            {showFieldError("password") && (
              <Form.Control.Feedback type="invalid">
                {errors.password || clientErrors.password}
              </Form.Control.Feedback>
            )}
          </Form.Group>

          <Form.Group className="mb-3 position-relative">
            <BsPerson className="input-icon" />
            <Form.Control
              className={`has-icon ${
                showFieldError("fullName") ? "is-invalid" : ""
              }`}
              type="text"
              placeholder="Full Name"
              value={form.fullName}
              onChange={setField("fullName")}
            />
            {showFieldError("fullName") && (
              <Form.Control.Feedback type="invalid">
                {errors.fullName || clientErrors.fullName}
              </Form.Control.Feedback>
            )}
          </Form.Group>

          <Form.Group className="mb-3 position-relative">
            <BsTelephone className="input-icon" />
            <Form.Control
              className={`has-icon ${
                showFieldError("phone") ? "is-invalid" : ""
              }`}
              type="tel"
              placeholder="Phone"
              value={form.phone}
              onChange={setField("phone")}
            />
            {showFieldError("phone") && (
              <Form.Control.Feedback type="invalid">
                {errors.phone || clientErrors.phone}
              </Form.Control.Feedback>
            )}
          </Form.Group>

          <Form.Group className="mb-3 position-relative">
            <BsGeoAlt className="input-icon" />
            <Form.Control
              className={`has-icon ${
                showFieldError("address") ? "is-invalid" : ""
              }`}
              type="text"
              placeholder="Address"
              value={form.address}
              onChange={setField("address")}
            />
            {showFieldError("address") && (
              <Form.Control.Feedback type="invalid">
                {errors.address || clientErrors.address}
              </Form.Control.Feedback>
            )}
          </Form.Group>

          <Button
            type="submit"
            className="w-100 mt-2 btn-primary-auth"
            disabled={loading}
          >
            {loading ? <Spinner size="sm" animation="border" /> : "Sign Up"}
          </Button>

          <div className="or-line">OR</div>

          <div className="d-grid gap-2">
            {/* <Button
              className="btn-social btn-facebook d-flex align-items-center justify-content-center gap-2"
              as="a"
              href={buildApiUrl("/api/auth/facebook")}
            >
              <BsFacebook /> Connect with Facebook
            </Button> */}
            <Button
              className="btn-social btn-google d-flex align-items-center justify-content-center gap-2"
              as="a"
              href={buildApiUrl("/auth/google")}
            >
              <BsGoogle /> Connect with Google
            </Button>
          </div>

          <div
            className="text-center mt-3"
            style={{ fontSize: 13, color: "#fff" }}
          >
            Already have an account? <Link to="/login">Login</Link>
          </div>
        </Form>
      </div>
    </div>
  );
}
