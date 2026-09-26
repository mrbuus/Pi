import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** shadcn/ui-ийн `cn`: нөхцөлт анги + Tailwind зөрчлийг сүүлийнхээр нь шийднэ. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
