import fs from "node:fs";
import path from "node:path";
import reshttp from "reshttp";
import type { MailDataRequired } from "@sendgrid/mail";
import sgMail from "@sendgrid/mail";

import envConfig from "../config/env.config";
import appConstant from "../constants/app.constant";
import { replaceAllPlaceholders } from "../utils/quickUtil/replaceAllPlaceholders.util";
import { generateRandomStrings } from "../utils/quickUtil/slugStringGenerator.util";
import logger from "../utils/globalUtil/logger.util";
import { throwError } from "../utils/globalUtil/throwError.util";

// configure SendGrid API key
if (!envConfig.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY is missing from environment variables");
}
sgMail.setApiKey(envConfig.SENDGRID_API_KEY);

export async function gloabalMailMessage(
  to: string,
  message: string,
  subject: string,
  header?: string,
  addsOn?: string,
  senderIntro?: string
): Promise<void> {
  const templatePath = path.resolve(__dirname, "../../templates/globalEmail.template.html");
  let htmlTemplate = fs.readFileSync(templatePath, "utf8");

  const placeholders = {
    companyname: appConstant.COMPANY_NAME,
    senderIntro: senderIntro || "",
    message: message || "",
    header: header || "",
    addsOn: addsOn || ""
  };

  htmlTemplate = replaceAllPlaceholders(htmlTemplate, placeholders);

  const randomStr = generateRandomStrings(10);

  const mailOptions: MailDataRequired = {
    from: envConfig.HOST_EMAIL,
    to,
    subject: subject ?? appConstant.COMPANY_NAME,
    html: htmlTemplate,
    headers: {
      "X-Auto-Response-Suppress": "All",
      Precedence: "bulk",
      "Auto-Submitted": "auto-generated",
      "Message-ID": `<${randomStr}.dev>`
    },
    replyTo: "support@backend_template_with_auth.com"
  };

  try {
    await sgMail.send(mailOptions);
    logger.info(`Email sent successfully to ${to}`);
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Error sending email: ${error.message}`);
    }
    throwError(reshttp.internalServerErrorCode, reshttp.internalServerErrorMessage);
  }
}
