import { generateOtp } from "../quickUtil/slugStringGenerator.util";
export function generateVerificationOtpToken(length: number = 6, expiryValue: number = 30, expiryUnit: "s" | "m" | "h" | "d" = "m") {
  const { otpExpiry, otp } = generateOtp(length, expiryValue, expiryUnit);
  return { otpExpiry, OTP_TOKEN: otp };
}
