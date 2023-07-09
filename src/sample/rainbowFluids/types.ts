interface RGBType {
  r: number;
  g: number;
  b: number;
}

type DebugViewType =
  | 'None'
  | 'SplatVelocityOutput'
  | 'SplatDyeOutput'
  | 'VorticityVelocityOutput'
  | 'GradientSubtractVelocityOutput'
  | 'AdvectionVelocityOutput'
  | 'AdvectionDyeOutput'
  | 'ClearPressureOutput'
  | 'PressurePressureOutput'
  | 'DivergenceOutput'
  | 'CurlOutput';

export interface configType {
  SIM_RESOLUTION: number;
  DYE_RESOLUTION: number;
  CAPTURE_RESOLUTION: number;
  DENSITY_DISSIPATION: number;
  VELOCITY_DISSIPATION: number;
  PRESSURE: number;
  PRESSURE_ITERATIONS: number;
  CURL: number;
  SPLAT_RADIUS: number;
  SPLAT_FORCE: number;
  SHADING: boolean;
  COLORFUL: boolean;
  COLOR_UPDATE_SPEED: number;
  PAUSED: boolean;
  BACK_COLOR: RGBType;
  TRANSPARENT: boolean;
  BLOOM: boolean;
  BLOOM_ITERATIONS: number;
  BLOOM_RESOLUTION: number;
  BLOOM_INTENSITY: number;
  BLOOM_THRESHOLD: number;
  BLOOM_SOFT_KNEE: number;
  SUNRAYS: boolean;
  SUNRAYS_RESOLUTION: number;
  SUNRAYS_WEIGHT: number;
  DEBUG_VIEW: DebugViewType;
}
