import type { Response } from "express";
import type { IPAYLOAD } from "./tokenGenerator.util";
import type { TUSER } from "../../db/schemas";
import tokenGeneratorUtil from "./tokenGenerator.util";
import appConstant from "../../constants/app.constant";
export const payloadGenerator = ({ ...rest }: IPAYLOAD): IPAYLOAD => {
  return { ...rest };
};

export function setTokensAndCookies(user: TUSER, res: Response, setRefreshToken = false, setAccessToken = true) {
  const payLoad = payloadGenerator({
    uid: user.uid,
    isVerified: user.isVerified,
    OTP_TOKEN_VERSION: user.OTP_TOKEN_VERSION,
    role: user.role
  });
  let accessToken: string | undefined = undefined;
  if (setAccessToken) {
    accessToken = tokenGeneratorUtil.generateAccessToken(payLoad, res) as string;
    res.cookie("accessToken", accessToken, appConstant.COOKIEOPTIONS.ACESSTOKENCOOKIEOPTIONS);
  }

  let refreshToken: string | undefined = undefined;
  if (setRefreshToken) {
    // Generate and send refresh token only if setRefreshToken is true
    refreshToken = tokenGeneratorUtil.generateRefreshToken(payLoad, res) as string;
    res.cookie("refreshToken", refreshToken, appConstant.COOKIEOPTIONS.REFRESHTOKENCOOKIEOPTIONS);
  }

  return {
    accessToken: setAccessToken ? accessToken : undefined,
    refreshToken: setRefreshToken ? refreshToken : undefined,
    payLoad
  };
}
