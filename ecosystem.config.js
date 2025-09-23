module.exports = {
  apps: [
    {
      name: "email-backend",
      script: "bun",
      args: "start",
      cwd: "/home/ubuntu/coding/email-marketing/email.marketing.tool.backend",
      interpreter: "none",
      watch: false,
      env: {
        NODE_ENV: "development"
      }
    }
  ]
};
