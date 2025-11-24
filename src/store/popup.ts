import { create } from 'zustand'

export type PopupType = 'notEnoughCredit' | null

interface PopupState {
  activePopup: PopupType
  openPopup: (popupType: PopupType) => void
  closePopup: () => void
}

export const usePopupStore = create<PopupState>(set => ({
  activePopup: null,
  openPopup: popupType => set({ activePopup: popupType }),
  closePopup: () => set({ activePopup: null }),
}))
