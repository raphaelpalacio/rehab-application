import { configureStore } from '@reduxjs/toolkit';
import patientReducer from './patientSlice';

export const store = configureStore({
  reducer: {
    patient: patientReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;