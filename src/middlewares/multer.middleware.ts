import multer from "multer";
import path from "node:path";
import { cleanFileName, generateRandomStrings } from "../utils/quickUtil/slugStringGenerator.util";
import logger from "../utils/globalUtil/logger.util";

// Allowed file types for email import
export const supportedFileTypes = ["xlsx", "xls", "csv", "tsv", "txt", "json"];
const uploadDirectory = path.join(process.cwd(), "public/upload/");
const storage = multer.diskStorage({
  filename: (_, file, cb) => {
    const uniqueSuffix = generateRandomStrings(5);
    cb(null, `${uniqueSuffix}-${cleanFileName(file.originalname)}`);
  },
  destination: (_, __, cb) => {
    cb(null, uploadDirectory);
  }
});

const fileFilter = (_: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const fileExtension = path.extname(file.originalname).toLowerCase().slice(1);
  if (!supportedFileTypes.includes(fileExtension)) {
    logger.info(`Unsupported file type: ${file.originalname}. Allowed types: ${supportedFileTypes.join(", ")}`);
    return cb(new Error(`Unsupported file type: ${file.originalname}. Allowed types: ${supportedFileTypes.join(", ")}`));
  }
  cb(null, true);
};

// Single-file upload middleware
export const uploadSingleFile = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024 // 20 MB
  },
  fileFilter
}).single("file"); // field name is just 'file'
