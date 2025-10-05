import { parentPort, workerData } from "worker_threads";

interface WorkerData {
  rows: Array<Record<string, unknown>>;
  emailColumns: string[];
  nameColumns: string[];
}

interface ExtractedData {
  email: string;
  name?: string;
}

const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

if (!parentPort) throw new Error("Worker must have a parentPort");

const { rows, emailColumns, nameColumns } = workerData as WorkerData;

const extracted: ExtractedData[] = [];

for (const row of rows) {
  let email: string | undefined;
  let name: string | undefined;

  // Find email in specified columns
  for (const col of emailColumns) {
    const cellValue = row[col];
    if (typeof cellValue === "string") {
      const match = cellValue.match(emailRegex);
      if (match) {
        email = match[0];
        break;
      }
    }
  }

  // Find name in specified columns
  if (email) {
    for (const col of nameColumns) {
      const cellValue = row[col];
      if (typeof cellValue === "string" && cellValue.trim()) {
        name = cellValue.trim();
        break;
      }
    }

    extracted.push({ email, name });
  }
}

parentPort.postMessage(extracted);
