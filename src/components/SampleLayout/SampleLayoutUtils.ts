import { SampleInit, SampleInitParams } from './SampleLayout';

interface DeviceInitParms {
  device: GPUDevice;
}

interface DeviceInit3DParams extends DeviceInitParms {
  context: GPUCanvasContext;
  presentationFormat: GPUTextureFormat;
}

interface DeviceInit2DParams extends DeviceInitParms {
  context: CanvasRenderingContext2D;
}

type CallbackSync3D = (params: SampleInitParams & DeviceInit3DParams) => void;
type CallbackAsync3D = (
  params: SampleInitParams & DeviceInit3DParams
) => Promise<void>;

type CallbackSync2D = (params: SampleInitParams & DeviceInit2DParams) => void;
type CallbackAsync2D = (
  params: SampleInitParams & DeviceInit2DParams
) => Promise<void>;

type SampleInitCallback3D = CallbackSync3D | CallbackAsync3D;
type SampleInitCallback2D = CallbackSync2D | CallbackAsync2D;

export const SampleInitFactoryWebGPU = async (
  callback: SampleInitCallback3D,
  debugArray?: string[]
): Promise<SampleInit> => {
  const init: SampleInit = async ({
    canvas,
    pageState,
    gui,
    debugValueRef,
    debugOnRef,
    canvasRef,
    stats,
  }) => {
    const adapter = await navigator.gpu.requestAdapter();
    const device = await adapter.requestDevice();
    if (!pageState.active) return;
    const context = canvas.getContext('webgpu') as GPUCanvasContext;
    const devicePixelRatio = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;
    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
      device,
      format: presentationFormat,
      alphaMode: 'premultiplied',
    });

    callback({
      canvas,
      pageState,
      gui,
      debugValueRef,
      debugOnRef,
      canvasRef,
      device,
      context,
      presentationFormat,
      stats,
    });

    if (debugArray !== null && debugArray !== undefined) {
      return debugArray;
    }
  };
  return init;
};

export const SampleInitFactoryCanvas2D = async (
  callback: SampleInitCallback2D,
  debugArray?: string[]
): Promise<SampleInit> => {
  const init: SampleInit = async ({
    canvas,
    pageState,
    gui,
    debugValueRef,
    debugOnRef,
    canvasRef,
  }) => {
    const adapter = await navigator.gpu.requestAdapter();
    const device = await adapter.requestDevice();
    if (!pageState.active) return;
    const context = canvas.getContext('2d') as CanvasRenderingContext2D;

    callback({
      canvas,
      pageState,
      gui,
      debugValueRef,
      debugOnRef,
      canvasRef,
      device,
      context,
    });

    if (debugArray !== null && debugArray !== undefined) {
      return debugArray;
    }
  };
  return init;
};
