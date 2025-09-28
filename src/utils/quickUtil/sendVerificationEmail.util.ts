import { delay } from "bullmq";
import emailResponsesConstant from "../../constants/emailResponses.constant";
import logger from "../globalUtil/logger.util";

export const sendVerificationEmail = async (email: string, token: string) => {
  const verificationUrl = `${token}`;
  logger.info(verificationUrl);
  const emailContent = emailResponsesConstant.OTP_SENDER_MESSAGE(verificationUrl, "30");
  await delay(22);
  return emailContent + email;
};
