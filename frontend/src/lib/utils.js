import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Default placeholder image for players without profile photos
export const DEFAULT_PROFILE_IMAGE = "/images/default-avatar.svg";

// Backend URL for constructing full image paths
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";

/**
 * Returns the profile image URL or a default placeholder
 * @param {string|null|undefined} imageUrl - The profile image URL
 * @returns {string} Valid image URL or default placeholder
 */
export function getProfileImageUrl(imageUrl) {
  if (!imageUrl || imageUrl.trim() === "") {
    return DEFAULT_PROFILE_IMAGE;
  }

  // If it's a relative path for uploaded files, prepend backend URL
  if (imageUrl.startsWith('/uploads/')) {
    return `${BACKEND_URL}${imageUrl}`;
  }

  return imageUrl;
}
