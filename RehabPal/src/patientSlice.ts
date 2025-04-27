import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface PatientState {
  patientId: string;
}

const initialState: PatientState = {
  patientId: '',
};

const patientSlice = createSlice({
  name: 'patient',
  initialState,
  reducers: {
    setPatientId(state, action: PayloadAction<string>) {
      state.patientId = action.payload;
    },
    clearPatientId(state) {
      state.patientId = '';
    },
  },
});

export const { setPatientId, clearPatientId } = patientSlice.actions;
export default patientSlice.reducer;
