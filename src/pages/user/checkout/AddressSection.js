import { Form, Button, Alert, Spinner } from "react-bootstrap";
import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { buildApiUrl } from "../../../utils/apiConfig";

axios.defaults.withCredentials = true;

export default function AddressSection({
  user,
  setUser,
  userAddresses = [],
  setUserAddresses,
  setError,
  selectedCuaHangId,
  selectedItems,
  setFullAddress,
  setShippingFee,
  setLoadingShipping,
  setUserCoordinates, // ✅ Nhận từ CheckoutForm
}) {
  const [baseStreet, setBaseStreet] = useState("");
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedWard, setSelectedWard] = useState("");
  const [selectedSavedAddressId, setSelectedSavedAddressId] = useState(null);
  const [isDefaultAddress, setIsDefaultAddress] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState("");

  // ✅ FIX: Wrap bằng useCallback để tránh re-create function mỗi lần render
  const getFullAddress = useCallback(() => {
    const provinceName =
      provinces.find(
        (p) => parseInt(p.ProvinceID) === parseInt(selectedProvince)
      )?.ProvinceName || "";
    const districtName =
      districts.find(
        (d) => parseInt(d.DistrictID) === parseInt(selectedDistrict)
      )?.DistrictName || "";
    const wardName =
      wards.find((w) => String(w.WardCode) === String(selectedWard))
        ?.WardName || "";
    return [baseStreet, wardName, districtName, provinceName]
      .filter(Boolean)
      .join(", ");
  }, [
    baseStreet,
    selectedProvince,
    selectedDistrict,
    selectedWard,
    provinces,
    districts,
    wards,
  ]);

  // Cập nhật fullAddress object để gửi backend
  useEffect(() => {
    const selProv = selectedProvince ? parseInt(selectedProvince) : null;
    const selDist = selectedDistrict ? parseInt(selectedDistrict) : null;
    const selWard = selectedWard ? String(selectedWard) : null;
    const provinceName =
      provinces.find((p) => p.ProvinceID === selProv)?.ProvinceName || "";
    const districtName =
      districts.find((d) => d.DistrictID === selDist)?.DistrictName || "";
    const wardName =
      wards.find((w) => String(w.WardCode) === selWard)?.WardName || "";
    const fullObj = {
      address: baseStreet,
      province: provinceName,
      provinceId: selProv,
      district: districtName,
      districtId: selDist,
      ward: wardName,
      wardCode: selWard,
      receiverName: user.fullName,
      phone: user.phone,
      fullString: getFullAddress(),
    };
    setFullAddress(fullObj);
    // ✅ FIX: Thêm setFullAddress và getFullAddress vào dependencies
  }, [
    baseStreet,
    selectedProvince,
    selectedDistrict,
    selectedWard,
    user.fullName,
    user.phone,
    provinces,
    districts,
    wards,
    setFullAddress,
    getFullAddress,
  ]);

  // Xử lý khi chọn địa chỉ đã lưu
  useEffect(() => {
    if (selectedSavedAddressId) {
      const savedAddr = userAddresses.find(
        (addr) => addr.DeliveryAddressId === parseInt(selectedSavedAddressId)
      );
      if (savedAddr) {
        setBaseStreet(savedAddr.Address);
        setSelectedProvince(savedAddr.ProvinceId || "");
        setSelectedDistrict(savedAddr.DistrictId || "");
        setSelectedWard(savedAddr.WardCode || "");
        setIsDefaultAddress(savedAddr.IsDefault);
        // ✅ FIX: Dùng functional update để tránh vòng lặp vô hạn
        setUser((prev) => ({
          ...prev,
          fullName: savedAddr.ReceiverName,
          phone: savedAddr.Phone,
        }));

        // ✅ Set tọa độ user để filter cửa hàng trong bán kính 15km
        console.log("🔍 Saved address data:", {
          Latitude: savedAddr.Latitude,
          Longitude: savedAddr.Longitude,
          hasSetUserCoordinates: !!setUserCoordinates,
        });

        if (savedAddr.Latitude && savedAddr.Longitude && setUserCoordinates) {
          setUserCoordinates({
            lat: savedAddr.Latitude,
            lng: savedAddr.Longitude,
          });
          console.log("✅ User coordinates set from saved address:", {
            lat: savedAddr.Latitude,
            lng: savedAddr.Longitude,
          });
        } else {
          console.warn(
            "⚠️ Saved address missing coordinates - will show all stores"
          );
          // Reset coordinates để load all stores
          if (setUserCoordinates) {
            setUserCoordinates(null);
          }
        }
      }
    } else {
      setBaseStreet("");
      setSelectedProvince("");
      setSelectedDistrict("");
      setSelectedWard("");
      setIsDefaultAddress(false);
    }
    // ✅ FIX: Bỏ `user` khỏi dependencies để tránh vòng lặp
  }, [selectedSavedAddressId, userAddresses, setUser]);

  const handleProvinceChange = (value) =>
    setSelectedProvince(value ? parseInt(value) : "");
  const handleDistrictChange = (value) =>
    setSelectedDistrict(value ? parseInt(value) : "");
  const handleWardChange = (value) =>
    setSelectedWard(value ? String(value) : "");
  const handleSavedChange = (value) => setSelectedSavedAddressId(value);

  // Lưu địa chỉ
  const saveAddress = async () => {
    const selProv = parseInt(selectedProvince);
    const selDist = parseInt(selectedDistrict);
    const selWard = String(selectedWard);
    const provinceName =
      provinces.find((p) => p.ProvinceID === selProv)?.ProvinceName || "";
    const districtName =
      districts.find((d) => d.DistrictID === selDist)?.DistrictName || "";
    const wardName =
      wards.find((w) => String(w.WardCode) === selWard)?.WardName || "";

    if (
      !baseStreet ||
      !provinceName ||
      !districtName ||
      !wardName ||
      !user.fullName ||
      !user.phone
    ) {
      setError("Vui lòng chọn đầy đủ tỉnh/thành, quận/huyện, phường/xã!");
      return;
    }

    const addressToSave = {
      address: baseStreet,
      province: provinceName,
      provinceId: selProv,
      district: districtName,
      districtId: selDist,
      ward: wardName,
      wardCode: selWard,
      receiverName: user.fullName,
      phone: user.phone,
      isDefault: isDefaultAddress,
    };

    setSavingAddress(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        buildApiUrl("/api/orders/addresses/save"),
        addressToSave,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      if (res.data.success) {
        setSaveSuccess("Đã lưu địa chỉ thành công!");
        const addrRes = await axios.get(
          buildApiUrl(`/api/orders/addresses?userId=${user.Id}`),
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        setUserAddresses(addrRes.data.data || []);
        setSelectedSavedAddressId(res.data.addressId);
      } else {
        setError(res.data.message || "Lưu địa chỉ thất bại!");
      }
    } catch (err) {
      console.error("❌ Lưu address error:", err);
      setError(err.response?.data?.message || "Lỗi kết nối khi lưu địa chỉ!");
    } finally {
      setSavingAddress(false);
      setTimeout(() => setSaveSuccess(""), 3000);
    }
  };

  // Fetch provinces
  useEffect(() => {
    axios
      .get(buildApiUrl("/api/address/provinces"))
      .then((res) => {
        if (res.data.success) setProvinces(res.data.data || []);
      })
      .catch((err) => console.error(err));
  }, []);

  // Fetch districts khi chọn province
  useEffect(() => {
    if (!selectedProvince) {
      setDistricts([]);
      setSelectedDistrict("");
      setWards([]);
      setSelectedWard("");
      return;
    }
    axios
      .get(buildApiUrl(`/api/address/districts/${selectedProvince}`))
      .then((res) => {
        if (res.data.success) setDistricts(res.data.data || []);
      })
      .catch((err) => console.error(err));
  }, [selectedProvince]);

  // Fetch wards khi chọn district
  useEffect(() => {
    if (!selectedDistrict) {
      setWards([]);
      setSelectedWard("");
      return;
    }
    axios
      .get(buildApiUrl(`/api/address/wards/${selectedDistrict}`))
      .then((res) => {
        if (res.data.success) setWards(res.data.data || []);
      })
      .catch((err) => console.error(err));
  }, [selectedDistrict]);

  // ✅ Geocode địa chỉ khi user chọn xong từ dropdown
  useEffect(() => {
    let timeoutId;
    const geocodeAndSetCoordinates = async () => {
      // Chỉ geocode khi đã có đầy đủ thông tin
      if (
        !baseStreet ||
        !selectedProvince ||
        !selectedDistrict ||
        !selectedWard
      ) {
        return;
      }

      try {
        const token = localStorage.getItem("token");
        const provinceName =
          provinces.find(
            (p) => parseInt(p.ProvinceID) === parseInt(selectedProvince)
          )?.ProvinceName || "";
        const districtName =
          districts.find(
            (d) => parseInt(d.DistrictID) === parseInt(selectedDistrict)
          )?.DistrictName || "";
        const wardName =
          wards.find((w) => String(w.WardCode) === String(selectedWard))
            ?.WardName || "";

        console.log("🔍 Geocoding address...");
        const res = await axios.post(
          buildApiUrl("/api/orders/geocode"),
          {
            address: baseStreet,
            ward: wardName,
            district: districtName,
            province: provinceName,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (res.data.success && res.data.data && setUserCoordinates) {
          const { latitude, longitude } = res.data.data;
          setUserCoordinates({ lat: latitude, lng: longitude });
          console.log("✅ Geocoded coordinates:", {
            lat: latitude,
            lng: longitude,
          });
        } else {
          console.warn("⚠️ Không geocode được địa chỉ");
        }
      } catch (err) {
        console.error("❌ Lỗi geocode:", err);
      }
    };

    // Debounce để tránh gọi API quá nhiều
    timeoutId = setTimeout(geocodeAndSetCoordinates, 1000);
    return () => clearTimeout(timeoutId);
  }, [
    baseStreet,
    selectedProvince,
    selectedDistrict,
    selectedWard,
    provinces,
    districts,
    wards,
    setUserCoordinates,
  ]);

  // ✅ OPTIMIZED: Tính phí ship - chỉ call khi đã chọn đủ thông tin
  useEffect(() => {
    let timeoutId;
    const calculateShipping = async () => {
      // ✅ Kiểm tra đầy đủ thông tin trước khi call API
      if (
        !selectedCuaHangId ||
        !baseStreet?.trim() ||
        !selectedProvince ||
        !selectedDistrict ||
        !selectedWard ||
        !selectedItems?.length
      ) {
        // ✅ Reset shipping về 0 nếu chưa đủ thông tin
        setShippingFee(0);
        return;
      }

      setLoadingShipping(true);
      try {
        const token = localStorage.getItem("token");
        const res = await axios.post(
          buildApiUrl("/api/orders/shipping/calculate"),
          {
            cuaHangId: selectedCuaHangId,
            address: baseStreet,
            provinceId: selectedProvince,
            districtId: selectedDistrict,
            wardCode: selectedWard,
            items: selectedItems,
            userId: user.id || user.Id,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        if (res.data.success) {
          setShippingFee(res.data.shippingFee || 0);
        }
      } catch (err) {
        console.error("❌ Shipping calculation error:", err);
        // ✅ Không hiển thị error nếu chỉ là thiếu thông tin
        if (err.response?.status !== 400) {
          setError("Lỗi khi tính phí ship!");
        }
      } finally {
        setLoadingShipping(false);
      }
    };

    // ✅ OPTIMIZATION: Giảm timeout từ 500ms → 300ms
    timeoutId = setTimeout(calculateShipping, 300);
    return () => clearTimeout(timeoutId);
  }, [
    selectedCuaHangId,
    baseStreet,
    selectedProvince,
    selectedDistrict,
    selectedWard,
    selectedItems,
    // ✅ REMOVED: user.Id - không cần dependency này
  ]);

  return (
    <>
      {saveSuccess && <Alert variant="success">{saveSuccess}</Alert>}
      {userAddresses.length > 0 && (
        <Form.Group className="mb-3">
          <Form.Label>Địa chỉ đã lưu</Form.Label>
          <Form.Select
            value={selectedSavedAddressId || ""}
            onChange={(e) => handleSavedChange(e.target.value)}
          >
            <option value="">Chọn địa chỉ đã lưu</option>
            {userAddresses.map((addr) => (
              <option
                key={addr.DeliveryAddressId}
                value={addr.DeliveryAddressId}
              >
                {addr.Address}, {addr.Ward}, {addr.District}, {addr.Province}{" "}
                {addr.IsDefault ? "(Mặc định)" : ""}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
      )}

      <Form.Group className="mb-3">
        <Form.Label>Địa chỉ giao hàng</Form.Label>
        <Form.Control
          type="text"
          value={baseStreet}
          onChange={(e) => setBaseStreet(e.target.value)}
          placeholder="Số nhà, tên đường..."
          className="mb-2"
        />
        <div className="d-flex gap-2 mb-2">
          <Form.Select
            value={selectedProvince || ""}
            onChange={(e) => handleProvinceChange(e.target.value)}
          >
            <option value="">Chọn tỉnh/thành</option>
            {provinces.map((p) => (
              <option key={p.ProvinceID} value={p.ProvinceID}>
                {p.ProvinceName}
              </option>
            ))}
          </Form.Select>
          <Form.Select
            value={selectedDistrict || ""}
            onChange={(e) => handleDistrictChange(e.target.value)}
          >
            <option value="">Chọn quận/huyện</option>
            {districts.map((d) => (
              <option key={d.DistrictID} value={d.DistrictID}>
                {d.DistrictName}
              </option>
            ))}
          </Form.Select>
          <Form.Select
            value={selectedWard || ""}
            onChange={(e) => handleWardChange(e.target.value)}
          >
            <option value="">Chọn phường/xã</option>
            {wards.map((w) => (
              <option key={w.WardCode} value={w.WardCode}>
                {w.WardName}
              </option>
            ))}
          </Form.Select>
        </div>
        <Form.Control
          type="text"
          value={getFullAddress() || "Chưa chọn đầy đủ địa chỉ"}
          readOnly
          className="bg-light mb-2"
          style={{ cursor: "not-allowed" }}
        />
        <div className="d-flex justify-content-between align-items-center">
          <Form.Check
            type="checkbox"
            label="Lưu làm địa chỉ mặc định"
            checked={isDefaultAddress}
            onChange={(e) => setIsDefaultAddress(e.target.checked)}
          />
          <Button
            variant="outline-primary"
            onClick={saveAddress}
            disabled={
              savingAddress ||
              !baseStreet ||
              !selectedProvince ||
              !selectedDistrict ||
              !selectedWard
            }
          >
            {savingAddress ? (
              <Spinner as="span" animation="border" size="sm" />
            ) : (
              "Lưu địa chỉ"
            )}
          </Button>
        </div>
      </Form.Group>
    </>
  );
}
