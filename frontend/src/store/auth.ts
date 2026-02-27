import { create } from 'zustand'

type AuthState = {
  token: string | null
  user: { name: string; email: string } | null
  login: (token: string, user: { name: string; email: string }) => void
  logout: () => void
}

export const useAuth = create<AuthState>((set) => ({
  token: null,
  user: null,
  login: (token, user) => set({ token, user }),
  logout: () => set({ token: null, user: null })
}))
