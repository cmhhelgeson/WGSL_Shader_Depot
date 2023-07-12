/* eslint-disable prettier/prettier */
export type ChangeDebugStepPayload = {
  debugStep: number;
};

export type ChangeTotalStepsPayload = {
  totalSteps: number;
}

export type ChangeDebugExplanations = {
  newExplanations: string[],
}