'use client'

import { create } from 'zustand'

export type PopupType = 'login' | 'notEnoughCredit'

type PopupState = {
  activePopup: PopupType | null
  openPopup: (popup: PopupType) => void
  closePopup: () => void
}

export const usePopupStore = create<PopupState>((set) => ({
  activePopup: null,
  openPopup: (popup) => set({ activePopup: popup }),
  closePopup: () => set({ activePopup: null }),
}))
