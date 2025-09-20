import envConfig from "../config/env.config";
import logger from "../utils/globalUtil/logger.util";

const whitelist = envConfig.WHITE_LIST_MAILS;

logger.info(`Whitelist: ${whitelist}`);
