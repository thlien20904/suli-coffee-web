import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, useLocation, Link } from "react-router-dom";
import axios from "axios";
import { login } from "../../redux/userSlice";
import { Form, Button, Alert, Spinner } from "react-bootstrap";
import { jwtDecode } from "jwt-decode";
import { API_BASE_URL, buildApiUrl } from "../../utils/apiConfig";
import {
  BsPerson,
  BsLock,
  BsFacebook,
  BsGoogle,
  BsEye,
  BsEyeSlash,
} from "react-icons/bs";

// ✅ Thêm đoạn này ngay sau import
if (!sessionStorage.getItem("sessionActive")) {
  // Nếu là phiên mới (vừa npm start)
  localStorage.removeItem("token"); // Xóa token cũ để chưa đăng nhập
  sessionStorage.setItem("sessionActive", "true"); // Ghi nhớ phiên hiện tại
}

function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState({ identifier: "", password: "", captcha: "" });
  const [touched, setTouched] = useState({
    identifier: false,
    password: false,
    captcha: false,
  });
  const [serverError, setServerErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // CAPTCHA state
  const [captchaText, setCaptchaText] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  
  // Generate CAPTCHA
  const generateCaptcha = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let captcha = '';
    for (let i = 0; i < 6; i++) {
      captcha += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaText(captcha);
    setCaptchaInput("");
  };

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  // Generate CAPTCHA on mount
  useEffect(() => {
    generateCaptcha();
  }, []);

  useEffect(() => {
    const rememberedIdentifier = localStorage.getItem(
      "auth:rememberIdentifier"
    );
    if (rememberedIdentifier) {
      setIdentifier(rememberedIdentifier);
      setRemember(true);
    }

    // Nếu đã có token thì chỉ kiểm tra — KHÔNG tự navigate
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        if (!decoded?.exp || decoded.exp * 1000 < Date.now()) {
          // Token hết hạn → xóa
          localStorage.removeItem("token");
          console.warn("⚠ Token hết hạn, xoá khỏi localStorage");
        }
      } catch (err) {
        console.error("❌ Token decode error:", err);
        localStorage.removeItem("token");
      }
    }
  }, []);

  // ✅ Nếu đăng nhập qua Google hoặc Facebook
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("token");
    const role = params.get("role");
    const error = params.get("error");

    console.log("[Frontend] URL params:", { token: !!token, role, error });

    if (error) {
      console.error("[Frontend] Google OAuth error:", error);
      setServerErr(`Đăng nhập Google thất bại: ${error}`);
      return;
    }

    if (token && role) {
      console.log("[Frontend] Processing Google OAuth token...");
      try {
        const decoded = jwtDecode(token);
        console.log("[Frontend] Decoded token:", decoded);
        dispatch(
          login({
            token,
            role,
            userId: decoded.id,
            username: decoded.username,
            email: decoded.email,
            avatar: decoded.avatar,
          })
        );
        localStorage.setItem("token", token);
        console.log(
          "[Frontend] Login successful, navigating to:",
          role === "admin" ? "/admin/dashboard" : "/"
        );
        navigate(role === "admin" ? "/admin/dashboard" : "/");
      } catch (err) {
        console.error("[Frontend] Google/Facebook login decode failed:", err);
        setServerErr("Đăng nhập thất bại: Token không hợp lệ");
      }
    }
  }, [location, dispatch, navigate]);

  const validateField = (name, value) => {
    let msg = "";
    if (name === "identifier" && !value.trim())
      msg = "Vui lòng nhập Username hoặc Email.";
    if (name === "password" && !value) msg = "Vui lòng nhập Mật khẩu.";
    if (name === "captcha") {
      if (!value || !value.trim()) msg = "Vui lòng nhập mã bảo vệ.";
      else if (value !== captchaText) msg = "Mã bảo vệ không đúng!";
    }
    return msg;
  };

  const validateAll = () => ({
    identifier: validateField("identifier", identifier),
    password: validateField("password", password),
    captcha: validateField("captcha", captchaInput),
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setServerErr("");
    setTouched({ identifier: true, password: true, captcha: true });

    const newErrors = validateAll();
    setErrors(newErrors);
    if (newErrors.identifier || newErrors.password || newErrors.captcha) {
      if (newErrors.captcha) {
        generateCaptcha(); // Regenerate CAPTCHA nếu sai
      }
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        identifier: identifier.trim(),
        password,
        remember,
      });

      const { token, role } = res.data;

      // ✅ Decode và lưu redux + localStorage
      const decoded = jwtDecode(token);
      dispatch(
        login({
          token,
          role,
          userId: decoded.id,
          username: decoded.username,
          email: decoded.email,
          avatar: decoded.avatar,
        })
      );

      localStorage.setItem("token", token);
      if (remember)
        localStorage.setItem("auth:rememberIdentifier", identifier.trim());
      else localStorage.removeItem("auth:rememberIdentifier");

      navigate(role === "admin" ? "/admin/dashboard" : "/", { replace: true });
    } catch (err) {
      console.error("Login error:", err.response?.data);
      
      // Xử lý lỗi từ backend
      const errorData = err.response?.data;
      const errorType = errorData?.errorType;
      const errorMessage = errorData?.message || "Đăng nhập thất bại";
      
      // Hiển thị lỗi cụ thể cho field tương ứng
      if (errorType === "username") {
        setErrors(prev => ({ ...prev, identifier: errorMessage }));
        setTouched(prev => ({ ...prev, identifier: true }));
      } else if (errorType === "password") {
        setErrors(prev => ({ ...prev, password: errorMessage }));
        setTouched(prev => ({ ...prev, password: true }));
      } else {
        // Lỗi chung
        const list = errorData?.errors;
        if (Array.isArray(list)) {
          const mapped = { identifier: "", password: "", captcha: "" };
          list.forEach((x) => (mapped[x.field] = x.msg));
          setErrors((prev) => ({ ...prev, ...mapped }));
        }
        setServerErr(errorMessage);
      }
      
      // Regenerate CAPTCHA sau khi login fail
      generateCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  return (
    <div
      className="login-container"
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
      <style>{`.login-container { position: relative; }
        .login-card { max-width: 400px; width: 100%; background: rgba(255, 255, 255, 0.2); backdrop-filter: blur(10px); border-radius: 15px; padding: 20px; box-shadow: 0 5px 15px rgba(0,0,0,0.2); }
        .login-title { color: #d81b60; font-weight: 700; font-size: 24px; text-align: center; margin-bottom: 10px; }
        .login-sub { color: #777; text-align: center; margin-bottom: 20px; font-size: 14px; }
        .input-group { position: relative; margin-bottom: 15px; }
        .input-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #333; }
        .password-toggle { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: #333; cursor: pointer; }
        .form-control { width: 100%; padding: 10px 45px; border: 1px solid #ccc; border-radius: 25px !important; background: rgba(255, 255, 255, 0.8); }
        .form-control:focus { border-color: #d81b60; box-shadow: 0 0 5px rgba(216, 27, 96, 0.3); }
        .form-control.is-invalid { border-color: #dc3545; }
        .btn-login { width: 100%; padding: 10px; background-color: #d81b60; border: none; color: white; border-radius: 25px; font-weight: 600; margin: 10px 0; }
        .btn-social { width: 100%; padding: 10px; border-radius: 25px; border: none; font-weight: 600; margin: 5px 0; }
        .btn-facebook { background: #3b5998; color: white; }
        .btn-facebook:hover { background: #2d4373; }
        .btn-google { background: #ea4335; color: white; }
        .btn-google:hover { background: #a50f0f; }
        .social-icon { margin-right: 10px; }
        .options { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px; }
        .options a { color: #d81b60; text-decoration: none; }
        .options a:hover { text-decoration: underline; }
        .signup { text-align: center; font-size: 13px; color: #666; margin-top: 10px; }
        .signup a { color: #d81b60; text-decoration: none; }
        .signup a:hover { text-decoration: underline; }
        .or-divider { text-align: center; margin: 15px 0; color: #999; font-size: 13px; position: relative; }
        .or-divider::before, .or-divider::after { content: ""; position: absolute; top: 50%; width: 40%; height: 1px; background: #ccc; }
        .or-divider::before { left: 0; }
        .or-divider::after { right: 0; }
        .invalid-feedback { color: #dc3545; font-size: 12px; margin-top: 5px; }`}</style>

      <div className="login-card">
        <div className="login-title">Sign In</div>
        <div className="login-sub">
          Welcome to SuLi Coffee! Please login to continue.
        </div>

        {serverError && <Alert variant="danger">{serverError}</Alert>}

        <Form onSubmit={handleLogin} noValidate>
          <div className="input-group">
            <BsPerson className="input-icon" />
            <Form.Control
              className={`form-control ${
                touched.identifier && errors.identifier ? "is-invalid" : ""
              }`}
              type="text"
              placeholder="Username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, identifier: true }))}
              autoFocus
            />
            {touched.identifier && errors.identifier && (
              <div className="invalid-feedback">{errors.identifier}</div>
            )}
          </div>

          <div className="input-group">
            <BsLock className="input-icon" />
            <Form.Control
              className={`form-control ${
                touched.password && errors.password ? "is-invalid" : ""
              }`}
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              autoComplete="current-password"
            />
            <span
              className="password-toggle"
              onClick={togglePasswordVisibility}
            >
              {showPassword ? <BsEyeSlash /> : <BsEye />}
            </span>
            {touched.password && errors.password && (
              <div className="invalid-feedback">{errors.password}</div>
            )}
          </div>

          {/* CAPTCHA */}
          <div className="captcha-group" style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333' }}>
              Mã bảo vệ:
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                background: 'white',
                border: '2px solid #333',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '20px',
                fontWeight: 'bold',
                letterSpacing: '6px',
                color: '#333',
                userSelect: 'none',
                fontFamily: 'Courier New, monospace',
                fontStyle: 'italic',
                textDecoration: 'line-through',
                textDecorationColor: '#999',
                textDecorationStyle: 'wavy',
                minWidth: '120px',
                textAlign: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                flex: '0 0 auto'
              }}>
                {captchaText}
              </div>
              <Form.Control
                className={`form-control ${
                  touched.captcha && errors.captcha ? "is-invalid" : ""
                }`}
                type="text"
                placeholder="Nhập mã bảo vệ"
                value={captchaInput}
                onChange={(e) => setCaptchaInput(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, captcha: true }))}
                style={{ 
                  padding: '10px 12px',
                  fontSize: '15px',
                  borderRadius: '6px',
                  border: '1px solid #ddd',
                  flex: '1'
                }}
              />
              <Button 
                variant="outline-dark" 
                size="sm"
                onClick={generateCaptcha}
                title="Làm mới mã"
                style={{ 
                  fontSize: '18px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  flex: '0 0 auto'
                }}
              >
                ↻
              </Button>
            </div>
            {touched.captcha && errors.captcha && (
              <div className="invalid-feedback" style={{ display: 'block', marginTop: '5px' }}>{errors.captcha}</div>
            )}
          </div>

          <div className="options">
            <Form.Check
              type="checkbox"
              id="rememberMe"
              label="Remember Me"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <Link to="/forgot-password">Forgot Password?</Link>
          </div>

          <Button type="submit" className="btn-login" disabled={loading}>
            {loading ? <Spinner size="sm" animation="border" /> : "Sign In"}
          </Button>

          <div className="signup">
            Don’t have an account? <Link to="/register">Sign up</Link>
          </div>

          <div className="or-divider">OR</div>
          {/* 
          <Button
            className="btn-social btn-facebook"
            as="a"
            href={`${API_BASE_URL}/api/auth/facebook`}
          >
            <BsFacebook className="social-icon" /> Connect with Facebook
          </Button> */}

          <Button
            className="btn-social btn-google"
            as="a"
            href={`${API_BASE_URL}/auth/google`}
            onClick={() =>
              console.log("[Frontend] Redirecting to Google OAuth...")
            }
          >
            <BsGoogle className="social-icon" /> Connect with Google
          </Button>
        </Form>
      </div>
    </div>
  );
}

export default Login;
