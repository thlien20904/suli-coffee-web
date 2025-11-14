import { useEffect, useState } from "react";
import axios from "axios";
import {
  GoogleMap,
  Marker,
  InfoWindow,
  useJsApiLoader,
} from "@react-google-maps/api";
import { getImageUrl } from "../../utils/imageUtils";
import "../../styles/pages/StoresUser.css";

const API_URL = "http://localhost:5000/api/stores";
const SEARCH_API_URL = "http://localhost:5000/api/stores/search";
const NEAREST_ALL_API_URL = "http://localhost:5000/api/stores/nearest-all";
// Use env var so billing-enabled API key isn't hard-coded in source.
// Set REACT_APP_GOOGLE_MAPS_API_KEY in your environment (.env) when running the frontend.
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "";

export default function StoresUser() {
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY || undefined,
  });

  // Hàm fetch dữ liệu từ backend
  const fetchStores = async (url = API_URL, params = {}) => {
    try {
      const res = await axios.get(url, { params });
      if (res.data.success)
        setStores(
          Array.isArray(res.data.data) ? res.data.data : [res.data.data]
        );
      else setError(res.data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Lấy vị trí người dùng và hiển thị cửa hàng gần → xa khi vào trang
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          setUserLocation(coords);
          fetchStores(NEAREST_ALL_API_URL, {
            lat: coords.lat,
            lng: coords.lng,
          });
        },
        () => {
          setError("Không thể lấy vị trí của bạn. Hiển thị tất cả cửa hàng.");
          fetchStores(); // fallback: lấy tất cả cửa hàng
        }
      );
    } else {
      fetchStores(); // fallback: lấy tất cả cửa hàng nếu trình duyệt không hỗ trợ
    }
  }, []);

  // Tìm kiếm cửa hàng
  const handleSearch = () => {
    const url = searchQuery.trim() ? SEARCH_API_URL : API_URL;
    fetchStores(url, searchQuery.trim() ? { query: searchQuery } : {});
  };

  // Tìm cửa hàng gần tôi nhất khi nhấn nút
  const handleFindNearest = () => {
    if (!userLocation) return setError("Vui lòng bật định vị.");
    fetchStores(NEAREST_ALL_API_URL, {
      lat: userLocation.lat,
      lng: userLocation.lng,
    });
  };

  if (loading)
    return <div className="stores-container">Đang tải cửa hàng...</div>;
  if (loadError)
    return (
      <div className="stores-container error-text">
        <p>Lỗi Google Maps: {loadError.message}</p>
        <p>
          Nguyên nhân thường gặp: API key chưa bật billing hoặc key không hợp
          lệ. Để sửa bạn có thể:
        </p>
        <ol>
          <li>
            Kiểm tra biến môi trường <code>REACT_APP_GOOGLE_MAPS_API_KEY</code>{" "}
            và thay API key hợp lệ.
          </li>
          <li>
            Bật Billing cho Google Cloud project chứa API key:
            https://console.cloud.google.com/
          </li>
          <li>
            Nếu không muốn hiển thị bản đồ, xóa biến môi trường hoặc liên hệ
            admin để thêm key hợp lệ.
          </li>
        </ol>
      </div>
    );
  if (error) return <div className="stores-container error-text">{error}</div>;

  const center = selectedStore
    ? { lat: selectedStore.lat, lng: selectedStore.lng }
    : userLocation || { lat: 10.762622, lng: 106.660172 };

  return (
    <div className="stores-container container">
      <h2 className="stores-header">Hệ thống cửa hàng</h2>

      {/* Search + nearest */}
      <div className="search-row d-flex mb-3">
        <input
          type="text"
          placeholder="Tìm kiếm theo tên hoặc địa chỉ..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSearch()}
          className="form-control me-2"
        />
        <button className="btn btn-primary me-2" onClick={handleSearch}>
          Tìm kiếm
        </button>
        <button className="btn btn-success" onClick={handleFindNearest}>
          Gần tôi nhất
        </button>
      </div>

      <div className="row">
        {/* Danh sách cửa hàng */}
        <div className="col-md-6 store-list">
          {stores.length ? (
            stores.map((store) => (
              <div
                key={store.CuaHangId}
                className="store-card"
                onClick={() =>
                  setSelectedStore({
                    id: store.CuaHangId,
                    lat: store.Latitude,
                    lng: store.Longitude,
                    name: store.CuaHangName,
                    address: store.Address,
                    phone: store.Phone,
                  })
                }
              >
                <img
                  src={getImageUrl(store.Image_URL)}
                  alt={store.CuaHangName}
                />
                <div className="store-info">
                  <h5>{store.CuaHangName}</h5>
                  <p>📍 {store.Address}</p>
                  <p>⏰ {store.Opening_Hours}</p>
                  <p>📞 {store.Phone}</p>
                  {store.distance && (
                    <p>📏 Cách bạn: {store.distance.toFixed(2)} km</p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p>Không có cửa hàng nào.</p>
          )}
        </div>

        {/* Google Map */}
        <div className="col-md-6 map-container">
          <GoogleMap
            mapContainerStyle={{ width: "100%", height: "100%" }}
            center={center}
            zoom={selectedStore ? 15 : 11}
          >
            {stores.map(
              (store) =>
                store.Latitude &&
                store.Longitude && (
                  <Marker
                    key={store.CuaHangId}
                    position={{ lat: store.Latitude, lng: store.Longitude }}
                    onClick={() =>
                      setSelectedStore({
                        id: store.CuaHangId,
                        lat: store.Latitude,
                        lng: store.Longitude,
                        name: store.CuaHangName,
                        address: store.Address,
                        phone: store.Phone,
                      })
                    }
                    icon={{
                      url:
                        selectedStore?.id === store.CuaHangId
                          ? "http://maps.google.com/mapfiles/ms/icons/pink-dot.png"
                          : "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
                    }}
                  />
                )
            )}
            {userLocation && (
              <Marker
                position={userLocation}
                icon={{
                  url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
                }}
                title="Vị trí của bạn"
              />
            )}
            {selectedStore && (
              <InfoWindow
                position={{ lat: selectedStore.lat, lng: selectedStore.lng }}
                onCloseClick={() => setSelectedStore(null)}
              >
                <div>
                  <h6>{selectedStore.name}</h6>
                  <p>{selectedStore.address}</p>
                  <p>📞 {selectedStore.phone}</p>
                  {selectedStore.distance && (
                    <p>📏 Cách bạn: {selectedStore.distance.toFixed(2)} km</p>
                  )}
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        </div>
      </div>
    </div>
  );
}
