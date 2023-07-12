/* eslint-disable prettier/prettier */
import { configureStore } from '@reduxjs/toolkit';
import { debugInfoReducer } from './debugInfo/debugInfoSlice';
import { 
  TypedUseSelectorHook, 
  useDispatch, 
  useSelector
} from 'react-redux';
import {createWrapper} from 'next-redux-wrapper';

type DebugInfo = {
  debugStep: number;
  totalSteps: number;
  debugExplanations: string[],
};

export type RootState = {
  debugInfo: DebugInfo;
};


export const createStore = () =>
  configureStore({
    reducer: {
      debugInfo: debugInfoReducer
    },
    devTools: true,
  });

export type AppStore = ReturnType<typeof createStore>;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export const wrapper = createWrapper<AppStore>(createStore);