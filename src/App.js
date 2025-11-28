// frontend/src/App.js
import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { login } from "./redux/userSlice";
import { jwtDecode } from "jwt-decode";

// CSP Components
import CSPProvider from "./components/CSP/CSPProvider";
import CSPDashboard from "./components/CSP/CSPDashboard";

// ChatBot
import ChatBot from "./components/ChatBot";

// user pages
import Home from "./pages/user/Home";
import Login from "./pages/user/Login";
import Register from "./pages/user/Register";
import EmailVerified from "./pages/user/EmailVerified";
import ForgotPassword from "./pages/user/ForgotPassword";
import ResetPassword from "./pages/user/ResetPassword";
import ProductList from "./pages/user/ProductList";
import ProductDetail from "./pages/user/ProductDetail";
import Cart from "./pages/user/Cart";
import Checkout from "./pages/user/Checkout";
import QRPayment from "./pages/user/QRPayment";
import Successful from "./pages/user/successful";

// profile pages
import Profile from "./pages/user/profile/Profile";
import ProfileInfo from "./pages/user/profile/ProfileInfo";
import OrdersList from "./pages/user/profile/OrdersList";
import Vouchers from "./pages/user/profile/Vouchers";
import Notifications from "./pages/user/profile/Notifications";
import Help from "./pages/user/profile/Help";
import OrderDetail from "./pages/user/profile/OrderDetail";
import ReturnOrder from "./pages/user/profile/ReturnOrder";

import Stores from "./pages/user/StoresUser";
import VnpayReturn from "./pages/user/VnpayReturn";
import About from "./pages/user/About";
import Contact from "./pages/user/Contact";

// admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import Food from "./pages/admin/Food/Food";
import AddFood from "./pages/admin/Food/Add";
import EditFood from "./pages/admin/Food/Edit";
import Category from "./pages/admin/category/category";
import CategoryAdd from "./pages/admin/category/add";
import CategoryEdit from "./pages/admin/category/edit";
import Ingredient from "./pages/admin/ingredient/ingredient";
import AddIngredient from "./pages/admin/ingredient/add";
import EditIngredient from "./pages/admin/ingredient/edit";
import ExportIngredient from "./pages/admin/ingredient/export";
import Payment from "./pages/admin/payment/payment";
import AddPayment from "./pages/admin/payment/add";
import EditPayment from "./pages/admin/payment/edit";
import UserList from "./pages/admin/users";
import Staff from "./pages/admin/staff/staff";
import AddStaff from "./pages/admin/staff/add";
import EditStaff from "./pages/admin/staff/edit";
import Invoice from "./pages/admin/invoice";
import Order from "./pages/admin/order";
import Voucher from "./pages/admin/voucher/Voucher";
import VoucherList from "./pages/admin/voucher/VoucherList";
import AssignVoucher from "./pages/admin/voucher/AssignVoucher";
import RevenueReport from "./pages/admin/report/revenue";
import BestsellerReport from "./pages/admin/report/bestseller";

// layout
import UserLayout from "./components/layout/user/UserLayout";
import AdminLayout from "./components/layout/admin/AdminLayout";

// ============== PROTECTED ROUTES ==============

// 1. Route chỉ cần đăng nhập
function PrivateRoute({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" replace />;
}

// 2. Route chỉ ADMIN mới được vào
function AdminRoute({ children }) {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/login" replace />;

  try {
    const decoded = jwtDecode(token);
    if (decoded.role === "admin") {
      return children;
    }
    // Nếu không phải admin → đẩy về trang chủ
    return <Navigate to="/" replace />;
  } catch (err) {
    localStorage.removeItem("token");
    return <Navigate to="/login" replace />;
  }
}

// ============== APP COMPONENT ==============
function App() {
  const dispatch = useDispatch();

  // Auto login nếu có token hợp lệ
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        if (decoded?.exp && decoded.exp * 1000 > Date.now()) {
          dispatch(
            login({
              token,
              role: decoded.role,
              userId: decoded.id,
              username: decoded.username,
              email: decoded.email,
              avatar: decoded.avatar,
            })
          );
        } else {
          localStorage.removeItem("token");
        }
      } catch (err) {
        console.error("Token decode error:", err);
        localStorage.removeItem("token");
      }
    }
  }, [dispatch]);

  return (
    <CSPProvider>
      <ChatBot />
      <Routes>
        {/* CSP Dashboard - CHỈ ADMIN, chuyển vào /admin/csp-dashboard */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route
            path="csp-dashboard"
            element={
              <AdminRoute>
                <CSPDashboard />
              </AdminRoute>
            }
          />
          {/* ...existing code... */}
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="food" element={<Food />} />
          <Route path="food/add" element={<AddFood />} />
          <Route path="food/edit/:id" element={<EditFood />} />
          <Route path="category" element={<Category />} />
          <Route path="category/add" element={<CategoryAdd />} />
          <Route path="category/edit/:id" element={<CategoryEdit />} />
          <Route path="ingredient" element={<Ingredient />} />
          <Route path="ingredient/add" element={<AddIngredient />} />
          <Route path="ingredient/edit/:id" element={<EditIngredient />} />
          <Route path="export" element={<ExportIngredient />} />
          <Route path="payment" element={<Payment />} />
          <Route path="payment/add" element={<AddPayment />} />
          <Route path="payment/edit/:id" element={<EditPayment />} />
          <Route path="users" element={<UserList />} />
          <Route path="staff" element={<Staff />} />
          <Route path="staff/add" element={<AddStaff />} />
          <Route path="staff/edit/:id" element={<EditStaff />} />
          <Route path="invoice" element={<Invoice />} />
          <Route path="order" element={<Order />} />
          <Route path="revenue" element={<RevenueReport />} />
          <Route path="bestseller" element={<BestsellerReport />} />
          <Route path="voucher" element={<Voucher />} />
          <Route path="voucher/assign" element={<AssignVoucher />} />
          <Route path="voucher/list" element={<VoucherList />} />
        </Route>

        {/* Auth routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/email-verified" element={<EmailVerified />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* User routes */}
        <Route path="/" element={<UserLayout />}>
          <Route index element={<Home />} />
          <Route path="products" element={<ProductList />} />
          <Route path="product/:id" element={<ProductDetail />} />
          <Route path="cart" element={<Cart />} />
          <Route
            path="checkout"
            element={
              <PrivateRoute>
                <Checkout />
              </PrivateRoute>
            }
          />
          <Route
            path="qr-payment"
            element={
              <PrivateRoute>
                <QRPayment />
              </PrivateRoute>
            }
          />
          <Route
            path="successful"
            element={
              <PrivateRoute>
                <Successful />
              </PrivateRoute>
            }
          />
          <Route path="stores" element={<Stores />} />
          <Route path="vnpay-return" element={<VnpayReturn />} />
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />

          {/* Profile nested routes */}
          <Route
            path="profile"
            element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            }
          >
            <Route index element={<ProfileInfo />} />
            <Route path="orders">
              <Route index element={<OrdersList />} />
              <Route path="orderdetail/:orderId" element={<OrderDetail />} />
              <Route path="return-order/:orderId" element={<ReturnOrder />} />
            </Route>
            <Route path="vouchers" element={<Vouchers />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="help" element={<Help />} />
          </Route>
        </Route>

        {/* ADMIN PANEL - TẤT CẢ CHỈ ADMIN VÀO ĐƯỢC */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="food" element={<Food />} />
          <Route path="food/add" element={<AddFood />} />
          <Route path="food/edit/:id" element={<EditFood />} />
          <Route path="category" element={<Category />} />
          <Route path="category/add" element={<CategoryAdd />} />
          <Route path="category/edit/:id" element={<CategoryEdit />} />
          <Route path="ingredient" element={<Ingredient />} />
          <Route path="ingredient/add" element={<AddIngredient />} />
          <Route path="ingredient/edit/:id" element={<EditIngredient />} />
          <Route path="export" element={<ExportIngredient />} />
          <Route path="payment" element={<Payment />} />
          <Route path="payment/add" element={<AddPayment />} />
          <Route path="payment/edit/:id" element={<EditPayment />} />
          <Route path="users" element={<UserList />} />
          <Route path="staff" element={<Staff />} />
          <Route path="staff/add" element={<AddStaff />} />
          <Route path="staff/edit/:id" element={<EditStaff />} />
          <Route path="invoice" element={<Invoice />} />
          <Route path="order" element={<Order />} />
          <Route path="revenue" element={<RevenueReport />} />
          <Route path="bestseller" element={<BestsellerReport />} />
          <Route path="voucher" element={<Voucher />} />
          <Route path="voucher/assign" element={<AssignVoucher />} />
          <Route path="voucher/list" element={<VoucherList />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </CSPProvider>
  );
}

export default App;
