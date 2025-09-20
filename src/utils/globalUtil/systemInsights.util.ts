import os from "node:os";
import process from "node:process";
import envConfig from "../../config/env.config";
class SystemInsights {
  static getSystemHealth() {
    return {
      cpuUsage: os.loadavg(),
      totalMemory: `${(os.totalmem() / 1024 / 1024).toFixed(2)} MB`,
      freeMemory: `${(os.freemem() / 1024 / 1024).toFixed(2)} MB`,
      timeStamp: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString()
    };
  }
  static getApplicationHealth() {
    return {
      environment: envConfig.NODE_ENV,
      uptime: `${process.uptime().toFixed(2)} Second`,
      memoryUsage: {
        heapTotal: `${(process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2)} MB`,
        heapUsed: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`
      },
      cpuUsage: {
        user: process.cpuUsage().user,
        system: process.cpuUsage().system
      },
      timeStamp: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString()
    };
  }
}
export default SystemInsights;
