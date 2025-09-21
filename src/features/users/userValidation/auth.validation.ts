import { z } from "zod";

export const registerUserSchemaZ = z.object({
  username: z
    .string({ message: "username must be string" })
    .trim()
    .min(3, "username required atleast 3 characters")
    .max(20, "username must not contain more than 30 characters")
    .regex(/^[a-z0-9_]+$/, "username can only contain lowercase, underscores and numbers"),
  fullName: z
    .string({ message: "fullName must be string" })
    .trim()
    .min(3, "fullName required atleast 3 characters")
    .max(50, "fullName can only have 50 characters")
    .regex(/^[A-Za-z\s]+$/, "fullName can only have spaces and alphabets"),
  email: z
    .string({ message: "email must be string" })
    .trim()
    .min(3, "email required atleast 3 characters")
    .max(100, "emails can only have 100 characters")
    .regex(/^(?=.{1,64}@)[a-z0-9_-]+(\.[a-z0-9_-]+)*@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/, { message: "email is not valid" }),
  password: z
    .string({ message: "password must be string" })
    .min(8, "password must be atleast 8 characters")
    .max(100, "password can only have 100 characters"),
  isVerified: z.boolean().default(false)
});

export const resendOTPSchemaZ = z.object({ email: z.string({ message: "email must be string" }).email().toLowerCase() });
export const loginUserSchema = z.object({
  email: z.string({ message: "email must be string" }).email().toLowerCase(),
  password: z.string({ message: "password must be string" })
});
