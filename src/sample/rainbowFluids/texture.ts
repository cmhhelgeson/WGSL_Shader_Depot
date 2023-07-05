/* eslint-disable prettier/prettier */
import { createBindGroupDescriptor } from "./utils";

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

  //Use these as bind group 2 for

  const currentDyeBindGroupDescriptor = createBindGroupDescriptor(
    [0],
    [GPUShaderStage.FRAGMENT],
    ['texture'],
    [{ sampleType: 'float' }],
    [
      currentDyeTextureRGBA16F.createView(),
    ],
    'CurrentDye',
    device
  );

  const prevDyeBindGroupDescriptor = createBindGroupDescriptor(
    [0],
    [GPUShaderStage.FRAGMENT],
    ['texture'],
    [{ sampleType: 'float' }],
    [
      prevDyeTextureRGBA16F.createView(),
    ],
    'CurrentDye',
    device
  );


  const output: CreateNavierStokeOutputTexturesReturns = {
    dye: {
      width: canvas.width,
      height: canvas.height,
      texelSizeX: 1.0 / canvas.width,
      texelSizeY: 1.0 / canvas.height,
      currentTexture: currentDyeTextureRGBA16F,
      currentView: currentDyeTextureRGBA16F.createView(),
      prevTexture: prevDyeTextureRGBA16F,
      prevView: prevDyeTextureRGBA16F.createView(),
    },
    velocity: {
      width: canvas.width,
      height: canvas.height,
      texelSizeX: 1.0 / canvas.width,
      texelSizeY: 1.0 / canvas.height,
      currentTexture: currentVelocityTextureRG16F,
      currentView: currentVelocityTextureRG16F.createView(),
      prevTexture: prevVelocityTextureRG16F,
      prevView: prevVelocityTextureRG16F.createView(),
    },
    divergence: {
      width: canvas.width,
      height: canvas.height,
      texelSizeX: 1.0 / canvas.width,
      texelSizeY: 1.0 / canvas.height,
      currentTexture: divergenceTextureR16F,
      currentView: divergenceTextureR16F.createView(),
    },
    curl: {
      width: canvas.width,
      height: canvas.height,
      texelSizeX: 1.0 / canvas.width,
      texelSizeY: 1.0 / canvas.height,
      currentTexture: curlTextureR16F,
      currentView: curlTextureR16F.createView(),
    },
    pressure: {
      width: canvas.width,
      height: canvas.height,
      texelSizeX: 1.0 / canvas.width,
      texelSizeY: 1.0 / canvas.height,
      currentTexture: currentPressureTextureR16F,
      currentView: currentPressureTextureR16F.createView(),
      prevTexture: prevPressureTextureR16F,
      prevView: prevPressureTextureR16F.createView(),
    },
  };

  return output;
};

export const getTexelDimsAsFloat32Array = (
  texelSizeX: number,
  texelSizeY: number
) => {
  return new Float32Array([texelSizeX, texelSizeY]);
};
