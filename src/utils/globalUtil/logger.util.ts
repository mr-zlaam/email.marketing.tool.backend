import moment from "moment";
import winston from "winston";
import "winston-daily-rotate-file";
import { red, yellow, green, magenta } from "colorette";
import envConfig from "../../config/env.config";
export const colorizeLevel = (level: string) => {
  if (level.includes("ERROR")) return red(level);
  if (level.includes("INFO")) return green(level);
  if (level.includes("WARN")) return yellow(level);
  return magenta(level);
};

const ENV = envConfig.NODE_ENV;
const devFileTransport = new winston.transports.DailyRotateFile({
  filename: "logs/development-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  zippedArchive: true,
  maxSize: "20m",
  maxFiles: "14d"
});

const prodFileTransport = new winston.transports.DailyRotateFile({
  filename: "logs/production-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  zippedArchive: true,
  maxSize: "20m",
  maxFiles: "14d"
});

const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.prettyPrint(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const customLevel = colorizeLevel(
        level.includes("error") ? "ERROR" : level.includes("info") ? "INFO" : level.includes("warn") ? "WARN" : "DEBUG"
      );
      const customTimeStamp = moment(timestamp as string).format("DD/MM/YYYY  hh:mm:ss A");
      const customLog = `
-------------------------------------------------------------------------------
  ${customLevel}::${message as string} 
  ${yellow("TIMESTAMP")}::${green(customTimeStamp)}
  ${magenta("META")}::${yellow(JSON.stringify(meta, null, 2))}
-------------------------------------------------------------------------------`;

      return customLog;
    })
  )
});

const logLevel = ENV === "production" ? "warn" : "info";

const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss"
    }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return `[${level}]: ${message as string} \n[time]: ${moment(timestamp as string).format("YYYY-MM-DD HH:mm:ss")} \nmeta: ${JSON.stringify(meta)}`;
    })
  ),
  transports: [consoleTransport, ...(ENV === "production" ? [prodFileTransport] : [devFileTransport])]
});

export default logger;
