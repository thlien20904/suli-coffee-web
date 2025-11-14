import { createSlice } from '@reduxjs/toolkit';

const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: [] },
  reducers: {
    setCart: (state, action) => {
      state.items = action.payload;
    },
    addToCart: (state, action) => {
      const { variantId, quantity } = action.payload;
      const existing = state.items.find((item) => item.variantId === variantId);
      if (existing) existing.quantity += quantity;
      else state.items.push({ variantId, quantity, name: '', price: 0, image: '', stock: 0 }); // Thêm các trường mặc định
    },
    updateQuantity: (state, action) => {
      const { cartItemId, quantity } = action.payload; // Sử dụng cartItemId
      const item = state.items.find((item) => item.variantId === cartItemId); // Khớp với variantId
      if (item) item.quantity = quantity;
    },
    removeFromCart: (state, action) => {
      const variantId = action.payload;
      state.items = state.items.filter((item) => item.variantId !== variantId); // Sử dụng variantId
    },
  },
});

export const { setCart, addToCart, updateQuantity, removeFromCart } = cartSlice.actions;
export default cartSlice.reducer;