import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Default placeholder image for players without profile photos
export const DEFAULT_PROFILE_IMAGE = "/images/default-avatar.svg";

/**
 * Returns the profile image URL or a default placeholder
 * @param {string|null|undefined} imageUrl - The profile image URL
 * @returns {string} Valid image URL or default placeholder
 */
export function getProfileImageUrl(imageUrl) {
  if (!imageUrl || imageUrl.trim() === "") {
    return DEFAULT_PROFILE_IMAGE;
  }
  return imageUrl;
}
