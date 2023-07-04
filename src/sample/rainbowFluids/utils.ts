import { GUI } from 'dat.gui';
import { configType } from './types';
import { ArrayLike } from 'wgpu-matrix/dist/1.x/array-like';

/* Return the change in time and the new lastUpdateTime */
export const calculateDeltaTime = (
  lastUpdateTime: number
): [number, number] => {
  const now = Date.now();
  let dt = (now - lastUpdateTime) / 1000;
  dt = Math.min(dt, 0.016666);
  return [dt, lastUpdateTime];
};

export const resizeCanvas = (canvas: HTMLCanvasElement): boolean => {
  const width = scaleByPixelRatio(canvas.clientWidth);
  const height = scaleByPixelRatio(canvas.clientHeight);
  if (canvas.width != width || canvas.height != height) {
    canvas.width = width;
    canvas.height = height;
    return true;
  }
  return false;
};

export const scaleByPixelRatio = (input: number): number => {
  return Math.floor(input * (window.devicePixelRatio || 1));
};

export const updateGuiKeywords = (config: configType, material: any) => {
  const displayKeywords = [];
  if (config.SHADING) {
    displayKeywords.push('SHADING');
  }
  if (config.BLOOM) {
    displayKeywords.push('BLOOM');
  }
  if (config.SUNRAYS) {
    displayKeywords.push('SUNRAYS');
  }
  material.setKeywords(displayKeywords);
};

export const initGuiConstants = (gui: GUI, config: configType) => {
  const navierStokesFolder = gui.addFolder('Navier-Stokes');
  navierStokesFolder
    .add(config, 'DENSITY_DISSIPATION', 0, 4.0)
    .name('density diffusion');
  navierStokesFolder
    .add(config, 'VELOCITY_DISSIPATION', 0, 4.0)
    .name('velocity diffusion');
  navierStokesFolder.add(config, 'PRESSURE', 0.0, 1.0).name('pressure');
  navierStokesFolder.add(config, 'CURL', 0, 50).name('vorticity').step(1);
  navierStokesFolder
    .add(config, 'SPLAT_RADIUS', 0.01, 1.0)
    .name('splat radius');
  navierStokesFolder.add(config, 'COLORFUL').name('colorful');
  navierStokesFolder.add(config, 'PAUSED').name('paused').listen();
};

export const initBloomGui = (
  gui: GUI,
  config: configType,
  onEnableBloom: () => void
) => {
  const bloomFolder = gui.addFolder('Bloom');
  bloomFolder
    .add(config, 'BLOOM')
    .name('enabled')
    .onFinishChange(onEnableBloom);
  bloomFolder.add(config, 'BLOOM_INTENSITY', 0.1, 2.0).name('intensity');
  bloomFolder.add(config, 'BLOOM_THRESHOLD', 0.0, 1.0).name('threshold');
};

export const initSunraysGui = (
  gui: GUI,
  config: configType,
  onEnableSunrays: () => void
) => {
  const sunraysFolder = gui.addFolder('Sunrays');
  sunraysFolder
    .add(config, 'SUNRAYS')
    .name('enabled')
    .onFinishChange(onEnableSunrays);
  sunraysFolder.add(config, 'SUNRAYS_WEIGHT', 0.3, 1.0).name('weight');
};

export const initCaptureGui = (gui: GUI, config: configType) => {
  const captureFolder = gui.addFolder('Capture');
  captureFolder.addColor(config, 'BACK_COLOR').name('background color');
  captureFolder.add(config, 'TRANSPARENT').name('transparent');
  //captureFolder.add({ fun: captureScreenshot }, 'fun').name('take screenshot');
};

export const initDebugGui = (gui: GUI, config: configType) => {
  const debugFolder = gui.addFolder('Debug');
  debugFolder
    .add(config, 'DEBUG_VIEW', ['none', 'dye', 'velocity'])
    .name('Debug View');
};

export const defaultConfig: configType = {
  SIM_RESOLUTION: 128,
  DYE_RESOLUTION: 1024,
  CAPTURE_RESOLUTION: 512,
  DENSITY_DISSIPATION: 1,
  VELOCITY_DISSIPATION: 0.2,
  PRESSURE: 0.8,
  PRESSURE_ITERATIONS: 20,
  CURL: 30,
  SPLAT_RADIUS: 0.25,
  SPLAT_FORCE: 6000,
  SHADING: true,
  COLORFUL: true,
  COLOR_UPDATE_SPEED: 10,
  PAUSED: false,
  BACK_COLOR: { r: 0, g: 0, b: 0 },
  TRANSPARENT: false,
  BLOOM: true,
  BLOOM_ITERATIONS: 8,
  BLOOM_RESOLUTION: 256,
  BLOOM_INTENSITY: 0.8,
  BLOOM_THRESHOLD: 0.6,
  BLOOM_SOFT_KNEE: 0.7,
  SUNRAYS: true,
  SUNRAYS_RESOLUTION: 196,
  SUNRAYS_WEIGHT: 1.0,
  DEBUG_VIEW: 'none',
};

export const correctRadius = (aspectRatio: number, radius: number) => {
  if (aspectRatio > 1) {
    radius *= aspectRatio;
  }
  return radius;
};

type BindGroupBindingLayout =
  | GPUBufferBindingLayout
  | GPUTextureBindingLayout
  | GPUSamplerBindingLayout
  | GPUStorageTextureBindingLayout
  | GPUExternalTextureBindingLayout;

type BindGroupDescriptor = {
  bindGroup: GPUBindGroup;
  bindGroupLayout: GPUBindGroupLayout;
};

type BindGroupDescriptorTemplate = {
  groupEntries: GPUBindGroupEntry[];
  layoutEntries: GPUBindGroupLayoutEntry[];
};

type ResourceTypeName =
  | 'buffer'
  | 'texture'
  | 'sampler'
  | 'externalTexture'
  | 'storageTexture';

export const createBindGroupDescriptor = (
  bindings: number[],
  visibilities: number[],
  resourceTypes: ResourceTypeName[],
  resourceLayouts: BindGroupBindingLayout[],
  resources: GPUBindingResource[],
  device: GPUDevice
): BindGroupDescriptor => {
  const layoutEntries: GPUBindGroupLayoutEntry[] = [];
  const groupEntries: GPUBindGroupEntry[] = [];
  for (let i = 0; i < resources.length; i++) {
    const layoutEntry: any = {};
    layoutEntry.binding = bindings[i];
    layoutEntry.visibility = visibilities[i % visibilities.length];
    layoutEntry[resourceTypes[i]] = resourceLayouts[i];

    layoutEntries.push(layoutEntry);

    const groupEntry: any = {};
    groupEntry.binding = bindings[i];
    groupEntry.resource = resources[i];

    groupEntries.push(groupEntry);
  }

  const bindGroupLayout = device.createBindGroupLayout({
    entries: layoutEntries,
  });

  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: groupEntries,
  });

  return {
    bindGroup,
    bindGroupLayout,
  };
};

export const createBindGroupDescriptorTemplate = (
  bindings: number[],
  visibilities: number[],
  resourceTypes: ResourceTypeName[],
  resourceLayouts: BindGroupBindingLayout[],
  resources: GPUBindingResource[]
): BindGroupDescriptorTemplate => {
  const layoutEntries: GPUBindGroupLayoutEntry[] = [];
  const groupEntries: GPUBindGroupEntry[] = [];
  for (let i = 0; i < resources.length; i++) {
    const layoutEntry: any = {};
    layoutEntry.binding = bindings[i];
    layoutEntry.visibility = visibilities[i % visibilities.length];
    layoutEntry[resourceTypes[i]] = resourceLayouts[i];

    layoutEntries.push(layoutEntry);

    const groupEntry: any = {};
    groupEntry.binding = bindings[i];
    groupEntry.resource = resources[i];

    groupEntries.push(groupEntry);
  }

  return {
    groupEntries,
    layoutEntries,
  };
};

export const writeToF32Buffer = (
  arrayLikes: ArrayLike[],
  numberLikes: Float32Array,
  buffer: GPUBuffer,
  device: GPUDevice
) => {
  let ele = arrayLikes[0] as Float32Array;
  device.queue.writeBuffer(
    buffer,
    0,
    ele.buffer,
    ele.byteOffset,
    ele.byteLength
  );
  let writtenBufferSize = arrayLikes[0].length * Float32Array.BYTES_PER_ELEMENT;

  for (let i = 1; i < arrayLikes.length; i++) {
    ele = arrayLikes[i] as Float32Array;
    device.queue.writeBuffer(
      buffer,
      writtenBufferSize,
      ele.buffer,
      ele.byteOffset,
      ele.byteLength
    );
    writtenBufferSize = arrayLikes[i].length * Float32Array.BYTES_PER_ELEMENT;
    console.log(writtenBufferSize);
  }

  device.queue.writeBuffer(
    buffer,
    writtenBufferSize,
    numberLikes.buffer,
    numberLikes.byteOffset,
    numberLikes.byteLength
  );
};