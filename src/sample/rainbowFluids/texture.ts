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
    //GPUTextureUsage.COPY_SRC,
    format: 'rgba16float',
  });
  //Into prevDye
  const prevDyeTextureRGBA16F = device.createTexture({
    size: [canvas.width, canvas.height],
    usage:
      GPUTextureUsage.RENDER_ATTACHMENT |
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST,
    //GPUTextureUsage.COPY_DST,
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
    //GPUTextureUsage.COPY_SRC,
    format: 'rg16float',
  });

  //Into prevVelocity

  const prevVelocityTextureRG16F = device.createTexture({
    size: [canvas.width, canvas.height],
    usage:
      GPUTextureUsage.RENDER_ATTACHMENT |
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST,
    //GPUTextureUsage.COPY_DST,
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
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    //GPUTextureUsage.COPY_SRC,
    format: 'r16float',
  });

  const prevPressureTextureR16F = device.createTexture({
    size: [canvas.width, canvas.height],
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    //GPUTextureUsage.COPY_DST,
    format: 'r16float',
  });

  return {
    currentDye: {
      width: canvas.width,
      height: canvas.height,
      texelSizeX: 1.0 / canvas.width,
      texelSizeY: 1.0 / canvas.height,
      texture: currentDyeTextureRGBA16F,
      view: currentDyeTextureRGBA16F.createView(),
    },
    prevDye: {
      width: canvas.width,
      height: canvas.height,
      texelSizeX: 1.0 / canvas.width,
      texelSizeY: 1.0 / canvas.height,
      texture: prevDyeTextureRGBA16F,
      view: prevDyeTextureRGBA16F.createView(),
    },
    currentVelocity: {
      width: canvas.width,
      height: canvas.height,
      texelSizeX: 1.0 / canvas.width,
      texelSizeY: 1.0 / canvas.height,
      texture: currentVelocityTextureRG16F,
      view: currentVelocityTextureRG16F.createView(),
    },
    prevVelocity: {
      width: canvas.width,
      height: canvas.height,
      texelSizeX: 1.0 / canvas.width,
      texelSizeY: 1.0 / canvas.height,
      texture: prevVelocityTextureRG16F,
      view: prevVelocityTextureRG16F.createView(),
    },
    divergence: {
      width: canvas.width,
      height: canvas.height,
      texelSizeX: 1.0 / canvas.width,
      texelSizeY: 1.0 / canvas.height,
      texture: divergenceTextureR16F,
      view: divergenceTextureR16F.createView(),
    },
    curl: {
      width: canvas.width,
      height: canvas.height,
      texelSizeX: 1.0 / canvas.width,
      texelSizeY: 1.0 / canvas.height,
      texture: curlTextureR16F,
      view: curlTextureR16F.createView(),
    },
    currentPressure: {
      width: canvas.width,
      height: canvas.height,
      texelSizeX: 1.0 / canvas.width,
      texelSizeY: 1.0 / canvas.height,
      texture: currentPressureTextureR16F,
      view: currentPressureTextureR16F.createView(),
    },
    prevPressure: {
      width: canvas.width,
      height: canvas.height,
      texelSizeX: 1.0 / canvas.width,
      texelSizeY: 1.0 / canvas.height,
      texture: prevPressureTextureR16F,
      view: prevPressureTextureR16F.createView(),
    },
  };
};

export const getTexelDimsAsFloat32Array = (
  texelSizeX: number,
  texelSizeY: number
) => {
  return new Float32Array([texelSizeX, texelSizeY]);
};
