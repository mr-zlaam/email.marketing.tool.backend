import { delay } from "bullmq";
import type { TMAILDATATOSEND } from "../../types/types";

export async function mockMailSend({ composedEmail, subject, to }: TMAILDATATOSEND) {
  await delay(3000);
  console.log({ composedEmail, subject, to }, "sent successfully");
}
