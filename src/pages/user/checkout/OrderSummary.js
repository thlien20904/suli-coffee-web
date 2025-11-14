import { Table, Form, Button, Spinner } from "react-bootstrap";
import { useState, useCallback } from "react";
import { getImageUrl, getDefaultImage } from "../../../utils/imageUtils";

export default function OrderSummary({
  itemsState,
  setItemsState,
  calculateItemPrice,
  subtotal,
  shipping,
  discountAmount,
  totalAfterDiscount,
  apiFetch,
  isProcessing = false, // ✅ Nhận từ Checkout.js
}) {
  const [loadingItemIndex, setLoadingItemIndex] = useState(null);

  // ✅ Move async logic ra ngoài onClick để giảm "click handler took Xms" warning
  const handleLoadProductOptions = useCallback(
    async (index, foodId) => {
      setLoadingItemIndex(index);
      try {
        const res = await apiFetch(`/api/products/${foodId}`);
        if (res.success && res.data) {
          const productData = res.data.data || res.data;
          setItemsState((prev) =>
            prev.map((it, i) =>
              i === index
                ? {
                    ...it,
                    AvailableSizes: productData.sizes || [],
                    AvailableToppings: productData.toppings || [],
                    editing: true,
                  }
                : it
            )
          );
        }
      } catch (err) {
        console.error("Load product options error:", err);
        alert("Không thể tải tuỳ chọn sản phẩm");
      } finally {
        setLoadingItemIndex(null);
      }
    },
    [apiFetch, setItemsState]
  );

  return (
    <div
      className="checkout-box p-3 shadow-sm"
      style={{ position: "relative" }}
    >
      {/* Loading Overlay */}
      {isProcessing && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(255, 255, 255, 0.9)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
            borderRadius: "8px",
          }}
        >
          <Spinner
            animation="border"
            variant="success"
            style={{ width: "3rem", height: "3rem" }}
          />
          <p className="mt-3 fw-bold text-success">Đang xử lý đơn hàng...</p>
        </div>
      )}

      <h4 className="mb-3">Đơn hàng</h4>
      <Table bordered hover responsive className="align-middle text-center">
        <thead className="table-dark">
          <tr>
            <th>Hình ảnh</th>
            <th>Sản phẩm</th>
            <th>Size</th>
            <th>Topping</th>
            <th>Số lượng</th>
            <th>Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          {itemsState.map((item, index) => {
            const itemTotal = calculateItemPrice(item) * (item.SoLuong ?? 1);
            const key = item.GioHangID || index;
            return (
              <tr key={key}>
                <td>
                  <img
                    src={
                      item.ImageURL
                        ? getImageUrl(item.ImageURL)
                        : getDefaultImage()
                    }
                    alt={item.FoodName}
                    className="checkout-img"
                  />
                </td>
                <td className="text-start">{item.FoodName}</td>
                <td>{item.Size?.SizeName || "Không có"}</td>

                <td>
                  {item.Toppings && item.Toppings.length > 0
                    ? item.Toppings.map((t) => (
                        <div key={t.ToppingID}>
                          {t.ToppingName} (+
                          {t.ToppingPrice.toLocaleString("vi-VN")} ₫)
                        </div>
                      ))
                    : "Không có"}

                  {item.Size !== null && (
                    <div className="mt-2">
                      {!item.editing ? (
                        <Button
                          size="sm"
                          variant="outline-primary"
                          disabled={loadingItemIndex === index}
                          onClick={() => {
                            // ✅ Call async function ngay lập tức để giảm warning
                            handleLoadProductOptions(index, item.FoodId);
                          }}
                        >
                          {loadingItemIndex === index ? (
                            <>
                              <Spinner
                                as="span"
                                animation="border"
                                size="sm"
                                role="status"
                                aria-hidden="true"
                                className="me-1"
                              />
                              Đang tải...
                            </>
                          ) : (
                            "Chỉnh sửa tuỳ chọn"
                          )}
                        </Button>
                      ) : (
                        <div>
                          <Form.Select
                            size="sm"
                            className="mb-1"
                            value={item.Size?.SizeID || ""}
                            onChange={(e) => {
                              const sid = e.target.value
                                ? Number(e.target.value)
                                : null;
                              setItemsState((prev) =>
                                prev.map((it, ii) =>
                                  ii === index
                                    ? {
                                        ...it,
                                        Size:
                                          it.AvailableSizes.find(
                                            (s) => s.SizeID === sid
                                          ) || null,
                                      }
                                    : it
                                )
                              );
                            }}
                          >
                            <option value="">Không thay đổi</option>
                            {(item.AvailableSizes || []).map((s) => (
                              <option key={s.SizeID} value={s.SizeID}>
                                {`${s.SizeName} (+${Number(
                                  s.ExtraPrice || 0
                                ).toLocaleString("vi-VN")} ₫)`}
                              </option>
                            ))}
                          </Form.Select>

                          <div className="d-flex flex-wrap mb-1">
                            {(item.AvailableToppings || []).map((t) => (
                              <Form.Check
                                key={t.ToppingID}
                                type="checkbox"
                                label={`${t.ToppingName} (+${Number(
                                  t.ToppingPrice || 0
                                ).toLocaleString("vi-VN")} ₫)`}
                                checked={(item.Toppings || []).some(
                                  (tt) => tt.ToppingID === t.ToppingID
                                )}
                                onChange={() => {
                                  setItemsState((prev) =>
                                    prev.map((it, ii) => {
                                      if (ii !== index) return it;
                                      const exists = (it.Toppings || []).some(
                                        (tt) => tt.ToppingID === t.ToppingID
                                      );
                                      const fullTopping =
                                        (it.AvailableToppings || []).find(
                                          (at) => at.ToppingID === t.ToppingID
                                        ) || t;
                                      return {
                                        ...it,
                                        Toppings: exists
                                          ? (it.Toppings || []).filter(
                                              (tt) =>
                                                tt.ToppingID !== t.ToppingID
                                            )
                                          : [
                                              ...(it.Toppings || []),
                                              fullTopping,
                                            ],
                                      };
                                    })
                                  );
                                }}
                              />
                            ))}
                          </div>

                          <div>
                            <Button
                              size="sm"
                              variant="success"
                              className="me-2"
                              onClick={async () => {
                                try {
                                  if (item.GioHangID) {
                                    const body = {
                                      gioHangId: item.GioHangID,
                                      sizeId: item.Size?.SizeID || null,
                                      toppingIds: (item.Toppings || []).map(
                                        (tt) => tt.ToppingID
                                      ),
                                    };
                                    const res = await apiFetch(
                                      "/api/cart/update-options",
                                      {
                                        method: "POST",
                                        body: JSON.stringify(body),
                                      }
                                    );
                                    if (res && res.success) {
                                      const updated =
                                        res.item || res.data || {};
                                      const normalized = {
                                        ...updated,
                                        Size:
                                          updated.Size ||
                                          (updated.SizeID
                                            ? {
                                                SizeID: updated.SizeID,
                                                SizeName: updated.SizeName,
                                                ExtraPrice: updated.ExtraPrice,
                                              }
                                            : null),
                                        Toppings:
                                          updated.Toppings ||
                                          updated.ToppingList ||
                                          [],
                                      };
                                      setItemsState((prev) =>
                                        prev.map((it, ii) =>
                                          ii === index
                                            ? {
                                                ...it,
                                                ...normalized,
                                                editing: false,
                                              }
                                            : it
                                        )
                                      );
                                    } else {
                                      throw new Error(
                                        (res && res.message) ||
                                          "Cập nhật thất bại"
                                      );
                                    }
                                  } else {
                                    setItemsState((prev) =>
                                      prev.map((it, ii) =>
                                        ii === index
                                          ? { ...it, editing: false }
                                          : it
                                      )
                                    );
                                  }
                                } catch (err) {
                                  alert(
                                    "Lưu tuỳ chọn thất bại: " + err.message
                                  );
                                }
                              }}
                            >
                              Lưu
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() =>
                                setItemsState((prev) =>
                                  prev.map((it, ii) =>
                                    ii === index
                                      ? { ...it, editing: false }
                                      : it
                                  )
                                )
                              }
                            >
                              Huỷ
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </td>

                <td style={{ width: 120 }}>
                  <Form.Control
                    type="number"
                    min={1}
                    value={item.SoLuong}
                    onChange={async (e) => {
                      const newQty = parseInt(e.target.value || "1", 10);
                      if (item.GioHangID) {
                        try {
                          await apiFetch("/api/cart/update", {
                            method: "POST",
                            body: JSON.stringify({
                              gioHangId: item.GioHangID,
                              quantity: newQty,
                            }),
                          });
                          const updated = itemsState.map((it) =>
                            it.GioHangID === item.GioHangID
                              ? { ...it, SoLuong: newQty }
                              : it
                          );
                          setItemsState(updated);
                        } catch (err) {
                          console.error("UPDATE QTY ERR:", err);
                          alert("Cập nhật số lượng thất bại");
                        }
                      } else {
                        setItemsState((prev) =>
                          prev.map((it, i) =>
                            i === index ? { ...it, SoLuong: newQty } : it
                          )
                        );
                      }
                    }}
                  />
                </td>
                <td>{itemTotal.toLocaleString("vi-VN")} ₫</td>
              </tr>
            );
          })}
        </tbody>
      </Table>

      <h5 className="text-end">
        Tạm tính: {subtotal.toLocaleString("vi-VN")} ₫ <br />
        Phí ship: {shipping.toLocaleString("vi-VN")} ₫ <br />
        {discountAmount > 0 && (
          <>
            Giảm giá: -{discountAmount.toLocaleString("vi-VN")} ₫ <br />
          </>
        )}
        <strong className="text-danger">
          Tổng cộng: {totalAfterDiscount.toLocaleString("vi-VN")} ₫
        </strong>
      </h5>
    </div>
  );
}
