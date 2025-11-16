import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Table,
  Button,
  Spinner,
  Alert,
  Form,
  Modal,
  Row,
  Col,
} from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { setCartCount } from "../../redux/userSlice"; // Đảm bảo đường dẫn này là đúng
import { API_BASE_URL, buildApiUrl } from "../../utils/apiConfig";

const PLACEHOLDER = "/placeholder.jpg"; // Thêm placeholder image

// Hàm định dạng tiền tệ VND
const fmtVND = (n) =>
  typeof n === "number"
    ? n.toLocaleString("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
      })
    : "";

export default function Cart() {
  const [cart, setCart] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Edit modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [availableSizes, setAvailableSizes] = useState([]);
  const [availableToppings, setAvailableToppings] = useState([]);
  const [selectedSizeId, setSelectedSizeId] = useState(null);
  const [selectedToppingIds, setSelectedToppingIds] = useState([]);
  const [updatingOptions, setUpdatingOptions] = useState(false);

  const token = localStorage.getItem("token");
  const userId = useSelector((s) => s.user.userId);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Hàm tính tổng tiền của một item
  const calcItemTotal = (item) => {
    const base = item.DiscountPrice ?? item.Price ?? 0;
    const sizeExtra = item.Size?.ExtraPrice ?? 0;
    const toppingExtra = (item.Toppings || []).reduce(
      (s, t) => s + (t.ToppingPrice ?? 0),
      0
    );
    const unitTotal = base + sizeExtra + toppingExtra;
    return unitTotal * (item.SoLuong ?? 1);
  };

  const calcSelectedTotal = () => {
    return cart
      .filter((it) => selected.includes(it.GioHangID))
      .reduce((s, it) => s + calcItemTotal(it), 0);
  };

  const fetchCart = async () => {
    setLoading(true);
    setError("");
    try {
      if (!token && !userId) {
        setError("Bạn chưa đăng nhập");
        setLoading(false);
        return;
      }
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const url =
        userId && !token
          ? `${API_BASE_URL}/api/cart?userId=${userId}`
          : `${API_BASE_URL}/api/cart`;
      const { data } = await axios.get(url, { headers });
      if (!data || !data.cart) {
        setCart([]);
        setSelected([]);
        dispatch(setCartCount(0));
      } else {
        // CHUẨN HÓA DỮ LIỆU TỪ BACKEND: Đảm bảo Size và Toppings là các object hoàn chỉnh
        const normalized = data.cart.map((it) => ({
          ...it,
          // Đảm bảo Size là object đầy đủ, ngay cả khi backend chỉ trả về ID/Name/ExtraPrice rời rạc
          Size:
            it.Size ||
            (it.SizeID
              ? {
                  SizeID: it.SizeID,
                  SizeName: it.SizeName,
                  ExtraPrice: it.ExtraPrice,
                }
              : null),
          // Đảm bảo Toppings là mảng các object topping đầy đủ
          // Backend may return either `Toppings` (already flattened) or `GioHang_Toppings` (with nested `Topping`).
          Toppings:
            it.Toppings && it.Toppings.length > 0
              ? it.Toppings
              : it.GioHang_Toppings && it.GioHang_Toppings.length > 0
              ? it.GioHang_Toppings.map((gt) => gt.Topping || gt)
              : [],
        }));
        setCart(normalized);
        setSelected(normalized.map((it) => it.GioHangID));

        const totalCount = normalized.reduce(
          (sum, item) => sum + (item.SoLuong ?? 0),
          0
        );
        dispatch(setCartCount(totalCount));
      }
    } catch (err) {
      console.error("FETCH CART ERROR:", err.response?.data || err);
      setError(err.response?.data?.message || "Không tải được giỏ hàng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
    // eslint-disable-next-line
  }, []);

  const handleSelectAll = (e) => {
    if (e.target.checked) setSelected(cart.map((c) => c.GioHangID));
    else setSelected([]);
  };

  const handleSelectItem = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleDelete = async (gioHangId) => {
    if (!window.confirm("Bạn có chắc muốn xóa sản phẩm này?")) return;
    try {
      // include userId as fallback when token is not present
      const payload = { gioHangId };
      if (userId && !token) payload.userId = userId;
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      await axios.post(`${API_BASE_URL}/api/cart/delete`, payload, { headers });

      // Update cart state and then update global cart count to avoid dispatch during render
      const newCartAfterDelete = cart.filter(
        (it) => it.GioHangID !== gioHangId
      );
      setCart(newCartAfterDelete);
      const totalCountAfterDelete = newCartAfterDelete.reduce(
        (sum, item) => sum + (item.SoLuong ?? 0),
        0
      );
      dispatch(setCartCount(totalCountAfterDelete));
      setSelected((prev) => prev.filter((x) => x !== gioHangId));
    } catch (err) {
      console.error("DELETE ERROR:", err.response?.data || err);
      alert(err.response?.data?.message || "Xóa thất bại");
    }
  };

  // Open edit modal: load product sizes/toppings
  const openEditModal = async (item) => {
    try {
      setEditingItem(item);
      setShowEditModal(true);
      setAvailableSizes([]);
      setAvailableToppings([]);
      // Khởi tạo tùy chọn hiện tại của item
      setSelectedSizeId(item.Size?.SizeID ?? null);
      setSelectedToppingIds((item.Toppings || []).map((t) => t.ToppingID));

      const productId = item.FoodId;
      const res = await axios.get(`${API_BASE_URL}/api/products/${productId}`);

      const body = res.data || {};
      let sizes = [];
      let toppings = [];

      // Giả sử API trả về data.data.sizes/toppings
      if (body.success && body.data) {
        sizes = body.data.sizes || body.data.Sizes || [];
        toppings = body.data.toppings || body.data.Toppings || [];
      } else {
        sizes = body.sizes || body.Sizes || [];
        toppings = body.toppings || body.Toppings || [];
      }

      setAvailableSizes(sizes);
      setAvailableToppings(toppings);

      // Nếu item hiện tại chưa có size (ví dụ CategoryID = 4) nhưng product có size, set size đầu tiên
      if (!item.Size?.SizeID && sizes.length > 0) {
        setSelectedSizeId(sizes[0].SizeID ?? null);
      }
    } catch (err) {
      console.error("OPEN EDIT ERROR:", err);
      alert("Không tải được thông tin sản phẩm để chỉnh sửa");
      setShowEditModal(false);
    }
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingItem(null);
    setAvailableSizes([]);
    setAvailableToppings([]);
    setSelectedSizeId(null);
    setSelectedToppingIds([]);
  };

  const toggleTopping = (toppingId) => {
    setSelectedToppingIds((prev) =>
      prev.includes(toppingId)
        ? prev.filter((x) => x !== toppingId)
        : [...prev, toppingId]
    );
  };

  const saveOptions = async () => {
    if (!editingItem) return;
    if (!editingItem.GioHangID) {
      alert("Không thể chỉnh sửa mục này");
      return;
    }
    setUpdatingOptions(true);
    try {
      const payload = {
        gioHangId: editingItem.GioHangID,
        sizeId: selectedSizeId,
        toppingIds: selectedToppingIds,
      };
      if (userId && !token) payload.userId = userId;
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      // Gọi API cập nhật tùy chọn
      const res = await axios.post(
        `${API_BASE_URL}/api/cart/update-options`,
        payload,
        {
          headers,
        }
      );

      const updated = res?.data?.item || res?.data?.updatedItem || res?.data;
      if (res?.data?.success && updated) {
        // Prefer to use the backend-returned item (already formatted by backend) if available.
        const updatedItem = updated;

        // Ensure Size/Toppings shapes match frontend expectations when backend returns nested shapes
        const sizeObj =
          updatedItem.Size ||
          availableSizes.find(
            (s) => String(s.SizeID ?? s.id) === String(selectedSizeId)
          ) ||
          null;
        const toppingObjs =
          updatedItem.Toppings && updatedItem.Toppings.length > 0
            ? updatedItem.Toppings
            : availableToppings.filter((t) =>
                selectedToppingIds.includes(t.ToppingID)
              );

        const norm = {
          ...editingItem,
          ...updatedItem,
          Size: sizeObj,
          Toppings: toppingObjs,
        };

        // Update cart using functional state to avoid stale closures and recalc cartCount from new array
        // Update cart array and cartCount outside of state updater to avoid cross-component updates during render
        const newCartAfterUpdate = cart.map((it) =>
          it.GioHangID === norm.GioHangID ? norm : it
        );
        setCart(newCartAfterUpdate);
        const totalCountAfterUpdate = newCartAfterUpdate.reduce(
          (s, item) => s + (item.SoLuong ?? 0),
          0
        );
        dispatch(setCartCount(totalCountAfterUpdate));

        closeEditModal();
      } else {
        alert("Cập nhật thất bại");
      }
    } catch (err) {
      console.error("SAVE OPTIONS ERROR:", err.response?.data || err);
      alert(err.response?.data?.message || "Cập nhật tuỳ chọn thất bại");
    } finally {
      setUpdatingOptions(false);
    }
  };

  const handleUpdateQty = async (gioHangId, newQty) => {
    if (newQty < 1) {
      alert("Số lượng phải lớn hơn 0");
      return;
    }
    try {
      const payload = { gioHangId, quantity: newQty };
      if (userId && !token) payload.userId = userId;
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const res = await axios.post(`${API_BASE_URL}/api/cart/update`, payload, {
        headers,
      });
      if (res.data && res.data.success) {
        const newCartAfterQty = cart.map((it) =>
          it.GioHangID === gioHangId
            ? {
                ...it,
                SoLuong: newQty,
              }
            : it
        );
        setCart(newCartAfterQty);
        const totalCountAfterQty = newCartAfterQty.reduce(
          (sum, item) => sum + (item.SoLuong ?? 0),
          0
        );
        dispatch(setCartCount(totalCountAfterQty));
      } else {
        alert("Cập nhật thất bại");
      }
    } catch (err) {
      console.error("UPDATE ERROR:", err.response?.data || err);
      alert(err.response?.data?.message || "Cập nhật thất bại");
    }
  };

  const handleCheckout = () => {
    if (!token) {
      alert("Vui lòng đăng nhập");
      navigate("/login");
      return;
    }
    if (selected.length === 0) {
      alert("Vui lòng chọn sản phẩm để thanh toán");
      return;
    }

    // Lấy ra các item đã chọn để thanh toán (với dữ liệu đã chuẩn hóa: Size là object, Toppings là mảng object)
    const itemsToCheckout = cart.filter((it) =>
      selected.includes(it.GioHangID)
    );

    // Chuyển hướng đến checkout với dữ liệu items
    navigate("/checkout", {
      state: { items: itemsToCheckout },
    });
  };

  if (loading)
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
      </div>
    );
  if (error)
    return (
      <div className="container py-5">
        <Alert variant="danger">{error}</Alert>
      </div>
    );

  return (
    <div
      className="container"
      style={{ paddingTop: "10px", paddingBottom: "2rem" }}
    >
      <h2 className="text-center mb-4">Giỏ hàng của bạn</h2>
      {cart.length === 0 ? (
        <p className="text-center">Giỏ hàng của bạn đang trống.</p>
      ) : (
        <>
          <Table bordered hover responsive className="align-middle text-center">
            <thead className="table-dark">
              <tr>
                <th>
                  <Form.Check
                    type="checkbox"
                    checked={selected.length === cart.length && cart.length > 0}
                    onChange={handleSelectAll}
                  />{" "}
                  Chọn
                </th>
                <th>Hình ảnh</th>
                <th>Tên sản phẩm</th>
                <th>Size</th>
                <th>Topping</th>
                <th>Đơn giá</th>
                <th>Số lượng</th>
                <th>Thành tiền</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {cart.map((item) => (
                <tr key={item.GioHangID}>
                  <td>
                    <Form.Check
                      type="checkbox"
                      checked={selected.includes(item.GioHangID)}
                      onChange={() => handleSelectItem(item.GioHangID)}
                    />
                  </td>
                  <td>
                    <img
                      src={
                        item.ImageURL
                          ? item.ImageURL.startsWith("http") // SỬA: Nếu full URL (http/https), dùng nguyên xi
                            ? item.ImageURL
                            : `${API_BASE_URL}${item.ImageURL}` // Nếu relative (bắt đầu bằng /images/...), mới thêm prefix
                          : PLACEHOLDER
                      }
                      alt={item.FoodName}
                      style={{ width: 90, height: 90 }}
                      className="img-thumbnail"
                      onLoad={() =>
                        console.log(
                          `✅ IMAGE LOADED SUCCESS: ${item.FoodName} | FINAL SRC:`,
                          item.ImageURL
                        )
                      } // GIỮ: Log thành công
                      onError={(e) => {
                        console.error(
                          `❌ IMAGE LOAD FAILED: ${item.FoodName} | FINAL SRC:`,
                          e.target.src,
                          "| ORIG URL:",
                          item.ImageURL,
                          "| EVENT:",
                          e.nativeEvent
                        ); // SỬA: Log FINAL SRC để debug chính xác
                        e.target.src = PLACEHOLDER; // Fallback
                      }}
                    />
                  </td>
                  <td style={{ minWidth: 200 }}>{item.FoodName}</td>
                  {/* HIỂN THỊ SIZE */}
                  <td>
                    {item.Size
                      ? `${item.Size.SizeName} (+${fmtVND(
                          item.Size.ExtraPrice
                        )})`
                      : "Không có"}
                  </td>
                  {/* HIỂN THỊ TOPPING */}
                  <td>
                    {item.Toppings && item.Toppings.length > 0
                      ? item.Toppings.map((t) => (
                          <div key={t.ToppingID}>
                            {t.ToppingName} (+{fmtVND(t.ToppingPrice ?? 0)})
                          </div>
                        ))
                      : "Không có"}
                  </td>
                  {/* HIỂN THỊ ĐƠN GIÁ (Giá Food) */}
                  <td>{fmtVND(item.DiscountPrice ?? item.Price)}</td>
                  {/* HIỂN THỊ SỐ LƯỢNG */}
                  <td style={{ width: 120 }}>
                    <Form.Control
                      type="number"
                      min={1}
                      value={item.SoLuong}
                      onChange={(e) =>
                        handleUpdateQty(
                          item.GioHangID,
                          parseInt(e.target.value || "1", 10)
                        )
                      }
                    />
                  </td>
                  {/* HIỂN THỊ THÀNH TIỀN CỦA ITEM */}
                  <td>{fmtVND(calcItemTotal(item))}</td>
                  <td>
                    <div className="d-flex gap-2 justify-content-center">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => openEditModal(item)}
                      >
                        Chỉnh sửa
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(item.GioHangID)}
                      >
                        Xóa
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          {/* Edit options modal */}
          <Modal show={showEditModal} onHide={closeEditModal} centered>
            <Modal.Header closeButton>
              <Modal.Title>Chỉnh sửa tuỳ chọn</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {editingItem ? (
                <>
                  <h5 className="mb-3">{editingItem.FoodName}</h5>
                  <Row className="mt-3">
                    <Col md={6}>
                      <h6>Chọn Size</h6>
                      {availableSizes && availableSizes.length > 0 ? (
                        availableSizes.map((s) => (
                          <Form.Check
                            type="radio"
                            id={`size-edit-${s.SizeID}`}
                            key={s.SizeID}
                            name="sizeRadio"
                            // SỬA: Kiểm tra cả SizeID và id
                            label={`${s.SizeName} (+${fmtVND(
                              s.ExtraPrice ?? s.extraPrice ?? 0
                            )})`}
                            checked={
                              String(selectedSizeId) ===
                              String(s.SizeID ?? s.id)
                            }
                            onChange={() => setSelectedSizeId(s.SizeID ?? s.id)}
                          />
                        ))
                      ) : (
                        <div>Không có tuỳ chọn size</div>
                      )}
                    </Col>
                    <Col md={6}>
                      <h6>Chọn Topping</h6>
                      {availableToppings && availableToppings.length > 0 ? (
                        availableToppings.map((t) => (
                          <Form.Check
                            key={t.ToppingID}
                            type="checkbox"
                            id={`topping-edit-${t.ToppingID}`}
                            // SỬA: Lấy ToppingID
                            label={`${t.ToppingName} (+${fmtVND(
                              t.ToppingPrice ?? t.price ?? 0
                            )})`}
                            checked={selectedToppingIds.includes(t.ToppingID)}
                            onChange={() => toggleTopping(t.ToppingID)}
                          />
                        ))
                      ) : (
                        <div>Không có topping</div>
                      )}
                    </Col>
                  </Row>

                  <hr />
                  <div className="text-end">
                    <strong>Tổng tiền sau khi sửa: </strong>
                    {(() => {
                      const base =
                        editingItem.DiscountPrice ?? editingItem.Price ?? 0;
                      // Tìm Size object trong availableSizes
                      const selSize = availableSizes.find(
                        (x) =>
                          String(x.SizeID ?? x.id) === String(selectedSizeId)
                      );
                      const sizeExtra = selSize
                        ? selSize.ExtraPrice ?? selSize.extraPrice ?? 0
                        : 0;

                      // Tính tổng topping
                      const toppingSum = (availableToppings || [])
                        .filter((t) => selectedToppingIds.includes(t.ToppingID))
                        .reduce(
                          (s, t) => s + (t.ToppingPrice ?? t.price ?? 0),
                          0
                        );

                      const unit = base + sizeExtra + toppingSum;
                      return (
                        <span>
                          {fmtVND(unit)} x {editingItem.SoLuong ?? 1} ={" "}
                          <strong className="text-danger">
                            {fmtVND(unit * (editingItem.SoLuong ?? 1))}
                          </strong>
                        </span>
                      );
                    })()}
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <Spinner animation="border" size="sm" /> Đang tải tuỳ chọn...
                </div>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="secondary"
                onClick={closeEditModal}
                disabled={updatingOptions}
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                onClick={saveOptions}
                disabled={updatingOptions}
              >
                {updatingOptions ? "Đang lưu..." : "Lưu"}
              </Button>
            </Modal.Footer>
          </Modal>

          <h4 className="text-end mt-4">
            Tổng tiền: <strong>{fmtVND(calcSelectedTotal())}</strong>
          </h4>
          <div className="text-end mt-3">
            <Button variant="success" onClick={handleCheckout}>
              Thanh toán
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
