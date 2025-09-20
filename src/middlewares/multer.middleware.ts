import multer from "multer";
import path from "node:path";
import { cleanFileName, generateRandomStrings } from "../utils/quickUtil/slugStringGenerator.util";

export const supportedFileTypes = ["pdf"];
const uploadDirectory = path.join(process.cwd(), "public/upload/");

const storage = multer.diskStorage({
  filename: function (_, file, cb) {
    const uniqueSuffix = generateRandomStrings(5);
    cb(null, `${uniqueSuffix}-${cleanFileName(file.originalname)}`);
  },

  destination: function (_, __, cb) {
    cb(null, uploadDirectory);
  }
});

const fileFilter = (_: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const fileExtension = path.extname(file.originalname).toLowerCase().slice(1);
  if (!supportedFileTypes.includes(fileExtension)) {
    return cb(new Error(`Unsupported file type: ${file.originalname}. Allowed types: ${supportedFileTypes.join(", ")}`));
  }
  cb(null, true);
};

export const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024
  },
  fileFilter
}).fields([
  { name: "bussinessRegisterationDocument", maxCount: 1 },
  { name: "businessLicenseDocument", maxCount: 1 },
  { name: "ContactPersonAdhaarCardDocment", maxCount: 1 },
  { name: "artisanIdCardDocument", maxCount: 1 },
  { name: "bankStatementDocument", maxCount: 1 },
  { name: "productCatalogueDocument", maxCount: 1 },
  { name: "certificationsDocument", maxCount: 1 }
]);
