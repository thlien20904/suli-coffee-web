// frontend/src/pages/user/profile/Help.js
import React from "react";

export default function Help() {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h5 style={styles.title}>❓ Trợ giúp & Liên hệ</h5>
        <p style={styles.text}>
          <strong>Email:</strong> hi@sulicoffee.vn
        </p>
        <p style={styles.text}>
          <strong>Hotline:</strong> 0987 654 321
        </p>
        <p style={styles.text}>
          <strong>Thời gian:</strong> 9:00 - 21:00 (T2 - CN)
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    justifyContent: "center", // canh ngang giữa
    alignItems: "center", // canh dọc giữa
    height: "80vh", // chiều cao chiếm 80% view
    backgroundColor: "#f7f7f7",
    padding: "20px",
  },
  card: {
    backgroundColor: "#fff",
    padding: "30px 40px",
    borderRadius: "12px",
    boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
    textAlign: "center",
    minWidth: "300px",
    maxWidth: "400px",
  },
  title: {
    marginBottom: "20px",
    fontSize: "1.5rem",
    color: "#333",
  },
  text: {
    margin: "8px 0",
    fontSize: "1rem",
    color: "#555",
  },
};
