import crypto from "node:crypto";

export function generateRandomStrings(length: number): string {
  const characters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const charactersLength = characters.length;

  const randomBytes = crypto.randomBytes(length);

  let randomString = "";

  for (let i = 0; i < length; i++) {
    const randomByte = randomBytes[i] ?? 0;
    const randomIndex = randomByte % charactersLength;
    randomString += characters.charAt(randomIndex);
  }

  return randomString;
}

export function generateSlug(slugString: string) {
  let slug = slugString.toLowerCase();
  slug = slug.replace(/[^a-z0-9\s-]/g, "");
  slug = slug.trim().replace(/\s+/g, "-");
  return slug;
}

export function generateOtp(length = 6, expiryValue = 30, expiryUnit: "s" | "m" | "h" | "d" = "m"): { otp: string; otpExpiry: Date } {
  let otp = Array.from({ length }, () => crypto.randomInt(0, 10)).join("");
  otp = otp.padStart(length, "0");
  let expiryMilliseconds = expiryValue * 60 * 1000;
  if (expiryUnit === "h") expiryMilliseconds = expiryValue * 60 * 60 * 1000;
  if (expiryUnit === "s") expiryMilliseconds = expiryValue * 1000;
  if (expiryUnit === "d") expiryMilliseconds = expiryValue * 24 * 60 * 60 * 1000;

  const otpExpiry = new Date(Date.now() + expiryMilliseconds);

  return { otp, otpExpiry };
}

export function defineExpireyTime(expiryValue = 30, expiryUnit: "s" | "m" | "h" | "d" = "m"): Date {
  let expiryMilliseconds = expiryValue * 60 * 1000;
  if (expiryUnit === "h") expiryMilliseconds = expiryValue * 60 * 60 * 1000;
  if (expiryUnit === "s") expiryMilliseconds = expiryValue * 1000;
  if (expiryUnit === "d") expiryMilliseconds = expiryValue * 24 * 60 * 60 * 1000;

  return new Date(Date.now() + expiryMilliseconds);
}

export function generateUsername(fullName: string): string {
  if (!fullName) {
    throw new Error("Full name is required to generate a username.");
  }

  return fullName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_");
}

export function lowerCase(text: string): string {
  return text.toLowerCase();
}

export function cleanFileName(path: string) {
  const lastDotIndex = path.lastIndexOf(".");
  const filename = lastDotIndex >= 0 ? path.substring(0, lastDotIndex) : path;
  const extension = lastDotIndex >= 0 ? path.substring(lastDotIndex) : "";

  const cleaned = filename
    .replace(/\.([a-zA-Z])/g, (_, letter: string) => letter.toUpperCase()) // camelCase
    .replace(/[^a-zA-Z0-9]+/g, ""); // Remove all non-alphanumeric chars

  return cleaned + extension;
}
