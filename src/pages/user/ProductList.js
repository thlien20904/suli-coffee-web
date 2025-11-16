import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Row, Col, Card, Form, Button, Spinner } from "react-bootstrap";
import { FaSearch } from "react-icons/fa";
import { getImageUrl, getDefaultImage } from "../../utils/imageUtils";
import { API_BASE_URL, buildApiUrl } from "../../utils/apiConfig";
import "../../styles/pages/ProductList.css";

const PLACEHOLDER = "/placeholder.jpg";

const CATEGORIES = [
  { key: "all", label: "Tất cả" },
  { key: "coffee", label: "Cà phê" },
  { key: "milktea", label: "Trà sữa" },
  { key: "frappe", label: "Thức uống đá xay" },
  { key: "snack", label: "Bánh & Snack" },
  { key: "fruittea", label: "Trà trái cây" },
];

const fmtVND = (n) =>
  typeof n === "number"
    ? n.toLocaleString("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
      })
    : "";

const getVariantImage = (p) =>
  p.ImageURL ? getImageUrl(p.ImageURL) : getDefaultImage();

function ProductCardItem({ p }) {
  const navigate = useNavigate();
  const finalPrice = p.DiscountPrice ?? p.Price;
  return (
    <Card
      className="product-card"
      onClick={() => navigate(`/product/${p.FoodId}`)}
    >
      <div className="product-img-wrapper">
        <Card.Img
          variant="top"
          src={getVariantImage(p)}
          alt={p.FoodName}
          onError={(e) => {
            e.currentTarget.src = PLACEHOLDER;
          }}
        />
      </div>
      <Card.Body>
        <Card.Title>{p.FoodName}</Card.Title>
        <div className="price-section">
          <span className="price">{fmtVND(finalPrice)}</span>
          {p.Discount > 0 && finalPrice !== p.Price && (
            <span className="original-price">{fmtVND(p.Price)}</span>
          )}
        </div>
      </Card.Body>
    </Card>
  );
}

export default function ProductList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [filters, setFilters] = useState({
    keyword: searchParams.get("keyword") || "",
    category: searchParams.get("category") || "all",
    minPrice: searchParams.get("minPrice") || "",
    maxPrice: searchParams.get("maxPrice") || "",
  });

  const setQS = (patch) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([k, v]) => {
      if (!v) next.delete(k);
      else next.set(k, String(v));
    });
    setSearchParams(next);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.keyword) params.set("keyword", filters.keyword);
        if (filters.category && filters.category !== "all")
          params.set("category", filters.category);
        if (filters.minPrice) params.set("minPrice", filters.minPrice);
        if (filters.maxPrice) params.set("maxPrice", filters.maxPrice);
        params.set("limit", "100");

        const { data } = await axios.get(
          `${API_BASE_URL}/api/products?${params.toString()}`
        );
        setProducts(data.data.products || []);
      } catch (e) {
        console.error("FETCH PRODUCTS ERROR:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [filters]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setQS(filters);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const groupByCategory = (items) => {
    const grouped = {};
    items.forEach((p) => {
      const cat = p.CategoryName || "Khác";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(p);
    });
    return grouped;
  };

  const groupedProducts = groupByCategory(products);

  return (
    <div className="container py-4"   style={{ marginTop: "-60px", paddingBottom: "2rem" }}  >
      <div className="fixed-search-bar" >
        <Form onSubmit={handleSubmit} className="search-filter-form">
          <Row className="align-items-end">
            <Col md={5}>
              <Form.Label>Tên sản phẩm</Form.Label>
              <Form.Control
                type="text"
                placeholder="Nhập tên..."
                name="keyword"
                value={filters.keyword}
                onChange={handleChange}
              />
            </Col>
            <Col md={2}>
              <Form.Label>Giá từ</Form.Label>
              <Form.Control
                type="number"
                name="minPrice"
                placeholder="0"
                value={filters.minPrice}
                onChange={handleChange}
              />
            </Col>
            <Col md={2}>
              <Form.Label>Đến</Form.Label>
              <Form.Control
                type="number"
                name="maxPrice"
                placeholder="..."
                value={filters.maxPrice}
                onChange={handleChange}
              />
            </Col>
            <Col md={3}>
              <Button type="submit" variant="dark" className="w-100">
                <FaSearch /> Tìm kiếm
              </Button>
            </Col>
          </Row>
        </Form>
      </div>

      <Row className="product-layout" style={{ marginTop: "30px" }}>
        <Col lg={3} md={4} sm={12}>
          <aside className="filter-sidebar">
            <h5 className="category-title">Danh mục</h5>
            <ul className="category-list">
              {CATEGORIES.map((c) => (
                <li
                  key={c.key}
                  className={`category-item ${
                    filters.category === c.key ? "active" : ""
                  }`}
                  onClick={() => setFilters({ ...filters, category: c.key })}
                >
                  {c.label}
                </li>
              ))}
            </ul>
          </aside>
        </Col>

        <Col lg={9} md={8} sm={12}>
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" />
            </div>
          ) : (
            <>
              {filters.category === "all" ? (
                Object.entries(groupedProducts).map(([catName, items]) => (
                  <section key={catName} className="category-section mb-5">
                    <h2 className="section-title">{catName}</h2>
                    <Row xs={2} sm={3} md={3} lg={3} className="g-4">
                      {items.map((p) => (
                        <Col key={p.FoodId}>
                          <ProductCardItem p={p} />
                        </Col>
                      ))}
                    </Row>
                  </section>
                ))
              ) : (
                <div className="category-section">
                  <h2 className="section-title">
                    {CATEGORIES.find((c) => c.key === filters.category)
                      ?.label || "Danh mục"}
                  </h2>
                  <Row xs={2} sm={3} md={3} lg={3} className="g-4">
                    {products.map((p) => (
                      <Col key={p.FoodId}>
                        <ProductCardItem p={p} />
                      </Col>
                    ))}
                  </Row>
                </div>
              )}
            </>
          )}
        </Col>
      </Row>
    </div>
  );
}
