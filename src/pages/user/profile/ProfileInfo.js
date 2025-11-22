import React, { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import axios from "axios";
import { buildApiUrl, API_BASE_URL } from "../../../utils/apiConfig";

// Import helper functions
import { getAvatarUrl, getDefaultImage } from "../../../utils/imageUtils";

export default function ProfileInfo() {
  const [userState, setUserState] = useState(null);
  const [avatar, setAvatar] = useState(getDefaultImage());
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    fullname: "",
    phone: "",
  });
  const [addressData, setAddressData] = useState({
    baseStreet: "",
    selectedProvince: "",
    selectedDistrict: "",
    selectedWard: "",
  });
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);
  const [errors, setErrors] = useState({});
  const [avatarFile, setAvatarFile] = useState(null);
  const [loadingAddress, setLoadingAddress] = useState(false); // Thêm loading để tránh race condition

  // =====================
  // Fetch profile khi mount
  // =====================
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Bạn cần đăng nhập lại!");

        const res = await axios.get(buildApiUrl("/api/profile"), {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.data.success) {
          const data = res.data.data;
          setUserState(data);
          setFormData({
            username: data.Username || "",
            email: data.Email || "",
            fullname: data.FullName || "",
            phone: data.Phone || "",
          });
          setAddressData({
            baseStreet: data.Address || "",
            selectedProvince: "",
            selectedDistrict: "",
            selectedWard: "",
          });
          setAvatar(getAvatarUrl(data.AvatarUrl));

          // Load provinces và set selections
          await loadProvincesAndSetSelections(data);
        } else {
          Swal.fire(
            "",
            res.data.message || "Không lấy được thông tin!",
            "error"
          );
        }
      } catch (err) {
        Swal.fire("", "Không thể kết nối server!", "error");
      }
    };

    fetchProfile();
  }, []);

  // Load provinces và chain set selections async
  const loadProvincesAndSetSelections = async (userData) => {
    try {
      setLoadingAddress(true);
      const provRes = await axios.get(buildApiUrl("/api/address/provinces"));
      if (provRes.data.success) {
        const provData = provRes.data.data || [];
        setProvinces(provData);

        // Tìm và set province
        if (userData.Province) {
          const provinceMatch = provData.find(
            (p) => p.ProvinceName === userData.Province
          );
          if (provinceMatch) {
            const provId = provinceMatch.ProvinceID;
            setAddressData((prev) => ({ ...prev, selectedProvince: provId }));

            // Chain fetch districts sau khi set province (sử dụng Promise để chờ state update không cần thiết vì useEffect sẽ trigger)
            // Nhưng để chắc chắn, await một chút và fetch districts ngay
            await new Promise((resolve) => setTimeout(resolve, 50)); // Small delay for state

            const distRes = await axios.get(
              buildApiUrl(`/api/address/districts/${provId}`)
            );
            if (distRes.data.success) {
              const distData = distRes.data.data || [];
              setDistricts(distData);

              // Tìm và set district
              if (userData.District) {
                const districtMatch = distData.find(
                  (d) => d.DistrictName === userData.District
                );
                if (districtMatch) {
                  const distId = districtMatch.DistrictID;
                  setAddressData((prev) => ({
                    ...prev,
                    selectedDistrict: distId,
                  }));

                  await new Promise((resolve) => setTimeout(resolve, 50));

                  // Chain fetch wards
                  const wardRes = await axios.get(
                    buildApiUrl(`/api/address/wards/${distId}`)
                  );
                  if (wardRes.data.success) {
                    const wardData = wardRes.data.data || [];
                    setWards(wardData);

                    // Tìm và set ward
                    if (userData.Ward) {
                      const wardMatch = wardData.find(
                        (w) => w.WardName === userData.Ward
                      );
                      if (wardMatch) {
                        const wardCode = wardMatch.WardCode;
                        setAddressData((prev) => ({
                          ...prev,
                          selectedWard: wardCode,
                        }));
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    } catch (err) {
    } finally {
      setLoadingAddress(false);
    }
  };

  // Get full address string
  const getFullAddress = useCallback(() => {
    const provinceName =
      provinces.find(
        (p) => parseInt(p.ProvinceID) === parseInt(addressData.selectedProvince)
      )?.ProvinceName || "";
    const districtName =
      districts.find(
        (d) => parseInt(d.DistrictID) === parseInt(addressData.selectedDistrict)
      )?.DistrictName || "";
    const wardName =
      wards.find((w) => String(w.WardCode) === String(addressData.selectedWard))
        ?.WardName || "";
    const fullAddr = [
      addressData.baseStreet,
      wardName,
      districtName,
      provinceName,
    ]
      .filter(Boolean)
      .join(", ");
    return fullAddr;
  }, [
    addressData.baseStreet,
    addressData.selectedProvince,
    addressData.selectedDistrict,
    addressData.selectedWard,
    provinces,
    districts,
    wards,
  ]);

  // =====================
  // Validate input
  // =====================
  const validateField = (name, value) => {
    switch (name) {
      case "username":
        return !value.trim() || !/^[a-zA-Z0-9_.-]{3,30}$/.test(value.trim())
          ? "Username phải 3–30 ký tự, chỉ a-z, A-Z, 0-9, _ . -"
          : null;
      case "email":
        return !value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
          ? "Email không đúng định dạng."
          : null;
      case "fullname":
        return !value.trim() || value.length < 3
          ? "Tên quá ngắn (≥3 ký tự)"
          : null;
      case "phone":
        return !/^(0[3|5|7|8|9])[0-9]{8,9}$/.test(value)
          ? "Số điện thoại không hợp lệ"
          : null;
      case "baseStreet":
        return !value.trim() || value.length < 5
          ? "Địa chỉ chi tiết quá ngắn"
          : null;
      case "selectedProvince":
      case "selectedDistrict":
      case "selectedWard":
        return !value ? "Vui lòng chọn đầy đủ địa chỉ" : null;
      default:
        return null;
    }
  };

  const validateForm = () => {
    const newErrors = {};
    ["username", "email", "fullname", "phone"].forEach((f) => {
      const err = validateField(f, formData[f]);
      if (err) newErrors[f] = err;
    });
    // Validate address fields
    const addrFields = [
      "baseStreet",
      "selectedProvince",
      "selectedDistrict",
      "selectedWard",
    ];
    addrFields.forEach((f) => {
      const err = validateField(f, addressData[f]);
      if (err) newErrors[f] = err;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith("address.")) {
      const addrKey = name.replace("address.", "");
      setAddressData({ ...addressData, [addrKey]: value });
      setErrors((prev) => ({
        ...prev,
        [addrKey]: validateField(addrKey, value),
      }));
    } else {
      setFormData({ ...formData, [name]: value });
      setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
    }
  };

  const handleProvinceChange = (value) => {
    setAddressData((prev) => ({
      ...prev,
      selectedProvince: value ? parseInt(value) : "",
      selectedDistrict: "",
      selectedWard: "",
    })); // Reset districts/wards
  };

  const handleDistrictChange = (value) => {
    setAddressData((prev) => ({
      ...prev,
      selectedDistrict: value ? parseInt(value) : "",
      selectedWard: "",
    })); // Reset wards
  };

  const handleWardChange = (value) => {
    setAddressData((prev) => ({
      ...prev,
      selectedWard: value ? String(value) : "",
    }));
  };

  // Fetch districts khi chọn province
  useEffect(() => {
    if (!addressData.selectedProvince) {
      setDistricts([]);
      setAddressData((prev) => ({
        ...prev,
        selectedDistrict: "",
        selectedWard: "",
      }));
      return;
    }
    axios
      .get(
        buildApiUrl(`/api/address/districts/${addressData.selectedProvince}`)
      )
      .then((res) => {
        if (res.data.success) {
          setDistricts(res.data.data || []);
        }
      })
      .catch((err) => {});
  }, [addressData.selectedProvince]);

  // Fetch wards khi chọn district
  useEffect(() => {
    if (!addressData.selectedDistrict) {
      setWards([]);
      setAddressData((prev) => ({ ...prev, selectedWard: "" }));
      return;
    }
    axios
      .get(buildApiUrl(`/api/address/wards/${addressData.selectedDistrict}`))
      .then((res) => {
        if (res.data.success) {
          setWards(res.data.data || []);
        }
      })
      .catch((err) => {});
  }, [addressData.selectedDistrict]);

  // =====================
  // Avatar change
  // =====================
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatar(URL.createObjectURL(file));
      setAvatarFile(file);
    }
  };

  // =====================
  // Submit form
  // =====================
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      Swal.fire("", "Vui lòng kiểm tra lại các trường nhập!", "error");
      return;
    }

    // Get names for DB
    const selProv = parseInt(addressData.selectedProvince);
    const selDist = parseInt(addressData.selectedDistrict);
    const selWard = String(addressData.selectedWard);
    const provinceName =
      provinces.find((p) => p.ProvinceID === selProv)?.ProvinceName || "";
    const districtName =
      districts.find((d) => d.DistrictID === selDist)?.DistrictName || "";
    const wardName =
      wards.find((w) => String(w.WardCode) === selWard)?.WardName || "";

    if (!provinceName || !districtName || !wardName) {
      Swal.fire(
        "",
        "Vui lòng chọn đầy đủ tỉnh/thành, quận/huyện, phường/xã!",
        "error"
      );
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Bạn cần đăng nhập lại!");

      const fd = new FormData();
      fd.append("id", userState.Id);
      fd.append("Username", formData.username);
      fd.append("Email", formData.email);
      fd.append("FullName", formData.fullname);
      fd.append("Phone", formData.phone);
      fd.append("Address", addressData.baseStreet);
      fd.append("Province", provinceName);
      fd.append("District", districtName);
      fd.append("Ward", wardName);
      if (avatarFile) fd.append("AvatarFile", avatarFile);

      const res = await axios.post(buildApiUrl("/api/profile/update"), fd, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        Swal.fire({
          icon: "success",
          title: "Cập nhật thành công!",
          showConfirmButton: true,
          timer: 1000,
        });

        if (res.data.data?.avatarUrl)
          setAvatar(getAvatarUrl(res.data.data.avatarUrl));
        setAvatarFile(null);

        // Cập nhật userState local luôn
        const updatedUser = {
          ...userState,
          Username: formData.username,
          Email: formData.email,
          FullName: formData.fullname,
          Phone: formData.phone,
          Address: addressData.baseStreet,
          Province: provinceName,
          District: districtName,
          Ward: wardName,
          AvatarUrl: res.data.data.avatarUrl || userState.AvatarUrl,
        };
        setUserState(updatedUser);

        // Reload selections để match với dữ liệu mới (nếu cần)
        await loadProvincesAndSetSelections(updatedUser);
      } else {
        // Xử lý lỗi từ backend (validate hoặc trùng)
        if (res.data.errors) {
          // Nếu backend trả errors object, map vào setErrors (giả sử backend trả {field: msg})
          setErrors(res.data.errors);
          Swal.fire("", res.data.message || "Cập nhật thất bại", "error");
        } else {
          Swal.fire("", res.data.message || "Cập nhật thất bại", "error");
        }
      }
    } catch (err) {
      if (err.response?.status === 409 || err.response?.status === 400) {
        // Xử lý lỗi cụ thể từ backend (trùng hoặc validate)
        const backendErrors = err.response.data.errors || {};
        setErrors(backendErrors);
        Swal.fire("", err.response.data.message || "Lỗi cập nhật", "error");
      } else {
        Swal.fire("", "Không thể kết nối server!", "error");
      }
    }
  };

  // =====================
  // Cancel form
  // =====================
  const handleCancel = () => {
    if (!userState) return;
    setFormData({
      username: userState.Username || "",
      email: userState.Email || "",
      fullname: userState.FullName || "",
      phone: userState.Phone || "",
    });
    setAddressData({
      baseStreet: userState.Address || "",
      selectedProvince: "",
      selectedDistrict: "",
      selectedWard: "",
    });
    setAvatar(getAvatarUrl(userState.AvatarUrl));
    setAvatarFile(null);
    setErrors({});
    // Reload selections from userState
    loadProvincesAndSetSelections(userState);
  };

  if (!userState) return <p>Đang tải thông tin người dùng...</p>;

  return (
    <form onSubmit={handleSubmit} className="p-4">
      {/* Avatar */}
      <div className="mb-3">
        <label>Avatar</label>
        <input
          type="file"
          accept=".jpg,.jpeg,.png,.gif,.webp"
          onChange={handleAvatarChange}
          className="form-control"
        />
        <img src={avatar} alt="Preview" width="120" className="mt-2 rounded" />
      </div>

      {/* Username */}
      <div className="mb-3">
        <label>Username</label>
        <input
          type="text"
          className="form-control"
          name="username"
          value={formData.username}
          onChange={handleChange}
        />
        {errors.username && <small className="text-danger">{errors.username}</small>}
      </div>

      {/* Email */}
      <div className="mb-3">
        <label>Email</label>
        <input
          type="email"
          className="form-control"
          name="email"
          value={formData.email}
          onChange={handleChange}
        />
        {errors.email && <small className="text-danger">{errors.email}</small>}
      </div>

      {/* Fullname & Phone */}
      {["fullname", "phone"].map((f) => (
        <div className="mb-3" key={f}>
          <label>{f === "fullname" ? "Họ tên" : "Số điện thoại"}</label>
          <input
            type="text"
            className="form-control"
            name={f}
            value={formData[f]}
            onChange={handleChange}
          />
          {errors[f] && <small className="text-danger">{errors[f]}</small>}
        </div>
      ))}

      {/* Address Section */}
      <div className="mb-3">
        <label>Địa chỉ giao hàng</label>
        {loadingAddress && (
          <small className="text-info">Đang tải địa chỉ...</small>
        )}
        <input
          type="text"
          className="form-control mb-2"
          name="address.baseStreet"
          value={addressData.baseStreet}
          onChange={handleChange}
          placeholder="Số nhà, tên đường..."
        />
        {errors.baseStreet && (
          <small className="text-danger">{errors.baseStreet}</small>
        )}
        <div className="d-flex gap-2 mb-2">
          <select
            className="form-control"
            value={addressData.selectedProvince || ""}
            onChange={(e) => handleProvinceChange(e.target.value)}
            name="address.selectedProvince"
            disabled={loadingAddress}
          >
            <option value="">Chọn tỉnh/thành</option>
            {provinces.map((p) => (
              <option key={p.ProvinceID} value={p.ProvinceID}>
                {p.ProvinceName}
              </option>
            ))}
          </select>
          <select
            className="form-control"
            value={addressData.selectedDistrict || ""}
            onChange={(e) => handleDistrictChange(e.target.value)}
            name="address.selectedDistrict"
            disabled={loadingAddress || !addressData.selectedProvince}
          >
            <option value="">Chọn quận/huyện</option>
            {districts.map((d) => (
              <option key={d.DistrictID} value={d.DistrictID}>
                {d.DistrictName}
              </option>
            ))}
          </select>
          <select
            className="form-control"
            value={addressData.selectedWard || ""}
            onChange={(e) => handleWardChange(e.target.value)}
            name="address.selectedWard"
            disabled={loadingAddress || !addressData.selectedDistrict}
          >
            <option value="">Chọn phường/xã</option>
            {wards.map((w) => (
              <option key={w.WardCode} value={w.WardCode}>
                {w.WardName}
              </option>
            ))}
          </select>
        </div>
        {(errors.selectedProvince ||
          errors.selectedDistrict ||
          errors.selectedWard) && (
          <small className="text-danger">
            {errors.selectedProvince ||
              errors.selectedDistrict ||
              errors.selectedWard}
          </small>
        )}
        <input
          type="text"
          className="form-control bg-light mb-2"
          value={getFullAddress() || "Chưa chọn đầy đủ địa chỉ"}
          readOnly
          style={{ cursor: "not-allowed" }}
        />
      </div>

      <div className="d-flex gap-2">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loadingAddress}
        >
          Cập nhật
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleCancel}
          disabled={loadingAddress}
        >
          Hủy
        </button>
      </div>
    </form>
  );
}