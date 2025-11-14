import {
  Form,
  Button,
  Alert,
  InputGroup,
  Dropdown,
  Spinner,
} from "react-bootstrap";
import { FaTicketAlt } from "react-icons/fa";
import { useEffect, useState } from "react";
import axios from "axios";
import AddressSection from "./AddressSection";

export default function CheckoutForm({
  user,
  setUser,
  voucherCode,
  setVoucherCode,
  userVouchers = [],
  userAddresses = [],
  setUserAddresses,
  payment,
  setPayment,
  error,
  setError,
  isProcessing,
  handleApplyVoucher,
  handlePlaceOrder,
  selectedCuaHangId,
  setSelectedCuaHangId,
  selectedItems,
  userLocation,
  setUserLocation,
  setShipping, // Nhận từ Checkout.js
  loadingShipping,
  setLoadingShipping,
  setUserCoordinates, // ✅ Nhận từ Checkout.js
  stores = [], // ✅ Nhận stores từ Checkout.js thay vì fetch riêng
  calculateItemPrice, // ✅ Nhận từ Checkout.js để tính giá QR
}) {
  const [fullAddress, setFullAddress] = useState(null);
  const [shippingFee, setShippingFee] = useState(10000); // Mặc định 10,000 VNĐ

  // Cập nhật phí ship cho Checkout.js
  const handleShippingFee = (fee) => {
    setShippingFee(fee);
    setShipping(fee); // Cập nhật state shipping trong Checkout.js
  };

  // ✅ REMOVED: useEffect fetch stores - giờ nhận stores từ props thay vì fetch riêng

  const onPlaceOrder = () => {
    // Validate input
    if (!user.fullName || !user.phone || !fullAddress || !selectedCuaHangId) {
      setError(
        "Vui lòng điền đầy đủ Họ và tên, SĐT, Địa chỉ và chọn cửa hàng!"
      );
      console.error("Thiếu dữ liệu:", {
        fullName: user.fullName,
        phone: user.phone,
        fullAddress,
        cuaHangId: selectedCuaHangId,
      });
      return;
    }

    if (!user.phone.match(/^[0][0-9]{9}$/)) {
      setError("Số điện thoại phải có 10 số, bắt đầu bằng 0.");
      return;
    }

    if (
      !fullAddress.address ||
      !fullAddress.provinceId ||
      !fullAddress.districtId ||
      !fullAddress.wardCode
    ) {
      setError("Địa chỉ không đầy đủ, vui lòng chọn tỉnh, quận, phường!");
      console.error("fullAddress không hợp lệ:", fullAddress);
      return;
    }

    // Chuẩn bị payload gửi backend
    const payload = {
      newAddress: {
        address: fullAddress.address,
        province: fullAddress.province || "",
        provinceId: fullAddress.provinceId,
        district: fullAddress.district || "",
        districtId: fullAddress.districtId,
        ward: fullAddress.ward || "",
        wardCode: fullAddress.wardCode,
        receiverName: user.fullName,
        phone: user.phone,
      },
      payment, // ✅ Gửi payment để backend phân biệt
      paymentMethodId: payment === "COD" ? 2 : payment === "QR" ? 3 : 1, // COD=2, QR=3, VNPAY=1
      voucherCode: voucherCode?.trim() || null,
      cuaHangId: selectedCuaHangId,
      orderItems: selectedItems.map((item) => ({
        FoodId: item.FoodId,
        Quantity: item.SoLuong || 1,
        SizeId: item.Size?.SizeId || null,
        ToppingIds: item.Toppings?.map((t) => t.ToppingId) || [],
        TotalPrice:
          ((item.DiscountPrice || item.Price || 0) +
            (item.Size?.ExtraPrice || 0) +
            (item.Toppings?.reduce(
              (sum, t) => sum + (t.ToppingPrice || 0),
              0
            ) || 0)) *
          (item.SoLuong || 1),
      })),
    };

    console.log("Place order payload:", payload);
    handlePlaceOrder(payload);
  };

  return (
    <div className="checkout-box p-3 shadow-sm mb-4">
      <h4 className="mb-3">Thông tin người dùng & Thanh toán</h4>
      {error && <Alert variant="danger">{error}</Alert>}

      {/* User info */}
      <Form.Group className="mb-3">
        <Form.Label>
          Họ và tên <span className="text-danger">*</span>
        </Form.Label>
        <Form.Control
          type="text"
          value={user.fullName}
          onChange={(e) => setUser({ ...user, fullName: e.target.value })}
          required
          placeholder="Nhập họ và tên"
        />
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>
          Số điện thoại <span className="text-danger">*</span>
        </Form.Label>
        <Form.Control
          type="tel"
          value={user.phone}
          onChange={(e) => setUser({ ...user, phone: e.target.value })}
          required
          placeholder="Nhập số điện thoại (VD: 0123456789)"
        />
      </Form.Group>

      {/* Store */}
      <Form.Group className="mb-3">
        <Form.Label>
          Chọn cửa hàng <span className="text-danger">*</span>
        </Form.Label>
        <Form.Select
          value={selectedCuaHangId || ""}
          onChange={(e) => setSelectedCuaHangId(e.target.value)}
          required
        >
          <option value="">
            {stores.length === 0 ? "Đang tải cửa hàng..." : "Chọn cửa hàng"}
          </option>
          {stores.map((s) => (
            <option key={s.CuaHangId} value={s.CuaHangId}>
              {s.CuaHangName || s.TenCuaHang} - {s.Address}{" "}
              {s.distance ? `(${s.distance} km)` : ""}
            </option>
          ))}
        </Form.Select>
      </Form.Group>

      {/* Address */}
      <AddressSection
        user={user}
        setUser={setUser}
        userAddresses={userAddresses}
        setUserAddresses={setUserAddresses}
        setError={setError}
        selectedCuaHangId={selectedCuaHangId}
        selectedItems={selectedItems}
        setFullAddress={setFullAddress}
        setShippingFee={handleShippingFee}
        setLoadingShipping={setLoadingShipping}
        setUserCoordinates={setUserCoordinates}
      />

      {/* Voucher */}
      <Form.Group className="mb-3">
        <Form.Label>Mã khuyến mại</Form.Label>
        <InputGroup>
          <InputGroup.Text>
            <FaTicketAlt />
          </InputGroup.Text>
          <Form.Control
            type="text"
            value={voucherCode}
            onChange={(e) => setVoucherCode(e.target.value)}
            placeholder="Nhập mã khuyến mại"
          />
          <Dropdown>
            <Dropdown.Toggle split variant="outline-primary" />
            <Dropdown.Menu>
              {userVouchers.length ? (
                userVouchers.map((v) => (
                  <Dropdown.Item
                    key={v.UserVoucherId}
                    onClick={() => setVoucherCode(v.Code)}
                  >
                    {v.Code}{" "}
                    {v.DiscountAmount
                      ? `- ${v.DiscountAmount.toLocaleString()}₫`
                      : ""}{" "}
                    {v.DiscountPercentage ? `- ${v.DiscountPercentage}%` : ""}
                  </Dropdown.Item>
                ))
              ) : (
                <Dropdown.Item disabled>
                  Không có voucher khả dụng
                </Dropdown.Item>
              )}
            </Dropdown.Menu>
          </Dropdown>
          <Button
            variant="success"
            onClick={handleApplyVoucher}
            disabled={isProcessing || !voucherCode.trim()}
          >
            Áp dụng
          </Button>
        </InputGroup>
      </Form.Group>

      {/* Payment */}
      <Form.Group className="mb-3">
        <Form.Label>
          Phương thức thanh toán <span className="text-danger">*</span>
        </Form.Label>
        <Form.Select
          value={payment}
          onChange={(e) => {
            setPayment(e.target.value);
            setError(""); // Clear error
          }}
          required
        >
          <option value="COD">Thanh toán khi nhận hàng (COD)</option>
          <option value="VNPAY">VNPAY</option>
          <option value="QR">Thanh toán qua QR Code</option>
        </Form.Select>
      </Form.Group>

      {/* Place Order */}
      <div className="mt-4 text-end">
        <Button
          variant="success"
          onClick={onPlaceOrder}
          disabled={
            isProcessing ||
            loadingShipping ||
            !fullAddress ||
            !user.fullName ||
            !user.phone ||
            !selectedCuaHangId
          }
        >
          {isProcessing ? (
            <Spinner as="span" animation="border" size="sm" />
          ) : loadingShipping ? (
            "Đang tính phí ship..."
          ) : (
            `Xác nhận đặt hàng (Ship: ${shippingFee.toLocaleString()}₫)`
          )}
        </Button>
      </div>

      <style>{`
        .checkout-box {
          background: #fff;
          border-radius: 8px;
        }
      `}</style>
    </div>
  );
}
