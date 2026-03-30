import api from './api';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'supplier_manager' | 'viewer';
}

export interface User {
  uid: string;
  email: string;
  name: string;
  role: string;
}

export const authService = {
  // Firebase login - get token
  loginWithFirebase: async (email: string, password: string) => {
    const firebaseApiKey = import.meta.env.VITE_FIREBASE_API_KEY;
    
    if (!firebaseApiKey) {
      throw new Error('Firebase API key is not configured');
    }
    
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true,
        }),
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Login failed');
    }
    
    const data = await response.json();
    localStorage.setItem('token', data.idToken);
    return data;
  },

  // Register user in your backend
  register: async (data: RegisterData) => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  // Verify token and get user info
  verify: async (): Promise<User> => {
    const response = await api.post('/auth/verify');
    return response.data;
  },

  // Get current user from localStorage
  // Get current user from localStorage
getCurrentUser: (): User | null => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      return JSON.parse(userStr) as User;
    } catch {
      return null;
    }
  }
  return null;
},

  // Save user to localStorage
  setCurrentUser: (user: User) => {
    localStorage.setItem('user', JSON.stringify(user));
  },

  // Logout
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },
};