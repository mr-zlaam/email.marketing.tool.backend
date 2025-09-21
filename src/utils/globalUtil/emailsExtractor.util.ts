import fs from "fs";
import path from "path";
import XLSX from "xlsx";
import { parse } from "fast-csv";
import { Worker } from "worker_threads";
import { isEmail } from "./isEmail.util";

interface WorkerData {
  cells: string[];
}

export class EmailExtractor {
  private chunkSize = 5000;

  constructor(chunkSize?: number) {
    if (chunkSize) this.chunkSize = chunkSize;
  }

  private async runWorker(chunk: string[]): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const worker = new Worker(path.resolve(__dirname, "./emailExtractor.worker.ts"), {
        workerData: { cells: chunk } as WorkerData
      });

      worker.on("message", resolve);
      worker.on("error", reject);
      worker.on("exit", (code) => {
        if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
      });
    });
  }

  private chunkArray(array: string[]): string[][] {
    const chunks: string[][] = [];
    for (let i = 0; i < array.length; i += this.chunkSize) {
      chunks.push(array.slice(i, i + this.chunkSize));
    }
    return chunks;
  }

  private flattenAndValidate(cells: string[]): string[] {
    return Array.from(new Set(cells.map((e) => e.trim().toLowerCase()))).filter((email) => isEmail(email));
  }

  async fromExcel(filePath: string): Promise<string[]> {
    const workbook = XLSX.readFile(filePath);
    const allCells: string[] = [];

    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      for (const row of rows) {
        for (const cell of row) {
          if (typeof cell === "string") allCells.push(cell);
        }
      }
    });

    const chunks = this.chunkArray(allCells);
    const results = await Promise.all(chunks.map((c) => this.runWorker(c)));
    return this.flattenAndValidate(results.flat());
  }

  async fromCSV(filePath: string, delimiter = ","): Promise<string[]> {
    const allCells: string[] = [];

    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(parse({ headers: false, trim: true, delimiter }))
        .on("data", (row: unknown[]) => {
          for (const cell of row) {
            if (typeof cell === "string") allCells.push(cell);
          }
        })
        .on("end", resolve)
        .on("error", reject);
    });

    const chunks = this.chunkArray(allCells);
    const results = await Promise.all(chunks.map((c) => this.runWorker(c)));
    return this.flattenAndValidate(results.flat());
  }

  async fromJSON(filePath: string): Promise<string[]> {
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    const allCells: string[] = [];

    if (Array.isArray(parsed)) {
      parsed.forEach((item) => {
        if (typeof item === "string") allCells.push(item);
        else if (item && typeof item === "object" && "email" in item) {
          const emailValue = (item as Record<string, unknown>).email;
          if (typeof emailValue === "string") allCells.push(emailValue);
        }
      });
    }

    const chunks = this.chunkArray(allCells);
    const results = await Promise.all(chunks.map((c) => this.runWorker(c)));
    return this.flattenAndValidate(results.flat());
  }

  async fromFile(filePath: string): Promise<string[]> {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === ".csv") return this.fromCSV(filePath);
    if (ext === ".tsv" || ext === ".txt") return this.fromCSV(filePath, "\t");
    if (ext === ".xls" || ext === ".xlsx") return this.fromExcel(filePath);
    if (ext === ".json") return this.fromJSON(filePath);
    throw new Error("Unsupported file format");
  }
}
