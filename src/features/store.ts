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


export const appStore = configureStore({
  reducer: {
    debugInfo: debugInfoReducer
  },
  devTools: true,
});

export const createStore = () => {return appStore};

export type AppStore = ReturnType<typeof createStore>;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
export type AppDispatch = typeof appStore.dispatch;
export const useAppDispatch: () => AppDispatch = useDispatch

export const wrapper = createWrapper<AppStore>(createStore);