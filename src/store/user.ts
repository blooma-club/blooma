import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';

interface UserState {
  userId: string | null;
  user: User | null;
  isLoaded: boolean;
  setUserState: (state: { user: User | null; userId: string | null; isLoaded: boolean }) => void;
}

export const useUserStore = create<UserState>((set) => ({
  userId: null,
  user: null,
  isLoaded: false,
  setUserState: (state) => set(state),
}));
