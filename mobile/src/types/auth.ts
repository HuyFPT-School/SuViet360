export type UserRole = 'admin' | 'staff' | 'teacher' | 'user';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  birthDate?: string;
  gender?: 'male' | 'female' | 'other';
  address?: string;
  bio?: string;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface AuthResponse {
  data: {
    user: User;
  };
  message?: string;
}
