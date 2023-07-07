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

export const createNavierStokeOutputTextures = (
  simWidth: number,
  simHeight: number,
  device: GPUDevice
) => {
  const velocity0TextureRG16F = device.createTexture({
    size: [simWidth, simHeight],
    usage:
      GPUTextureUsage.RENDER_ATTACHMENT |
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_SRC,
    //GPUTextureUsage.COPY_SRC,
    format: 'rg16float',
  });

  const velocity1TextureRG16F = device.createTexture({
    size: [simWidth, simHeight],
    usage:
      GPUTextureUsage.RENDER_ATTACHMENT |
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_SRC,
    //GPUTextureUsage.COPY_SRC,
    format: 'rg16float',
  });

  const velocity2TextureRG16F = device.createTexture({
    size: [simWidth, simHeight],
    usage:
      GPUTextureUsage.RENDER_ATTACHMENT |
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_SRC,
    //GPUTextureUsage.COPY_SRC,
    format: 'rg16float',
  });

  const velocity3TextureRG16F = device.createTexture({
    size: [simWidth, simHeight],
    usage:
      GPUTextureUsage.RENDER_ATTACHMENT |
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_SRC,
    //GPUTextureUsage.COPY_SRC,
    format: 'rg16float',
  });

  const dye0TextureRGBA16F = device.createTexture({
    size: [simWidth, simHeight],
    usage:
      GPUTextureUsage.RENDER_ATTACHMENT |
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_SRC,
    format: 'rgba16float',
  });

  const dye1TextureRGBA16F = device.createTexture({
    size: [simWidth, simHeight],
    usage:
      GPUTextureUsage.RENDER_ATTACHMENT |
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_SRC,
    format: 'rgba16float',
  });

  const divergenceTextureR16F = device.createTexture({
    size: [simWidth, simHeight],
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    format: 'r16float',
  });

  const curlTextureR16F = device.createTexture({
    size: [simWidth, simHeight],
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    format: 'r16float',
  });

  const pressure0TextureR16F = device.createTexture({
    size: [simWidth, simHeight],
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    //GPUTextureUsage.COPY_DST,
    format: 'r16float',
  });

  const pressure1TextureR16F = device.createTexture({
    size: [simWidth, simHeight],
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    //GPUTextureUsage.COPY_DST,
    format: 'r16float',
  });

  const velocity0FromSplat: FrameBufferDescriptor = {
    width: simWidth,
    height: simHeight,
    texelSizeX: 1.0 / simWidth,
    texelSizeY: 1.0 / simHeight,
    currentTexture: velocity0TextureRG16F,
    currentView: velocity0TextureRG16F.createView(),
  };
  const velocity1FromVorticity: FrameBufferDescriptor = {
    width: simWidth,
    height: simHeight,
    texelSizeX: 1.0 / simWidth,
    texelSizeY: 1.0 / simHeight,
    currentTexture: velocity1TextureRG16F,
    currentView: velocity1TextureRG16F.createView(),
  };
  const velocity2FromGradientSubtract: FrameBufferDescriptor = {
    width: simWidth,
    height: simHeight,
    texelSizeX: 1.0 / simWidth,
    texelSizeY: 1.0 / simHeight,
    currentTexture: velocity2TextureRG16F,
    currentView: velocity2TextureRG16F.createView(),
  };
  const velocity3FromAdvection: FrameBufferDescriptor = {
    width: simWidth,
    height: simHeight,
    texelSizeX: 1.0 / simWidth,
    texelSizeY: 1.0 / simHeight,
    currentTexture: velocity3TextureRG16F,
    currentView: velocity3TextureRG16F.createView(),
  };
  const dye0FromSplat: FrameBufferDescriptor = {
    width: simWidth,
    height: simHeight,
    texelSizeX: 1.0 / simWidth,
    texelSizeY: 1.0 / simHeight,
    currentTexture: dye0TextureRGBA16F,
    currentView: dye0TextureRGBA16F.createView(),
  };
  const dye1FromAdvection: FrameBufferDescriptor = {
    width: simWidth,
    height: simHeight,
    texelSizeX: 1.0 / simWidth,
    texelSizeY: 1.0 / simHeight,
    currentTexture: dye1TextureRGBA16F,
    currentView: dye1TextureRGBA16F.createView(),
  };
  const pressure0FromClear: FrameBufferDescriptor = {
    width: simWidth,
    height: simHeight,
    texelSizeX: 1.0 / simWidth,
    texelSizeY: 1.0 / simHeight,
    currentTexture: pressure0TextureR16F,
    currentView: pressure0TextureR16F.createView(),
  };
  const pressure1FromPressure: FrameBufferDescriptor = {
    width: simWidth,
    height: simHeight,
    texelSizeX: 1.0 / simWidth,
    texelSizeY: 1.0 / simHeight,
    currentTexture: pressure1TextureR16F,
    currentView: pressure1TextureR16F.createView(),
  };
  const curl: FrameBufferDescriptor = {
    width: simWidth,
    height: simHeight,
    texelSizeX: 1.0 / simWidth,
    texelSizeY: 1.0 / simHeight,
    currentTexture: curlTextureR16F,
    currentView: curlTextureR16F.createView(),
  };
  const divergence: FrameBufferDescriptor = {
    width: simWidth,
    height: simHeight,
    texelSizeX: 1.0 / simWidth,
    texelSizeY: 1.0 / simHeight,
    currentTexture: divergenceTextureR16F,
    currentView: divergenceTextureR16F.createView(),
  };

  return {
    velocity0FromSplat,
    velocity1FromVorticity,
    velocity2FromGradientSubtract,
    velocity3FromAdvection,
    dye0FromSplat,
    dye1FromAdvection,
    pressure0FromClear,
    pressure1FromPressure,
    curl,
    divergence,
  };
};

export const getTexelDimsAsFloat32Array = (
  texelSizeX: number,
  texelSizeY: number
) => {
  return new Float32Array([texelSizeX, texelSizeY]);
};
