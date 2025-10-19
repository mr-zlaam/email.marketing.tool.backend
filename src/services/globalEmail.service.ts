import nodemailer from "nodemailer";
import fs from "node:fs";
import path from "node:path";
import reshttp from "reshttp";
import envConfig from "../config/env.config";
import appConstant from "../constants/app.constant";
import { replaceAllPlaceholders } from "../utils/quickUtil/replaceAllPlaceholders.util";
import { generateRandomStrings } from "../utils/quickUtil/slugStringGenerator.util";
import logger from "../utils/globalUtil/logger.util";
import { throwError } from "../utils/globalUtil/throwError.util";
import type { IEMAILTEMPLATE, TMAILDATATOSEND } from "../types/types";
const year = new Date().getFullYear();
const transporter = nodemailer.createTransport({
  host: "smtp.resend.com",
  port: 465,
  secure: true,

  auth: {
    user: "resend",
    pass: envConfig.RESEND_API_KEY
  }
});
// const defaultGreeting = "Hi";
export async function gloabalMailMessage({ to, composedEmail, subject }: TMAILDATATOSEND) {
  const templatePath = path.resolve(__dirname, "../../templates/globalEmail.template.html");
  let htmlTemplate = fs.readFileSync(templatePath, "utf8");
  const placeholders: IEMAILTEMPLATE = {
    companyname: appConstant.COMPANY_NAME,
    message: composedEmail || "",
    year: year.toString(),
    senderGreets: ""
  };
  htmlTemplate = replaceAllPlaceholders(htmlTemplate, placeholders as unknown as Record<string, string>);
  const randomStr = generateRandomStrings(10);
  const mailOptions = {
    from: envConfig.HOST_EMAIL,
    to: to,
    subject: subject ?? appConstant.COMPANY_NAME,
    html: htmlTemplate,
    headers: {
      "X-Auto-Response-Suppress": "All",
      Precedence: "bulk",
      "Auto-Submitted": "auto-generated",
      "Message-ID": `<${randomStr}.online>`
    }
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email message sent successfully: ${info.response}`);
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Error Email message sending :${error.message}`);
      throwError(reshttp.internalServerErrorCode, reshttp.internalServerErrorMessage);
    }
    logger.error(`Error sending Email  message:${error as string}`);
    throwError(reshttp.internalServerErrorCode, reshttp.internalServerErrorMessage);
  }
}
