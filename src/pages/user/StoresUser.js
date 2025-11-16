import { useEffect, useState } from "react";
import axios from "axios";
import {
  GoogleMap,
  Marker,
  InfoWindow,
  useJsApiLoader,
} from "@react-google-maps/api";
import { getImageUrl, getDefaultImage } from "../../utils/imageUtils";
import { buildApiUrl } from "../../utils/apiConfig";
import "../../styles/pages/StoresUser.css";

// 🔹 Dùng buildApiUrl → Auto localhost:5000 (local) hoặc Render (prod via env)
const API_URL = buildApiUrl("/api/stores");
const SEARCH_API_URL = buildApiUrl("/api/stores/search");
const NEAREST_ALL_API_URL = buildApiUrl("/api/stores/nearest-all");

const PLACEHOLDER = "/placeholder.jpg";

const getVariantImage = (store) =>
  store.Image_URL ? getImageUrl(store.Image_URL) : getDefaultImage();

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
      console.log('🔍 Fetching from:', url, 'with params:', params); // 🔹 THÊM LOG URL gọi
      const res = await axios.get(url, { params });
      if (res.data.success) {
        const data = Array.isArray(res.data.data) ? res.data.data : [res.data.data];
        console.log('✅ FETCHED STORES:', data.length, 'items'); // 🔹 THÊM LOG thành công
        setStores(data);
      } else {
        console.warn('⚠️ Backend response not success:', res.data.message);
        setError(res.data.message);
      }
    } catch (err) {
      console.error('❌ FETCH STORES ERROR:', err.response?.status, err.message); // 🔹 FIX LOG: Status + message
      setError(`Lỗi kết nối: ${err.message} (Status: ${err.response?.status || 'Unknown'})`);
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
          console.log('📍 User location:', coords); // 🔹 THÊM LOG vị trí
          setUserLocation(coords);
          fetchStores(NEAREST_ALL_API_URL, {
            lat: coords.lat,
            lng: coords.lng,
          });
        },
        (err) => {
          console.error('❌ Geolocation error:', err);
          setError("Không thể lấy vị trí của bạn. Hiển thị tất cả cửa hàng.");
          fetchStores();
        }
      );
    } else {
      fetchStores();
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
        <p>Kiểm tra API key trong .env.local và bật billing.</p>
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
            stores.map((store, index) => {
              const storeName = store.CuaHangName || `Cửa hàng ${index + 1}`;
              return (
                <div
                  key={store.CuaHangId || index}
                  className="store-card"
                  onClick={() =>
                    setSelectedStore({
                      id: store.CuaHangId,
                      lat: store.Latitude,
                      lng: store.Longitude,
                      name: storeName,
                      address: store.Address || "Không có địa chỉ",
                      phone: store.Phone || "Không có số",
                    })
                  }
                >
                  <img
                    src={getVariantImage(store)}
                    alt={storeName}
                    onError={(e) => { e.currentTarget.src = PLACEHOLDER; }}
                  />
                  <div className="store-info">
                    <h5>{storeName}</h5>
                    <p>📍 {store.Address || "Không có địa chỉ"}</p>
                    <p>⏰ {store.Opening_Hours || "Không có giờ"}</p>
                    <p>📞 {store.Phone || "Không có số"}</p>
                    {store.distance && (
                      <p>📏 Cách bạn: {store.distance.toFixed(2)} km</p>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <p>Không có cửa hàng nào.</p>
          )}
        </div>
        {/* Google Map */}
        <div className="col-md-6 map-container">
          {!isLoaded ? (
            <div>Loading map...</div>
          ) : (
            <GoogleMap
              mapContainerStyle={{ width: "100%", height: "100%" }}
              center={center}
              zoom={selectedStore ? 15 : 11}
            >
              {stores.map((store, index) =>
                store.Latitude && store.Longitude ? (
                  <Marker
                    key={store.CuaHangId || index}
                    position={{ lat: store.Latitude, lng: store.Longitude }}
                    onClick={() =>
                      setSelectedStore({
                        id: store.CuaHangId,
                        lat: store.Latitude,
                        lng: store.Longitude,
                        name: store.CuaHangName || `Cửa hàng ${index + 1}`,
                        address: store.Address || "",
                        phone: store.Phone || "",
                      })
                    }
                    icon={{
                      url: selectedStore?.id === store.CuaHangId
                        ? "http://maps.google.com/mapfiles/ms/icons/pink-dot.png"
                        : "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
                    }}
                  />
                ) : null
              )}
              {userLocation && (
                <Marker
                  position={userLocation}
                  icon={{ url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png" }}
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
                    {selectedStore.distance && <p>📏 Cách bạn: {selectedStore.distance.toFixed(2)} km</p>}
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          )}
        </div>
      </div>
    </div>
  );
}