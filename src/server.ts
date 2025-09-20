import { app } from "./app";
import envConfig from "./config/env.config";
import { database } from "./db/db";
import logger from "./utils/globalUtil/logger.util";

void (async function StartServer() {
  await database
    .connect()
    .then(() => {
      app.listen(envConfig.PORT, () => {
        logger.info(`✅ Database connected successfully \n  Server is running on http://localhost:${envConfig.PORT}`);
      });
    })
    .catch((err: unknown) => {
      logger.error("ERRR:: Unable to connection with database", { err });
    });
})();
