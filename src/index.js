import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import store from "./redux/store";
import App from "./App";
import "bootstrap/dist/css/bootstrap.min.css";

// 🛡️ Global error handler để bỏ qua lỗi từ browser extensions
window.addEventListener("error", (event) => {
  // Bỏ qua lỗi từ browser extensions như onboarding.js
  if (event.filename && event.filename.includes("onboarding.js")) {
    console.warn("🚫 Suppressed browser extension error:", event.error);
    event.preventDefault();
    return false;
  }
});

// 🛡️ Promise rejection handler để bỏ qua unhandled promise từ extensions
window.addEventListener("unhandledrejection", (event) => {
  if (
    event.reason &&
    typeof event.reason === "string" &&
    event.reason.includes("onboarding")
  ) {
    console.warn("🚫 Suppressed extension promise rejection:", event.reason);
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
