export type UserRole = "admin" | "staff" | "teacher" | "student";

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
  xp?: number;
  level?: number;
  subscriptionTier?: "Free" | "Student Plus" | "Student Pro";
  subscriptionExpiry?: string | null;
}
