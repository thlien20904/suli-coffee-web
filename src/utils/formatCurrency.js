// utils/formatCurrency.js - Utility để format tiền tệ nhất quán
export const formatCurrency = (amount, options = {}) => {
  const { currency = "₫", locale = "vi-VN", roundToInteger = true } = options;

  // Convert to number and handle null/undefined
  const numericAmount = parseFloat(amount) || 0;

  // Round to integer if specified (mặc định là true)
  const finalAmount = roundToInteger
    ? Math.round(numericAmount)
    : numericAmount;

  // Format with locale
  const formatted = finalAmount.toLocaleString(locale);

  return `${formatted} ${currency}`;
};

// Shorthand functions
export const formatVND = (amount) => formatCurrency(amount);

export const formatVNDDecimal = (amount) =>
  formatCurrency(amount, { roundToInteger: false });

// Usage examples:
// formatVND(68000) → "68.000 ₫"
// formatVND(68000.123) → "68.000 ₫" (rounded)
// formatVNDDecimal(68000.123) → "68.000,123 ₫" (with decimal)
