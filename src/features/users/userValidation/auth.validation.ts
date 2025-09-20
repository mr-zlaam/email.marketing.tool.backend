import { z } from "zod";

export const registerUserSchemaZ = z.object({
  firstName: z
    .string({ message: "firstName must be string" })
    .trim()
    .min(3, "FirstName required atleast 3 characters")
    .max(50, "FirstName can only have 50 characters")
    .regex(/^[A-Za-z\s]+$/, "FirstName can only have spaces and alphabets"),
  lastName: z
    .string({ message: "LastName must be string" })
    .trim()
    .min(3, "LastName required atleast 3 characters")
    .max(50, "LastName can only have 50 characters")
    .regex(/^[A-Za-z\s]+$/, "LastName can only have spaces and alphabets"),
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
