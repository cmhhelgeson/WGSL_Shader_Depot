/* eslint-disable prettier/prettier */
//#region Imports
import { createSlice, PayloadAction} from '@reduxjs/toolkit';
import { RootState } from '../store';
import * as ItemOpenPayloads from './itemOpenPayloads'
import { HYDRATE } from 'next-redux-wrapper';
//#endregion

const initialState: RootState['itemOpen'] = -1;

// #region Grids Slice
const itemOpenSlice = createSlice({
  name: 'itemOpen',
  initialState,
  //#region Local Actions
  reducers: {
    setItemOpenIndex: (
      state: RootState['itemOpen'],
      action: PayloadAction<ItemOpenPayloads.SetItemOpenIndexPayload>
    ) => {
      return action.payload.index;
    },
  },
  extraReducers: {
    [HYDRATE]: (state, action) => {
      return action.payload.index;
    }
  }
});
//#endregion

//#region Default Exports
export const itemOpenReducer = itemOpenSlice.reducer;

export const {
  setItemOpenIndex
} = itemOpenSlice.actions;