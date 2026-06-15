export type UserRole = "admin" | "staff" | "teacher" | "user";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  birthDate?: string;
  gender?: "male" | "female" | "other";
  address?: string;
  bio?: string;
}
