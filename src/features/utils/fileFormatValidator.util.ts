import XLSX from "xlsx";
import { parse } from "fast-csv";
import fs from "fs";

interface ValidationResult {
  isValid: boolean;
  error?: string;
  foundColumns?: {
    email: string;
    name?: string;
  };
}

/**
 * Standard file format validator
 * Requires: Email column (mandatory), Name column (optional but recommended)
 */
export class FileFormatValidator {
  private readonly requiredEmailColumns = ["email", "emails", "mail", "mails", "contactmail"];
  private readonly optionalNameColumns = ["name", "names", "firstname", "firstnames", "lastname", "lastnames"];

  /**
   * Validates if file has required column structure
   */
  async validateFileFormat(filePath: string, fileExtension: string): Promise<ValidationResult> {
    try {
      if (fileExtension === ".csv" || fileExtension === ".tsv" || fileExtension === ".txt") {
        return await this.validateCSVFormat(filePath, fileExtension === ".tsv" || fileExtension === ".txt" ? "\t" : ",");
      } else if (fileExtension === ".xls" || fileExtension === ".xlsx") {
        return this.validateExcelFormat(filePath);
      } else if (fileExtension === ".json") {
        return this.validateJSONFormat(filePath);
      }

      return {
        isValid: false,
        error: "Unsupported file format. Please use CSV, Excel (.xlsx, .xls), TSV, or JSON."
      };
    } catch (error) {
      return {
        isValid: false,
        error: `File validation error: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }

  /**
   * Validate CSV/TSV format
   */
  private async validateCSVFormat(filePath: string, delimiter: string): Promise<ValidationResult> {
    return new Promise((resolve) => {
      const headers: string[] = [];

      fs.createReadStream(filePath)
        .pipe(parse({ headers: true, trim: true, delimiter, maxRows: 1 }))
        .on("headers", (headerList: string[]) => {
          headers.push(...headerList);
        })
        .on("data", () => {
          // We only need headers, data row is just to trigger completion
        })
        .on("end", () => {
          const result = this.validateHeaders(headers);
          resolve(result);
        })
        .on("error", (error) => {
          resolve({
            isValid: false,
            error: `CSV parsing error: ${error.message}`
          });
        });
    });
  }

  /**
   * Validate Excel format
   */
  private validateExcelFormat(filePath: string): ValidationResult {
    try {
      const workbook = XLSX.readFile(filePath);
      const firstSheetName = workbook.SheetNames[0];

      if (!firstSheetName) {
        return {
          isValid: false,
          error: "Excel file is empty or has no sheets"
        };
      }

      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (jsonData.length === 0) {
        return {
          isValid: false,
          error: "Excel sheet is empty"
        };
      }

      const headers = (jsonData[0] as string[]) || [];
      return this.validateHeaders(headers);
    } catch (error) {
      return {
        isValid: false,
        error: `Excel parsing error: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }

  /**
   * Validate JSON format
   */
  private validateJSONFormat(filePath: string): ValidationResult {
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return {
        isValid: false,
        error: "JSON file must contain an array of objects"
      };
    }

    if (parsed.length === 0) {
      return {
        isValid: false,
        error: "JSON file is empty"
      };
    }

    const firstObject: unknown = parsed[0];
    if (typeof firstObject !== "object" || firstObject === null) {
      return {
        isValid: false,
        error: "JSON array must contain objects"
      };
    }

    const headers = Object.keys(firstObject as Record<string, unknown>);
    return this.validateHeaders(headers);
  }

  /**
   * Validate headers against required standards
   */
  private validateHeaders(headers: string[]): ValidationResult {
    const normalizedHeaders = headers.map((h) => h.toLowerCase().trim());

    // Check for required email column
    const emailColumn = this.requiredEmailColumns.find((col) => normalizedHeaders.includes(col));

    if (!emailColumn) {
      return {
        isValid: false,
        error: `Missing required EMAIL column. File must have one of these columns: ${this.requiredEmailColumns.join(", ")}`
      };
    }

    // Check for optional name column
    const nameColumn = this.optionalNameColumns.find((col) => normalizedHeaders.includes(col));

    return {
      isValid: true,
      foundColumns: {
        email: emailColumn,
        name: nameColumn
      }
    };
  }
}

export const fileFormatValidator = new FileFormatValidator();
