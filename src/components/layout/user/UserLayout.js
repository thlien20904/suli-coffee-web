import React, { useEffect } from "react";
import { Outlet } from "react-router-dom";
import UserNavbar from "./Navbar"; // 👈 đổi tên import
import Footer from "./Footer";

const UserLayout = () => {
  useEffect(() => {
    // compute header height and set CSS variable and content padding accordingly
    const applyHeaderHeight = () => {
      const header = document.querySelector(".header");
      const main = document.querySelector(".user-layout main");
      if (header && main) {
        const h = header.offsetHeight;
        // set CSS variable for other styles if needed
        document.documentElement.style.setProperty("--header-height", `${h}px`);
        // Set padding-top cho main để không bị header che
        main.style.paddingTop = `${h + 20}px`; // +20px cho khoảng cách đẹp
      }
    };

    applyHeaderHeight();
    window.addEventListener("resize", applyHeaderHeight);
    // in case fonts/images change size after load
    window.addEventListener("load", applyHeaderHeight);
    return () => {
      window.removeEventListener("resize", applyHeaderHeight);
      window.removeEventListener("load", applyHeaderHeight);
    };
  }, []);

  return (
    <div className="user-layout">
      <UserNavbar />
      <main>
        <Outlet /> {/* ✅ render các route con như Home, Products,... */}
      </main>
      <Footer />
    </div>
  );
};

export default UserLayout;
