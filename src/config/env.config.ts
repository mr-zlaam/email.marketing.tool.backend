interface IENVIRONMENTCONFIG {
  PORT: number;
  DATABASE_URI: string;
  JWT_SECRET: string;
  BACKEND_API_URI: string;
  FRONTEND_APP_URI: string;
  NODE_ENV: "development" | "production" | "test";
  HOST_EMAIL: string;
  HOST_EMAIL_SECRET: string;
  WHITE_LIST_MAILS: string;
  ALLOWED_REGIONS: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  TWILIO_ACCOUNT_SID: string;
  TWILIO_AUTH_TOKEN: string;
  SENDGRID_API_KEY: string;
  STRIPE_PUBLIC_KEY: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  BACKEND_DOMAIN: string;
  FRONTEND_DOMAIN: string;
  REDDIS_HOST: string;
  REDDIS_PORT: number;
  RESEND_API_KEY: string;
}
export default {
  PORT: process.env.PORT ? parseInt(process.env.PORT) : "Unable to fetch PORT from .env file",
  DATABASE_URI: process.env.DATABASE_URI ? process.env.DATABASE_URI : "Unable to fetch DATABASE_URI from .env file",
  JWT_SECRET: process.env.JWT_SECRET ? process.env.JWT_SECRET : "Unable to fetch JWT_SECRET from .env file",
  BACKEND_API_URI: process.env.BACKEND_API_URI ? process.env.BACKEND_API_URI : "Unable to fetch BACKEND_API_URI from .env file",
  FRONTEND_APP_URI: process.env.FRONTEND_APP_URI ? process.env.FRONTEND_APP_URI : "Unable to fetch FRONTEND_APP_URI from .env file",
  NODE_ENV: process.env.NODE_ENV ? process.env.NODE_ENV : "Unable to fetch NODE_ENV from .env file",
  HOST_EMAIL: process.env.HOST_EMAIL ? process.env.HOST_EMAIL : "Unable to fetch HOST_EMAIL from .env file",
  HOST_EMAIL_SECRET: process.env.HOST_EMAIL_SECRET ? process.env.HOST_EMAIL_SECRET : "Unable to fetch HOST_EMAIL_SECRET from .env file",
  WHITE_LIST_MAILS: process.env.WHITE_LIST_MAILS ? process.env.WHITE_LIST_MAILS : "Unable to fetch WHITE_LIST_MAILS from .env file",
  ALLOWED_REGIONS: process.env.ALLOWED_REGIONS ? process.env.ALLOWED_REGIONS : "Unable to fetch ALLOWED_REGIONS from .env file",
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? process.env.GOOGLE_CLIENT_ID : "Unable to fetch GOOGLE_CLIENT_ID from .env file",
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? process.env.GOOGLE_CLIENT_SECRET : "Unable to fetch GOOGLE_CLIENT_SECRET from .env file",
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID ? process.env.TWILIO_ACCOUNT_SID : "Unable to fetch TWILIO_ACCOUNT_SID from .env file",
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN ? process.env.TWILIO_AUTH_TOKEN : "Unable to fetch TWILIO_AUTH_TOKEN from .env file",
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY ? process.env.SENDGRID_API_KEY : "Unable to fetch SENDGRID_API_KEY from .env file",
  STRIPE_PUBLIC_KEY: process.env.STRIPE_PUBLIC_KEY ? process.env.STRIPE_PUBLIC_KEY : "Unable to fetch STRIPE_PUBLIC_KEY from .env file",
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY : "Unable to fetch STRIPE_SECRET_KEY from .env file",
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET
    ? process.env.STRIPE_WEBHOOK_SECRET
    : "Unable to fetch STRIPE_WEBHOOK_SECRET from .env file",
  BACKEND_DOMAIN: process.env.BACKEND_DOMAIN ? process.env.BACKEND_DOMAIN : "Unable to fetch BACKEND_DOMAIN from .env file",
  FRONTEND_DOMAIN: process.env.FRONTEND_DOMAIN ? process.env.FRONTEND_DOMAIN : "Unable to fetch FRONTEND_DOMAIN from .env file",
  REDDIS_HOST: process.env.REDDIS_HOST ? process.env.REDDIS_HOST : "Unable to fetch REDDIS_HOST from .env file",
  REDDIS_PORT: process.env.REDDIS_PORT ? parseInt(process.env.REDDIS_PORT) : "Unable to fetch REDDIS_PORT from .env file",
  RESEND_API_KEY: process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY : "Unable to fetch RESEND_API_KEY from .env file"
} as IENVIRONMENTCONFIG;
