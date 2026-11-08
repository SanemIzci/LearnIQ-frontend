import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface ToastNotice {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
}

export interface UiState {
  sidebarOpen: boolean;
  mobileNavOpen: boolean;
  toasts: ToastNotice[];
}

const initialState: UiState = {
  sidebarOpen: true,
  mobileNavOpen: false,
  toasts: [],
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen(state, action: PayloadAction<boolean>) {
      state.sidebarOpen = action.payload;
    },
    setMobileNavOpen(state, action: PayloadAction<boolean>) {
      state.mobileNavOpen = action.payload;
    },
    pushToast(state, action: PayloadAction<Omit<ToastNotice, 'id'> & { id?: string }>) {
      const id = action.payload.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      state.toasts.push({ ...action.payload, id });
    },
    dismissToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
  },
});

export const {
  toggleSidebar,
  setSidebarOpen,
  setMobileNavOpen,
  pushToast,
  dismissToast,
} = uiSlice.actions;

export default uiSlice.reducer;

