import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef, useCallback } from "react";
import { Row, Col, Alert, Spinner } from "react-bootstrap";
import CheckoutForm from "./checkout/CheckoutForm";
import OrderSummary from "./checkout/OrderSummary";
import { buildApiUrl } from "../../utils/apiConfig";

export default function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const initialItems = location.state?.items || [];
  const [itemsState, setItemsState] = useState(initialItems);

  const [user, setUser] = useState({
    id: null,
    username: "",
    fullName: "",
    email: "",
    phone: "",
    address: "",
  });

  const [userAddresses, setUserAddresses] = useState([]);
  const [payment, setPayment] = useState("COD");
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [voucherCode, setVoucherCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [userVouchers, setUserVouchers] = useState([]);
  const [stores, setStores] = useState([]);
  const [selectedCuaHangId, setSelectedCuaHangId] = useState("");
  const [shipping, setShipping] = useState(10000);
  const [loadingShipping, setLoadingShipping] = useState(false);
  const [userCoordinates, setUserCoordinates] = useState(null); // ✅ Lưu tọa độ user

  const isFromCart = itemsState.some((item) => item.GioHangID);
  const isSubmitted = useRef(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [progress, setProgress] = useState(100);
  const hasNavigatedRef = useRef(false); // Track nếu đã navigate away
  const itemsStateRef = useRef(itemsState); // Ref để lưu itemsState mới nhất
  const userRef = useRef(user); // Ref để lưu user mới nhất

  // Cập nhật refs khi state thay đổi
  useEffect(() => {
    itemsStateRef.current = itemsState;
  }, [itemsState]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // API wrapper
  const apiFetch = useCallback(
    async (url, options = {}) => {
      const headers = {
        "Content-Type": "application/json",
        ...options.headers,
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const fetchOptions = {
        ...options,
        headers,
        credentials: "include",
      };

      const res = await fetch(buildApiUrl(url), fetchOptions);
      if (res.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
        throw new Error("Token hết hạn hoặc không hợp lệ!");
      }

      const contentType = res.headers.get("content-type");
      if (!contentType?.includes("application/json")) {
        if (res.status === 200) return { success: true, data: {} };
        const text = await res.text();
        console.error("Non-JSON response:", text);
        throw new Error("Server trả về không phải JSON.");
      }

      const data = await res.json();
      console.log("📡 API RESPONSE:", { url, status: res.status, data }); // ✅ THÊM LOG: Response từ API
      if (!res.ok) throw new Error(data.message || `Lỗi ${res.status}`);
      return data;
    },
    [token, navigate]
  );

  // ✅ Lấy vị trí người dùng khi vào trang (giống StoresUser)
  useEffect(() => {
    if (navigator.geolocation && !userCoordinates) {
      console.log("🔍 Requesting user location...");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          setUserCoordinates(coords);
          console.log("✅ Got user location from browser:", coords);
        },
        (err) => {
          console.warn("⚠️ Cannot get user location:", err.message);
          console.log("Will use address-based coordinates instead");
        }
      );
    }
  }, []); // Chỉ chạy 1 lần khi mount

  // ✅ Load stores - filter theo khoảng cách nếu có tọa độ user
  useEffect(() => {
    const fetchStores = async () => {
      try {
        console.log("🔍 Fetching stores... userCoordinates:", userCoordinates);
        let url = "/api/orders/stores"; // ✅ FIX: Đúng route
        // Nếu có tọa độ user, thêm params để filter cửa hàng trong bán kính 15km
        if (userCoordinates?.lat && userCoordinates?.lng) {
          url = `/api/orders/stores?userLat=${userCoordinates.lat}&userLng=${userCoordinates.lng}&maxDistance=15`;
          console.log("✅ Fetching stores within 15km of user location:", url);
        } else {
          console.log("⚠️ No user coordinates, fetching all stores");
        }

        console.log("📡 Calling API:", url);
        const data = await apiFetch(url);
        console.log("📦 STORES RESPONSE:", data); // ✅ THÊM LOG: Response stores
        if (data.success) {
          setStores(data.data || []);
          console.log(
            `🗺️ Filtered stores:`,
            data.data?.length || 0,
            "with userCoords:",
            userCoordinates
          );
        }
      } catch (err) {
        console.error("LỖI LẤY CỬA HÀNG:", err);
      }
    };
    fetchStores();
  }, [apiFetch, userCoordinates]);

  // Load user profile
  useEffect(() => {
    if (!token) {
      setError("Vui lòng đăng nhập để tiếp tục!");
      navigate("/login");
      return;
    }
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const data = await apiFetch("/api/profile");
        if (data?.success && data.data) {
          setUser({
            id: data.data.Id,
            username: data.data.Username || "",
            fullName: data.data.FullName || "",
            email: data.data.Email || "",
            phone: data.data.Phone || "",
            address: data.data.Address || "",
          });
        } else throw new Error("Không tìm thấy thông tin người dùng.");
      } catch (err) {
        console.error("FETCH PROFILE ERR:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [token, apiFetch, navigate]);

  // Load userAddresses
  useEffect(() => {
    if (!user.id || !token) return;
    const fetchUserAddresses = async () => {
      try {
        const res = await apiFetch(`/api/orders/addresses?userId=${user.id}`);
        if (res.success) {
          setUserAddresses(res.data || []);
          console.log("✅ Loaded userAddresses:", res.data?.length || 0);
        }
      } catch (err) {
        console.error("Lỗi lấy địa chỉ người dùng:", err);
      }
    };
    fetchUserAddresses();
  }, [user.id, apiFetch]);

  // Load user vouchers
  useEffect(() => {
    const fetchUserVouchers = async () => {
      try {
        const res = await apiFetch("/api/profile/vouchers/my");
        if (res.success) {
          const available = res.data.filter((v) => !v.IsUsed);
          setUserVouchers(available);
        }
      } catch (err) {
        console.error("Lỗi lấy voucher người dùng:", err);
      }
    };
    fetchUserVouchers();
  }, [apiFetch]);

  // ✅ FIX: Load order details khi navigate với orderId (Tiếp tục thanh toán)
  useEffect(() => {
    const orderId = location.state?.orderId;
    // Chỉ fetch khi có orderId và chưa có items
    if (!orderId || initialItems.length > 0) return;

    const fetchOrderForCheckout = async () => {
      try {
        setLoading(true);
        console.log("📦 Fetching order for checkout:", orderId);
        const res = await apiFetch(`/api/orders/${orderId}`);
        if (res.success && res.data) {
          // Map OrderDetails từ API về format itemsState
          // ⚠️ LƯU Ý: detail.Price đã là unitPrice (bao gồm Food + Size + Topping)
          // Nên set Size.ExtraPrice = 0 và Toppings.ToppingPrice = 0 để tránh tính double
          const mapped = (res.data.OrderDetails || []).map((detail) => ({
            FoodId: detail.FoodId,
            FoodName: detail.FoodName,
            ImageURL: detail.ImageURL,
            Price: detail.Price || 0, // ✅ Đây là unitPrice đã tính sẵn
            DiscountPrice: detail.Price || 0, // ✅ Dùng Price làm DiscountPrice
            Size: detail.Size
              ? {
                  SizeId: detail.Size.SizeID,
                  SizeName: detail.Size.SizeName,
                  ExtraPrice: 0, // ✅ Set = 0 vì Price đã bao gồm
                }
              : null,
            Toppings: (detail.Toppings || []).map((t) => ({
              ToppingID: t.ToppingID || t.ToppingId, // ✅ Support cả 2 format
              ToppingName: t.ToppingName,
              ToppingPrice: 0, // ✅ Set = 0 vì Price đã bao gồm
            })),
            SoLuong: detail.Quantity || 1,
          }));
          setItemsState(mapped);
          console.log("✅ Loaded order items for checkout:", mapped.length);
        }
      } catch (err) {
        console.error("❌ Load order for checkout error:", err);
        setError(err.message || "Không thể tải đơn hàng");
      } finally {
        setLoading(false);
      }
    };

    fetchOrderForCheckout();
  }, [apiFetch, location.state, initialItems.length]);

  // ✅ Lưu đơn tạm khi rời trang (chỉ gọi 1 lần duy nhất khi unmount)
  useEffect(() => {
    const savePendingOnUnmount = async () => {
      const currentItems = itemsStateRef.current;
      const currentUser = userRef.current;
      const isPending = location.state?.orderId;
      
      // Chỉ lưu nếu:
      // 1. Có items
      // 2. Chưa submit thanh toán thành công
      // 3. Không phải đơn pending đang tiếp tục
      if (
        currentItems.length > 0 &&
        !isSubmitted.current &&
        !isPending &&
        !hasNavigatedRef.current
      ) {
        hasNavigatedRef.current = true; // Đánh dấu đã lưu
        
        try {
          console.log("💾 Saving pending order on page leave...");
          
          const orderItems = currentItems.map((item) => ({
            FoodId: item.FoodId,
            SizeID: item.Size?.SizeId || null,
            ToppingIDs: (item.Toppings || []).map((t) => t.ToppingID),
            Quantity: item.SoLuong || 1,
            TotalPrice:
              (item.DiscountPrice || item.Price || 0) * (item.SoLuong || 1),
          }));

          const fullAddr = currentUser.address || "Chưa nhập địa chỉ";
          const token = localStorage.getItem("token");

          const response = await fetch(buildApiUrl("/api/orders/save-pending"), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              orderItems,
              newAddress: fullAddr,
            }),
          });

          const data = await response.json();
          if (data.success) {
            console.log("✅ Pending order saved successfully, ID:", data.orderId);
          } else {
            console.error("❌ Save pending failed:", data.message);
          }
        } catch (err) {
          console.error("❌ Save pending order error:", err);
        }
      }
    };

    // Cleanup: Gọi khi component unmount (rời trang)
    return () => {
      savePendingOnUnmount();
    };
  }, [location.state]); // Chỉ phụ thuộc vào location.state

  // Calculate price (sync cho UI)
  const calculateItemPrice = useCallback((item) => {
    const base = item.DiscountPrice ?? item.Price ?? 0;
    const sizeExtra = item.Size?.ExtraPrice ?? 0;
    const toppingExtra = (item.Toppings || []).reduce(
      (s, t) => s + (t.ToppingPrice ?? 0),
      0
    );
    return base + sizeExtra + toppingExtra;
  }, []);

  const subtotal = itemsState.reduce((sum, it) => {
    const itemTotal = calculateItemPrice(it) * (it.SoLuong ?? 1);
    return sum + itemTotal;
  }, 0);

  const totalAfterDiscount =
    (subtotal || 0) + (shipping || 0) - (discountAmount || 0);

  // Apply voucher
  const handleApplyVoucher = async () => {
    if (!voucherCode.trim()) return setError("Vui lòng nhập mã khuyến mại.");
    try {
      setIsProcessing(true);
      setError("");
      const res = await apiFetch("/api/profile/apply", {
        method: "POST",
        body: JSON.stringify({ voucherCode, subtotal }),
      });
      console.log("🎟️ VOUCHER RESPONSE:", res); // ✅ THÊM LOG: Voucher response
      if (res.success) {
        console.log("💸 Discount applied:", res.discountAmount); // ✅ THÊM LOG: Discount
        setDiscountAmount(res.discountAmount || 0);
        setSuccessMessage(
          `Áp dụng voucher thành công! Giảm ${(
            res.discountAmount || 0
          ).toLocaleString("vi-VN")}₫`
        );
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        setDiscountAmount(0);
        throw new Error(res.message || "Voucher không hợp lệ hoặc hết hạn.");
      }
    } catch (err) {
      console.error("VOUCHER ERR:", err);
      setError(err.message);
      setDiscountAmount(0);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle place order
  const handlePlaceOrder = async (orderData) => {
    if (isProcessing) return;
    console.log("=== handlePlaceOrder ===");
    console.log("Order data:", orderData);
    console.log("User state:", user);

    const {
      newAddress,
      paymentMethodId,
      voucherCode: appliedVoucher,
      cuaHangId,
      orderItems,
    } = orderData;

    if (!user.fullName || !user.phone || !newAddress || !cuaHangId) {
      setError(
        "Vui lòng điền đầy đủ Họ và tên, SĐT, Địa chỉ và chọn cửa hàng."
      );
      console.error("Thiếu dữ liệu:", {
        fullName: user.fullName,
        phone: user.phone,
        newAddress,
        cuaHangId,
      });
      return;
    }

    try {
      setIsProcessing(true);
      setError("");

      // Lưu new address nếu cần và lấy deliveryAddressId
      let deliveryAddressId = null;
      if (
        newAddress &&
        !userAddresses.some(
          (addr) =>
            addr.Address === newAddress.address && addr.Phone === user.phone
        )
      ) {
        const addressToSave = {
          ...newAddress,
          receiverName: user.fullName,
          phone: user.phone,
          isDefault: newAddress.isDefault || false,
        };
        console.log("Saving new address:", addressToSave);
        try {
          const saveRes = await apiFetch("/api/orders/addresses/save", {
            method: "POST",
            body: JSON.stringify(addressToSave),
          });
          if (saveRes.success) {
            console.log("💾 Address saved:", saveRes.addressId);
            deliveryAddressId = saveRes.addressId;
            const addrRes = await apiFetch(
              `/api/orders/addresses?userId=${user.id}`
            );
            setUserAddresses(addrRes.data || []);
          }
        } catch (saveErr) {
          console.error("Lưu address thất bại (không block):", saveErr);
        }
      }

      // ✅ Build orderItems - logic đơn giản hơn
      let finalOrderItems = [];
      let finalSubtotal = 0;

      if (isFromCart) {
        // ✅ FIX: Từ cart: Dùng itemsState (có GioHangID), không phải orderItems
        finalOrderItems = itemsState
          .filter((item) => item.GioHangID) // Đảm bảo có GioHangID
          .map((item) => item.GioHangID);
        finalSubtotal = subtotal;
        console.log("📦 Cart items to order:", finalOrderItems);
      } else {
        // ✅ Không từ cart: Dùng itemsState (có đầy đủ Price/Size/Toppings)
        finalOrderItems = itemsState.map((item) => {
          const quantity = item.SoLuong || 1;
          const itemPrice = calculateItemPrice(item);
          const itemTotalPrice = itemPrice * quantity;

          console.log(
            `🔍 Item "${item.FoodName}": unitPrice=${itemPrice}, qty=${quantity}, total=${itemTotalPrice}`
          );

          if (itemTotalPrice <= 0) {
            throw new Error(
              `Sản phẩm "${item.FoodName}" có giá 0₫. Vui lòng kiểm tra lại!`
            );
          }

          finalSubtotal += itemTotalPrice;

          return {
            FoodId: item.FoodId,
            Quantity: quantity,
            SizeId: item.Size?.SizeId || null,
            // ✅ FIX: Dùng ToppingID (chữ ID hoa) thay vì ToppingId (chữ d thường)
            // và filter ra null/undefined
            ToppingIds: (item.Toppings || [])
              .map((t) => t.ToppingID || t.ToppingId) // Support cả 2 format
              .filter((id) => id != null), // Bỏ null và undefined
            TotalPrice: itemTotalPrice,
          };
        });
      }

      const finalTotal = finalSubtotal + shipping - discountAmount;

      // ✅ FIX: Check if this is a pending order (from "Tiếp tục thanh toán")
      const pendingOrderId = location.state?.orderId;

      // Payload
      const payload = {
        newAddress,
        deliveryAddressId,
        paymentMethodId,
        voucherCode: appliedVoucher?.trim() || null,
        cuaHangId,
        totalPrice: finalTotal, // Chính xác sau fetch
        shippingFee: shipping,
      };

      if (pendingOrderId) {
        // ✅ Nếu là pending order, truyền pendingOrderId thay vì items
        payload.pendingOrderId = pendingOrderId;
        console.log("✅ Using pending order:", pendingOrderId);
      } else if (isFromCart) {
        payload.selectedItems = finalOrderItems;
      } else {
        payload.orderItems = finalOrderItems;
      }

      console.log(
        "🚀 PLACE ORDER PAYLOAD FULL:",
        JSON.stringify(payload, null, 2)
      ); // ✅ THÊM LOG: Payload đầy đủ
      console.log("🔍 PendingOrderId:", pendingOrderId);
      console.log("📦 FinalOrderItems:", finalOrderItems);
      console.log("💰 FinalTotal:", finalTotal);

      const data = await apiFetch("/api/orders/place-order", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      console.log("✅ PLACE ORDER RESPONSE:", data); // ✅ THÊM LOG: Response place-order
      console.log("🔗 VNPAY URL GENERATED:", data.Url);
      console.log("📊 RESPONSE CODE:", data.Code);

      // VNPay redirect
      if (data.success && data.Code === 1 && data.Url) {
        console.log("🚀 REDIRECTING TO VNPAY:", data.Url); // ✅ THÊM LOG: Redirect VNPay
        window.location.href = data.Url;
        return;
      }

      // QR Code payment redirect
      if (data.success && data.paymentMethod === "QR" && data.qrCodeUrl) {
        console.log("📱 REDIRECTING TO QR PAYMENT PAGE");
        navigate("/qr-payment", {
          state: {
            orderId: data.orderId,
            totalPrice: data.totalPrice,
            qrCodeUrl: data.qrCodeUrl,
          },
        });
        return;
      }

      // COD success
      if (data.success) {
        isSubmitted.current = true;
        setSuccessMessage(`Đặt hàng thành công! Mã đơn: ${data.orderId}`);
        setProgress(100);
        setTimeout(() => {
          setSuccessMessage("");
          navigate("/successful", {
            state: {
              orderId: data.orderId,
              totalPrice: finalTotal,
              createdAt: new Date().toISOString(),
            },
          });
        }, 2000);
      } else throw new Error(data.message || "Đặt hàng thất bại.");
    } catch (err) {
      console.error("ORDER ERR:", err);
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Render (giữ nguyên)
  if (loading)
    return (
      <div className="text-center py-5">
        <Spinner animation="border" /> Đang tải thông tin cá nhân...
      </div>
    );

  if (error && !token)
    return (
      <Alert variant="danger" className="text-center py-5 container mt-5">
        {error}
        <button
          className="btn btn-primary mt-2"
          onClick={() => navigate("/login")}
        >
          Đăng nhập lại
        </button>
      </Alert>
    );

  if (itemsState.length === 0)
    return (
      <Alert variant="info" className="text-center py-5 container mt-5">
        Không có sản phẩm nào để thanh toán.
      </Alert>
    );

  return (
    <div
      className="checkout-container container py-5"
      style={{ paddingTop: 80 }}
    >
      {successMessage && (
        <div className="success-banner">
          <span>{successMessage}</span>
          <div
            className="success-progress"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}

      <h2
        className="checkout-title mb-4 text-center"
        style={{ marginTop: "-40px" }}
      >
        Thanh toán
      </h2>

      <Row>
        <Col md={5}>
          <CheckoutForm
            user={user}
            setUser={setUser}
            voucherCode={voucherCode}
            setVoucherCode={setVoucherCode}
            userVouchers={userVouchers}
            userAddresses={userAddresses}
            setUserAddresses={setUserAddresses}
            payment={payment}
            setPayment={setPayment}
            error={error}
            setError={setError}
            isProcessing={isProcessing}
            handleApplyVoucher={handleApplyVoucher}
            handlePlaceOrder={handlePlaceOrder}
            selectedCuaHangId={selectedCuaHangId}
            setSelectedCuaHangId={setSelectedCuaHangId}
            selectedItems={itemsState}
            discountAmount={discountAmount}
            totalAfterDiscount={totalAfterDiscount}
            stores={stores}
            setShipping={setShipping}
            loadingShipping={loadingShipping}
            setLoadingShipping={setLoadingShipping}
            setUserCoordinates={setUserCoordinates}
          />
        </Col>

        <Col md={7}>
          <OrderSummary
            itemsState={itemsState}
            setItemsState={setItemsState}
            calculateItemPrice={calculateItemPrice}
            subtotal={subtotal}
            shipping={shipping}
            discountAmount={discountAmount}
            totalAfterDiscount={totalAfterDiscount}
            apiFetch={apiFetch}
          />
        </Col>
      </Row>

      <style>{`
        .success-banner {
          position: fixed;
          top: var(--header-height, 70px); /* place below header */
          left: 0;
          width: 100%;
          background: linear-gradient(90deg, #dae4daff, #81c784);
          color: #fff;
          text-align: center;
          padding: 10px 0;
          font-weight: 600;
          font-size: 15px;
          z-index: 900; /* keep below header so header never gets covered */
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
          border-radius: 0 0 8px 8px;
        }
        .success-progress {
          height: 4px;
          background: linear-gradient(90deg, #ebf3ebff, #c8e6c9);
          width: 100%;
          transition: width 2s linear;
          border-radius: 0 0 8px 8px;
        }
      `}</style>
    </div>
  );
}
