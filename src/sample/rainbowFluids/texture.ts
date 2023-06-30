type TextureInformationType = {
  width: number;
  height: number;
  texelSizeX: number;
  texelSizeY: number;
};

export const createNavierStokeOutputTextures = (
  device: GPUDevice,
  canvas: HTMLCanvasElement
) => {
  //Two frame buffers, one input and one output

  //Copy current dye
  const currentDyeTextureRGBA16F = device.createTexture({
    size: [canvas.width, canvas.height],
    usage:
      GPUTextureUsage.RENDER_ATTACHMENT |
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_SRC,
    format: 'rgba16float',
  });
  //Into prevDye
  const prevDyeTextureRGBA16F = device.createTexture({
    size: [canvas.width, canvas.height],
    usage:
      GPUTextureUsage.RENDER_ATTACHMENT |
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST,
    format: 'rgba16float',
  });
  //Two frame buffers, one input and one output
  //Copy currentVelocity
  const currentVelocityTextureRG16F = device.createTexture({
    size: [canvas.width, canvas.height],
    usage:
      GPUTextureUsage.RENDER_ATTACHMENT |
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_SRC,
    format: 'rg16float',
  });

  //Into prevVelocity

  const prevVelocityTextureRG16F = device.createTexture({
    size: [canvas.width, canvas.height],
    usage:
      GPUTextureUsage.RENDER_ATTACHMENT |
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST,
    format: 'rg16float',
  });

  const divergenceTextureR16F = device.createTexture({
    size: [canvas.width, canvas.height],
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    format: 'r16float',
  });

  const curlTextureR16F = device.createTexture({
    size: [canvas.width, canvas.height],
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    format: 'r16float',
  });

  //Two FrameBuffers, one input and one output
  const currentPressureTextureR16F = device.createTexture({
    size: [canvas.width, canvas.height],
    usage:
      GPUTextureUsage.RENDER_ATTACHMENT |
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_SRC,
    format: 'r16float',
  });

  const prevPressureTextureR16F = device.createTexture({
    size: [canvas.width, canvas.height],
    usage:
      GPUTextureUsage.RENDER_ATTACHMENT |
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST,
    format: 'r16float',
  });

  return {
    currentDye: {
      width: canvas.width,
      height: canvas.height,
      texelSizeX: 1.0 / canvas.width,
      texelSizeY: 1.0 / canvas.height,
      texture: currentDyeTextureRGBA16F,
    },
    prevDye: {
      width: canvas.width,
      height: canvas.height,
      texelSizeX: 1.0 / canvas.width,
      texelSizeY: 1.0 / canvas.height,
      texture: prevDyeTextureRGBA16F,
    },
    currentVelocity: {
      width: canvas.width,
      height: canvas.height,
      texelSizeX: 1.0 / canvas.width,
      texelSizeY: 1.0 / canvas.height,
      texture: currentVelocityTextureRG16F,
    },
    prevVelocity: {
      width: canvas.width,
      height: canvas.height,
      texelSizeX: 1.0 / canvas.width,
      texelSizeY: 1.0 / canvas.height,
      texture: prevVelocityTextureRG16F,
    },
    divergence: {
      width: canvas.width,
      height: canvas.height,
      texelSizeX: 1.0 / canvas.width,
      texelSizeY: 1.0 / canvas.height,
      texture: divergenceTextureR16F,
    },
    curl: {
      width: canvas.width,
      height: canvas.height,
      texelSizeX: 1.0 / canvas.width,
      texelSizeY: 1.0 / canvas.height,
      texture: curlTextureR16F,
    },
    currentPressure: {
      width: canvas.width,
      height: canvas.height,
      texelSizeX: 1.0 / canvas.width,
      texelSizeY: 1.0 / canvas.height,
      texture: currentPressureTextureR16F,
    },
    prevPressure: {
      width: canvas.width,
      height: canvas.height,
      texelSizeX: 1.0 / canvas.width,
      texelSizeY: 1.0 / canvas.height,
      texture: prevPressureTextureR16F,
    },
  };
};

export const getTexelDimsAsFloat32Array = (
  texelSizeX: number,
  texelSizeY: number
) => {
  return new Float32Array([texelSizeX, texelSizeY]);
};
