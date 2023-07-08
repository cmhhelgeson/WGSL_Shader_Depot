export interface FrameBufferDescriptor {
  width: number;
  height: number;
  texelSizeX: number;
  texelSizeY: number;
  currentTexture: GPUTexture;
  currentView: GPUTextureView;
}

export interface DoubleFrameBufferDescriptor extends FrameBufferDescriptor {
  prevTexture: GPUTexture;
  prevView: GPUTextureView;
}

export interface CreateNavierStokeOutputTexturesReturns {
  dye: DoubleFrameBufferDescriptor;
  velocity: DoubleFrameBufferDescriptor;
  divergence: FrameBufferDescriptor;
  curl: FrameBufferDescriptor;
  pressure: DoubleFrameBufferDescriptor;
}

export const swapBuffersInDoubleFBO = (fbod: DoubleFrameBufferDescriptor) => {
  const currTex = fbod.currentTexture;
  const currView = fbod.currentView;
  const prevView = fbod.prevView;
  const prevTex = fbod.prevTexture;

  fbod.currentTexture = prevTex;
  fbod.currentView = prevView;
  fbod.prevTexture = currTex;
  fbod.prevView = currView;
};

export const createNSTextures = (
  simWidth: number,
  simHeight: number,
  dyeWidth: number,
  dyeHeight: number,
  device: GPUDevice
) => {
  const velocityRG16F: GPUTextureDescriptor = {
    size: [simWidth, simHeight],
    usage:
      GPUTextureUsage.RENDER_ATTACHMENT |
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST,
    //GPUTextureUsage.COPY_SRC,
    format: 'rg16float',
  };

  const dyeRGBA16F: GPUTextureDescriptor = {
    size: [dyeWidth, dyeHeight],
    usage:
      GPUTextureUsage.RENDER_ATTACHMENT |
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST,
    //GPUTextureUsage.COPY_SRC,
    format: 'rgba16float',
  };

  const r16f: GPUTextureDescriptor = {
    size: [simWidth, simHeight],
    usage:
      GPUTextureUsage.RENDER_ATTACHMENT |
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST,
    //GPUTextureUsage.COPY_SRC,
    format: 'r16float',
  };

  const velocitySwap0 = device.createTexture(velocityRG16F);
  const velocitySwap1 = device.createTexture(velocityRG16F);
  const dyeSwap0 = device.createTexture(dyeRGBA16F);
  const dyeSwap1 = device.createTexture(dyeRGBA16F);
  const divergenceSwap0 = device.createTexture(r16f);
  const divergenceSwap1 = device.createTexture(r16f);
  const pressureSwap0 = device.createTexture(r16f);
  const pressureSwap1 = device.createTexture(r16f);
  const vorticity = device.createTexture(r16f);

  return {
    velocitySwap0,
    velocitySwap1,
    dyeSwap0,
    dyeSwap1,
    pressureSwap0,
    pressureSwap1,
    divergenceSwap0,
    divergenceSwap1,
    vorticity,
  };
};

export const getTexelDimsAsFloat32Array = (
  texelSizeX: number,
  texelSizeY: number
) => {
  return new Float32Array([texelSizeX, texelSizeY]);
};
