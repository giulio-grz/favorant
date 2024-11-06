import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const formatRating = (rating) => {
  return rating === 10 ? "10" : rating.toFixed(1);
};