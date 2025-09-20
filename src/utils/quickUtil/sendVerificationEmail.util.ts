import emailResponsesConstant from "../../constants/emailResponses.constant";
import { gloabalMailMessage } from "../../services/globalEmail.service";
import logger from "../globalUtil/logger.util";

export const sendVerificationEmail = async (email: string, token: string) => {
  const verificationUrl = `${token}`;
  logger.info(verificationUrl);
  const emailContent = emailResponsesConstant.OTP_SENDER_MESSAGE(verificationUrl, "30");
  return await gloabalMailMessage(email, emailContent, "Please verify your account");
};
