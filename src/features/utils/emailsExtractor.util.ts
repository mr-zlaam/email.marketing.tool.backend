import fs from "fs";
import path from "path";
import XLSX from "xlsx";
import { parse } from "fast-csv";
import { Worker } from "worker_threads";
import { isEmail } from "../../utils/globalUtil/isEmail.util";

interface ExtractedData {
  email: string;
  name?: string;
}

interface WorkerData {
  rows: Array<Record<string, unknown>>;
  emailColumns: string[];
  nameColumns: string[];
}

export class EmailExtractor {
  private chunkSize = 5000;
  private readonly emailColumns = ["email", "emails", "mail", "mails", "contactmail"];
  private readonly nameColumns = ["name", "names", "firstname", "firstnames", "lastname", "lastnames"];

  constructor(chunkSize?: number) {
    if (chunkSize) this.chunkSize = chunkSize;
  }

  private async runWorker(chunk: Array<Record<string, unknown>>): Promise<ExtractedData[]> {
    return new Promise((resolve, reject) => {
      const worker = new Worker(path.resolve(__dirname, "./emailExtractor.worker.ts"), {
        workerData: { rows: chunk, emailColumns: this.emailColumns, nameColumns: this.nameColumns } as WorkerData
      });

      worker.on("message", resolve);
      worker.on("error", reject);
      worker.on("exit", (code) => {
        if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
      });
    });
  }

  private chunkArray<T>(array: T[]): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += this.chunkSize) {
      chunks.push(array.slice(i, i + this.chunkSize));
    }
    return chunks;
  }

  private flattenAndValidate(data: ExtractedData[]): ExtractedData[] {
    const uniqueMap = new Map<string, ExtractedData>();

    for (const item of data) {
      const normalizedEmail = item.email.trim().toLowerCase();
      if (isEmail(normalizedEmail) && !uniqueMap.has(normalizedEmail)) {
        uniqueMap.set(normalizedEmail, { email: normalizedEmail, name: item.name });
      }
    }

    return Array.from(uniqueMap.values());
  }

  async fromExcel(filePath: string): Promise<ExtractedData[]> {
    const workbook = XLSX.readFile(filePath);
    const allRows: Array<Record<string, unknown>> = [];

    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      const jsonData: Array<Record<string, unknown>> = XLSX.utils.sheet_to_json(sheet);

      // Normalize headers to lowercase for matching
      const normalizedRows = jsonData.map((row) => {
        const normalizedRow: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(row)) {
          normalizedRow[key.toLowerCase().trim()] = value;
        }
        return normalizedRow;
      });

      allRows.push(...normalizedRows);
    });

    const chunks = this.chunkArray(allRows);
    const results = await Promise.all(chunks.map((c) => this.runWorker(c)));
    return this.flattenAndValidate(results.flat());
  }

  async fromCSV(filePath: string, delimiter = ","): Promise<ExtractedData[]> {
    const allRows: Array<Record<string, unknown>> = [];

    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(parse({ headers: true, trim: true, delimiter }))
        .on("data", (row: Record<string, unknown>) => {
          // Normalize headers to lowercase for matching
          const normalizedRow: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(row)) {
            normalizedRow[key.toLowerCase().trim()] = value;
          }
          allRows.push(normalizedRow);
        })
        .on("end", resolve)
        .on("error", reject);
    });

    const chunks = this.chunkArray(allRows);
    const results = await Promise.all(chunks.map((c) => this.runWorker(c)));
    return this.flattenAndValidate(results.flat());
  }

  async fromJSON(filePath: string): Promise<ExtractedData[]> {
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    const allRows: Array<Record<string, unknown>> = [];

    if (Array.isArray(parsed)) {
      parsed.forEach((item) => {
        if (item && typeof item === "object") {
          // Normalize headers to lowercase for matching
          const normalizedRow: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(item as Record<string, unknown>)) {
            normalizedRow[key.toLowerCase().trim()] = value;
          }
          allRows.push(normalizedRow);
        }
      });
    }

    const chunks = this.chunkArray(allRows);
    const results = await Promise.all(chunks.map((c) => this.runWorker(c)));
    return this.flattenAndValidate(results.flat());
  }

  async fromFile(filePath: string): Promise<ExtractedData[]> {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === ".csv") return this.fromCSV(filePath);
    if (ext === ".tsv" || ext === ".txt") return this.fromCSV(filePath, "\t");
    if (ext === ".xls" || ext === ".xlsx") return this.fromExcel(filePath);
    if (ext === ".json") return this.fromJSON(filePath);
    throw new Error("Unsupported file format");
  }
}
