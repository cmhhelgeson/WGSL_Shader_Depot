/* eslint-disable prettier/prettier */
//#region Imports
import { createSlice, PayloadAction} from '@reduxjs/toolkit';
import { RootState } from '../store';
import * as DebugPayloads from './debugInfoPayloads'
import { HYDRATE } from 'next-redux-wrapper';
//#endregion

const initialState: RootState['debugInfo'] = {
  debugStep: 0,
  totalSteps: 1,
  debugExplanations: ['(Add Explanations)'],
};

// #region Grids Slice
const debugInfoSlice = createSlice({
  name: 'debugInfo',
  initialState,
  //#region Local Actions
  reducers: {
    //TODO: Possibly should have side effect, since all the problem info is associated with the number
    /**
     * Changes the problem number
     * @param {number} problemNumber The grid in the grid list to be operated on.
     * @param {number} newWidth The new width (num. columns) of the grid.
     * @param {number} [defaultValue] The value that will populate the newly created column.
     */
    changeDebugStep: (
      state: RootState['debugInfo'],
      action: PayloadAction<DebugPayloads.ChangeDebugStepPayload>
    ) => {
      const { debugStep } = action.payload;
      if (debugStep < 0 || debugStep >= state.totalSteps) {
        return;
      }
      state.debugStep = debugStep;
    },
    changeTotalSteps: (
      state: RootState['debugInfo'],
      action: PayloadAction<DebugPayloads.ChangeTotalStepsPayload>
    ) => {
      const {totalSteps} = action.payload;
      if (totalSteps < 1) {
        return;
      }
      state.totalSteps = totalSteps;
      if (state.debugStep >= totalSteps) {
        state.debugStep = totalSteps - 1;
      }
    },
    changeDebugExplanations: (
      state: RootState['debugInfo'],
      action: PayloadAction<DebugPayloads.ChangeDebugExplanations>
    ) => {
      const {newExplanations} = action.payload;
      state.debugExplanations = [...newExplanations];
      state.totalSteps = newExplanations.length;
    }
  },
  extraReducers: {
    [HYDRATE]: (state, action) => {
      return {
        ...state,
        ...action.debugInfo
      }
    }
  }
});
//#endregion

//#region Default Exports
export const debugInfoReducer = debugInfoSlice.reducer;

export const {
  changeDebugStep,
  changeTotalSteps,
  changeDebugExplanations
} = debugInfoSlice.actions;

export const selectTotalSteps = (state: RootState) => state.debugInfo.totalSteps;
export const selectDebugStep = (state: RootState) =>
  state.debugInfo.debugStep;
export const selectDebugExplanations = (state: RootState) =>
  state.debugInfo.debugExplanations;
