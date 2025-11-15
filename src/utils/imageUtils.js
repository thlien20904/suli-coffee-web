// Helper function để xử lý URL ảnh từ database
import { API_BASE_URL } from "./apiConfig";

export const getImageUrl = (imageUrl) => {
  if (!imageUrl) {
    const defaultUrl =
      "https://vhkvfmbmmsolqiwrjlxp.supabase.co/storage/v1/object/public/images/no-image.png";
    return defaultUrl;
  }

  // Fix for corrupted URLs containing localhost + supabase
  if (imageUrl.includes("localhost:5000https://")) {
    const cleanUrl = imageUrl.replace(API_BASE_URL, "");
    console.warn("🔧 Fixing corrupted URL:", imageUrl, "->", cleanUrl);
    return cleanUrl;
  }

  // Nếu URL đã là absolute (bắt đầu với http/https), trả về trực tiếp
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }

  // Nếu URL là relative path, chuyển sang Supabase
  if (imageUrl.startsWith("/")) {
    const supabaseUrl = `https://vhkvfmbmmsolqiwrjlxp.supabase.co/storage/v1/object/public/images${imageUrl}`;
    console.warn(
      "⚠️ Converting relative path to Supabase:",
      imageUrl,
      "->",
      supabaseUrl
    );
    return supabaseUrl;
  }

  // Fallback: thêm Supabase base URL
  const fallbackUrl = `https://vhkvfmbmmsolqiwrjlxp.supabase.co/storage/v1/object/public/images/${imageUrl}`;
  console.warn("⚠️ Using Supabase fallback for:", imageUrl, "->", fallbackUrl);
  return fallbackUrl;
};

// Default image cho trường hợp lỗi
export const getDefaultImage = () => {
  return "https://vhkvfmbmmsolqiwrjlxp.supabase.co/storage/v1/object/public/images/no-image.png";
};

// Helper function để xử lý avatar URL
export const getAvatarUrl = (avatarUrl) => {
  if (!avatarUrl) {
    const defaultAvatar =
      "https://vhkvfmbmmsolqiwrjlxp.supabase.co/storage/v1/object/public/images/Avatar/default-avatar.png";
    return defaultAvatar;
  }

  // Fix for corrupted URLs containing localhost + supabase
  if (avatarUrl.includes("localhost:5000https://")) {
    const cleanUrl = avatarUrl.replace(API_BASE_URL, "");
    console.warn(
      "👤🔧 Fixing corrupted avatar URL:",
      avatarUrl,
      "->",
      cleanUrl
    );
    return cleanUrl;
  }

  // Nếu đã là Supabase URL full, return luôn
  if (avatarUrl.startsWith("http://") || avatarUrl.startsWith("https://")) {
    return avatarUrl;
  }

  // Nếu relative path bắt đầu /Avatar/, chuyển sang Supabase
  if (avatarUrl.startsWith("/Avatar/") || avatarUrl.startsWith("Avatar/")) {
    const cleanPath = avatarUrl.startsWith("/")
      ? avatarUrl.slice(1)
      : avatarUrl;
    const supabaseUrl = `https://vhkvfmbmmsolqiwrjlxp.supabase.co/storage/v1/object/public/images/${cleanPath}`;
    console.warn(
      "👤⚠️ Converting avatar path to Supabase:",
      avatarUrl,
      "->",
      supabaseUrl
    );
    return supabaseUrl;
  }

  // Fallback: assume it's just filename, add Avatar/ prefix
  const fallbackUrl = `https://vhkvfmbmmsolqiwrjlxp.supabase.co/storage/v1/object/public/images/Avatar/${avatarUrl}`;
  console.warn(
    "👤⚠️ Avatar fallback for filename:",
    avatarUrl,
    "->",
    fallbackUrl
  );
  return fallbackUrl;
};
