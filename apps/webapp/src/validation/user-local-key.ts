import { z } from "zod";

export const UserLocalKeySchema = z.object({
  key: z
    .string()
    .min(1, "Key cannot be empty")
    .max(1000, "Key is too long (maximum 1000 characters)")
    .regex(/^[a-zA-Z0-9+/=_-]+$/, "Key contains invalid characters. Only alphanumeric, +, /, =, _, and - are allowed"),
});

export type UserLocalKey = z.infer<typeof UserLocalKeySchema>;

export const validateUserLocalKey = (key: string): { isValid: boolean; error?: string } => {
  try {
    UserLocalKeySchema.parse({ key });
    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, error: error.errors[0]?.message || "Invalid key format" };
    }
    return { isValid: false, error: "Validation failed" };
  }
};
