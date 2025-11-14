// frontend/src/redux/userSlice.js
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  token: null,
  role: null,
  userId: null,
  username: null,
  email: null,
  avatar: null,
  cartCount: 0, // 🛒 số lượng sản phẩm trong giỏ
  unreadCount: 0, // 🔔 số thông báo chưa đọc
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    login: (state, action) => {
      console.log("Reducer login, payload:", action.payload);
      state.token = action.payload.token;
      state.role = action.payload.role;
      state.userId = action.payload.userId;
      state.username = action.payload.username;
      state.email = action.payload.email;
      state.avatar = action.payload.avatar;
    },
    logout: (state) => {
      console.log("Reducer logout");
      state.token = null;
      state.role = null;
      state.userId = null;
      state.username = null;
      state.email = null;
      state.avatar = null;
      state.cartCount = 0;
      state.unreadCount = 0;
    },
    updateUser: (state, action) => {
      console.log("Reducer updateUser, payload:", action.payload);
      // Merge payload into current state to avoid wiping other fields when only
      // a subset (e.g., avatar) is provided.
      Object.assign(state, action.payload);
    },
    setCartCount: (state, action) => {
      state.cartCount = action.payload;
    },
    setUnreadCount: (state, action) => {
      state.unreadCount = action.payload;
    },
  },
});

export const { login, logout, updateUser, setCartCount, setUnreadCount } =
  userSlice.actions;
export default userSlice.reducer;
