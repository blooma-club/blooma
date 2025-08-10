import { create } from 'zustand';
import type { UserResource } from '@clerk/types';

interface UserState {
  userId: string | null;
  user: UserResource | null;
  isLoaded: boolean;
  setUserState: (state: { user: UserResource | null; userId: string | null; isLoaded: boolean }) => void;
}

export const useUserStore = create<UserState>((set) => ({
  userId: null,
  user: null,
  isLoaded: false,
  setUserState: (state) => set(state),
}));
