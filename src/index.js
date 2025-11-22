import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import store from "./redux/store";
import App from "./App";
import "bootstrap/dist/css/bootstrap.min.css";

// 🛡️ Global error handler để bỏ qua lỗi từ browser extensions
window.addEventListener("error", (event) => {
  // Bỏ qua lỗi từ browser extensions (onboarding.js, inpage.js)
  if (
    event.filename &&
    (event.filename.includes("onboarding.js") ||
      event.filename.includes("inpage.js") ||
      event.filename.includes("chrome-extension://"))
  ) {
    console.warn("🚫 Suppressed browser extension error:", event.message);
    event.preventDefault();
    return false;
  }
});

// 🛡️ Promise rejection handler để bỏ qua unhandled promise từ extensions
window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;

  // Bỏ qua lỗi MetaMask và các extension khác
  if (
    (reason && typeof reason === "string" && reason.includes("onboarding")) ||
    (reason &&
      reason.message &&
      (reason.message.includes("MetaMask") ||
        reason.message.includes("Failed to connect")))
  ) {
    console.warn(
      "🚫 Suppressed extension promise rejection:",
      reason.message || reason
    );
    event.preventDefault();
  }
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <Provider store={store}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </Provider>
);
