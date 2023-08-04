import fullscreenWebGLVertShader from '../shaders/fullscreenWebGL.vert.wgsl';
import fullScreenWebGPUVertShader from '../shaders/fullscreenWebGPU.vert.wgsl';
import fullScreenNDCVertShader from '../shaders/fullscreenNDC.vert.wgsl';

export interface BaseRenderer {
  readonly renderPassDescriptor: GPURenderPassDescriptor;
  readonly pipeline: GPURenderPipeline;
  readonly bindGroupMap: Record<string, GPUBindGroup>;
  currentBindGroup: GPUBindGroup;
  currentBindGroupName: string;
}

export type RenderPipelineDescriptor = {
  pipelines: GPURenderPipeline[];
  renderDescriptors: GPURenderPassDescriptor[];
};

type FullScreenVertexShaderType = 'WEBGPU' | 'WEBGL' | 'NDC';

export const create2DRenderPipelineDescriptor = (
  vertexShaderType: FullScreenVertexShaderType,
  fragmentShader: string,
  bindGroupLayouts: GPUBindGroupLayout[],
  targetGroups: GPUTexture[][],
  label: string,
  device: GPUDevice
): RenderPipelineDescriptor => {
  const perPipelineTargetGroups = targetGroups.map((targets) => {
    const targetGroups: GPUColorTargetState[] = targets.map((target) => {
      console.log(target);
      if (target === null) {
        return { format: navigator.gpu.getPreferredCanvasFormat() };
      }
      return { format: target.format };
    });
    return targetGroups;
  });

  const pipelines = perPipelineTargetGroups.map((targets, idx) => {
    return device.createRenderPipeline({
      label: `${label}.pipeline${idx}`,
      layout: device.createPipelineLayout({
        label: `${label}.pipelineLayout${idx}`,
        bindGroupLayouts: bindGroupLayouts,
      }),
      vertex: create2DVertexModule(device, 'WEBGL'),
      fragment: {
        module: device.createShaderModule({
          code: fragmentShader,
        }),
        entryPoint: 'fragmentMain',
        targets: targets,
      },
      primitive: {
        topology: 'triangle-list',
        cullMode: 'none',
      },
    });
  });

  const renderDescriptors = targetGroups.map((targets, idx) => {
    const descriptors = targets.map((target) => {
      const colorAttachment: GPURenderPassColorAttachment = {
        view: undefined,
        clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
        loadOp: 'clear',
        storeOp: 'store',
      };
      if (target !== null) {
        colorAttachment.view = target.createView();
      }
      return colorAttachment;
    });
    const renderDescriptor: GPURenderPassDescriptor = {
      label: `${label}.colorDescriptor${idx}`,
      colorAttachments: descriptors,
    };
    return renderDescriptor;
  });

  return {
    pipelines,
    renderDescriptors,
  };
};

export const create2DVertexModule = (
  device: GPUDevice,
  uvOrder: FullScreenVertexShaderType
): GPUVertexState => {
  let vertexCode = fullScreenWebGPUVertShader;
  switch (uvOrder) {
    case 'WEBGPU':
      {
        vertexCode = fullScreenWebGPUVertShader;
      }
      break;
    case 'WEBGL':
      {
        vertexCode = fullscreenWebGLVertShader;
      }
      break;
    case 'NDC':
      {
        vertexCode = fullScreenNDCVertShader;
      }
      break;
  }
  const vertexState = {
    module: device.createShaderModule({
      code: vertexCode,
    }),
    entryPoint: 'vertexMain',
  };
  return vertexState;
};

export abstract class Base2DRendererClass {
  abstract changeDebugStep(step: number): void;
  abstract switchBindGroup(name: string): void;
  abstract startRun(commandEncoder: GPUCommandEncoder, ...args: any[]): void;

  executeRun(
    commandEncoder: GPUCommandEncoder,
    renderPassDescriptor: GPURenderPassDescriptor,
    pipeline: GPURenderPipeline,
    bindGroups: GPUBindGroup[]
  ) {
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(pipeline);
    for (let i = 0; i < bindGroups.length; i++) {
      passEncoder.setBindGroup(i, bindGroups[i]);
    }
    passEncoder.draw(6, 1, 0, 0);
    passEncoder.end();
  }
}

type DeviceInitParams = {
  device: GPUDevice;
  context: GPUCanvasContext;
  presentationFormat: GPUTextureFormat;
};

type SampleInitCallback = (params: SampleInitParams & DeviceInitParams) => void;

const SampleInitFactory = async (
  callback: SampleInitCallback,
  debugArray: string[]
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

    return debugArray;
  };
  return init;
};

let testInit: SampleInit;

SampleInitFactory(
  ({
    canvas,
    pageState,
    gui,
    debugValueRef,
    debugOnRef,
    canvasRef,
    device,
    context,
    presentationFormat,
  }) => {
    const settings = {
      lineSize: 0.2,
      lineGlow: 0.01,
      fog: 0.2,
    };

    const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [
        {
          view: undefined, // Assigned later

          clearValue: { r: 0.1, g: 0.4, b: 0.5, a: 1.0 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    };

    gui.add(settings, 'lineSize', 0.1, 1.0).step(0.1);
    gui.add(settings, 'lineGlow', 0.001, 0.1).step(0.001);
    gui.add(settings, 'fog', 0.1, 1.0).step(0.1);

    const renderer = new CyberpunkGridRenderer(
      device,
      presentationFormat,
      renderPassDescriptor,
      ['grid'],
      'CyberpunkGrid'
    );

    const debugRenderer = new CyberpunkGridRenderer(
      device,
      presentationFormat,
      renderPassDescriptor,
      ['grid'],
      'CyberpunkGrid',
      true
    );

    let lastTime = performance.now();
    let timeElapsed = 0;

    function frame() {
      // Sample is no longer the active page.
      if (!pageState.active) return;
      const currentTime = performance.now();

      timeElapsed += Math.min(1 / 60, (currentTime - lastTime) / 1000);

      lastTime = currentTime;

      renderPassDescriptor.colorAttachments[0].view = context
        .getCurrentTexture()
        .createView();

      const commandEncoder = device.createCommandEncoder();
      //console.log(canvasRef.current.width)
      if (debugOnRef.current) {
        debugRenderer.startRun(commandEncoder, {
          time: timeElapsed,
          canvasWidth: canvasRef.current.width * devicePixelRatio,
          canvasHeight: canvasRef.current.height * devicePixelRatio,
          debugStep: debugValueRef.current,
          lineSize: settings.lineSize,
          lineGlow: settings.lineGlow,
          fog: settings.fog,
        });
      } else {
        renderer.startRun(commandEncoder, {
          time: timeElapsed,
          debugStep: debugValueRef.current,
          canvasWidth: canvasRef.current.width * devicePixelRatio,
          canvasHeight: canvasRef.current.height * devicePixelRatio,
          lineSize: settings.lineSize,
          lineGlow: settings.lineGlow,
          fog: settings.fog,
        });
      }

      device.queue.submit([commandEncoder.finish()]);

      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  },
  [
    'Move your uvs into a range of -1 to 1.',
    'Invert uv.y',
    'Select uvs below the horizon line.',
    'Step four',
    'Step five',
    'step six',
    'step 7',
    'step 8',
    'step 9',
    'step 10',
    'step 11',
    'step 12',
  ]
).then((resultInit) => (testInit = resultInit));
