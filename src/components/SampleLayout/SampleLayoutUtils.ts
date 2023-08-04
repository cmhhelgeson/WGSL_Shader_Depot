import { SampleInit, SampleInitParams } from './SampleLayout';

type DeviceInitParams = {
  device: GPUDevice;
  context: GPUCanvasContext;
  presentationFormat: GPUTextureFormat;
};

type CallbackSync = (params: SampleInitParams & DeviceInitParams) => void;
type CallbackAsync = (
  params: SampleInitParams & DeviceInitParams
) => Promise<void>;

type SampleInitCallback = CallbackSync | CallbackAsync;

export const SampleInitFactory = async (
  callback: SampleInitCallback,
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
    const context = canvas.getContext('webgpu') as GPUCanvasContext;

    const devicePixelRatio = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;
    console.log(canvas.clientWidth * devicePixelRatio);
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
    });

    if (debugArray !== null && debugArray !== undefined) {
      return debugArray;
    }
  };
  return init;
};
