import { create } from 'zustand'

type UIState = {
  theme: 'dark' | 'light'
  setTheme: (t: 'dark' | 'light') => void
}

export const useUI = create<UIState>((set) => ({
  theme: 'dark',
  setTheme: (t) => {
    if (t === 'dark') document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
    set({ theme: t })
  }
}))
