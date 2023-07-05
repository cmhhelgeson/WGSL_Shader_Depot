/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
import { makeSample, SampleInit } from '../../components/SampleLayout';
import { vec2, vec3 } from 'wgpu-matrix';

import baseVertexWGSL from './shaders/vertex/base.vert.wgsl';
import blurVertexWGSL from './shaders/vertex/blur.vert.wgsl';
import splatFragmentWGSL from './shaders/fragment/splat.frag.wgsl';
import debugOutputFragmentWGSL from './shaders/fragment/debugOutput.frag.wgsl';
import curlFragmentWGSL from './shaders/fragment/curl.frag.wgsl';
import advectionFragmentWGSL from './shaders/fragment/advection.frag.wgsl';
import clearFragmentWGSL from './shaders/fragment/clear.frag.wgsl';
import divergenceFragmentWGSL from './shaders/fragment/divergence.frag.wgsl';
import pressureFragmentWGSL from './shaders/fragment/pressure.frag.wgsl';
import vorticityFragmentWGSL from './shaders/fragment/vorticity.frag.wgsl';
import gradientSubtractWGSL from './shaders/fragment/gradientSubtract.frag.wgsl';
import finalDisplayFragmentWGSL from './shaders/fragment/finalDisplay.frag.wgsl';

import {
  correctRadius,
  createBindGroupDescriptor,
  defaultConfig,
  initBloomGui,
  initCaptureGui,
  initDebugGui,
  initGuiConstants,
  initSunraysGui,
  scaleByPixelRatio,
  writeToF32Buffer,
} from './utils';
import {
  updatePointerDownData,
  updatePointerMoveData,
  updatePointerUpData,
  PointerPrototype,
} from './pointer';
import {
  createNavierStokeOutputTextures,
  getTexelDimsAsFloat32Array,
  swapBuffersInDoubleFBO,
} from './texture';
import { ArrayLike } from 'wgpu-matrix/dist/1.x/array-like';
import { normalizeColor } from './color';

const standardClear: Omit<GPURenderPassColorAttachment, 'view'> = {
  clearValue: { r: 0.0, g: 0.0, b: 1.0, a: 1.0 },
  loadOp: 'clear',
  storeOp: 'store',
};

const init: SampleInit = async ({ canvas, pageState, gui }) => {
  // GET ALL DEVICE, WINDOW, ADAPTER DETAILS
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();

  device.features.entries;
  if (!pageState.active) return;
  const context = canvas.getContext('webgpu') as GPUCanvasContext;

  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

  const devicePixelRatio = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;

  context.configure({
    device,
    format: presentationFormat,
    alphaMode: 'premultiplied',
  });

  // ADD CANVAS AND WINDOW EVENT LISTENERS

  // Initialize touch or mouse contact points
  const pointers: PointerPrototype[] = [];
  pointers.push(new PointerPrototype());

  canvas.addEventListener('mousedown', (e) => {
    const posX = scaleByPixelRatio(e.offsetX);
    const posY = scaleByPixelRatio(e.offsetY);
    let pointer = pointers.find((p) => p.id == -1);
    if (pointer == null) {
      pointer = new PointerPrototype();
    }
    updatePointerDownData(pointer, -1, posX, posY, canvas.width, canvas.height);
  });

  canvas.addEventListener('mousemove', (e) => {
    const pointer = pointers[0];
    if (!pointer || !pointer.down) return;
    const posX = scaleByPixelRatio(e.offsetX);
    const posY = scaleByPixelRatio(e.offsetY);
    updatePointerMoveData(pointer, posX, posY, canvas.width, canvas.height);
  });

  window.addEventListener('mouseup', () => {
    if (!pointers[0]) return;
    updatePointerUpData(pointers[0]);
  });

  // CREATE ALL TEXTURE RESOURCES
  //rgba16float rg16float r16float
  const fluidPropertyTextures = createNavierStokeOutputTextures(device, canvas);
  console.log(fluidPropertyTextures);

  // RESOURCES USED ACROSS MULTIPLE PIPELINES / SHADERS
  const planePrimitive: GPUPrimitiveState = {
    topology: 'triangle-list',
    cullMode: 'back',
  };

  const vertexBaseUniformBuffer = device.createBuffer({
    // vec2f
    size: Float32Array.BYTES_PER_ELEMENT * 2,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const sampler = device.createSampler({
    minFilter: 'linear',
    magFilter: 'linear',
  });

  const generalBindGroupDescriptor = createBindGroupDescriptor(
    [0, 1],
    [GPUShaderStage.VERTEX, GPUShaderStage.FRAGMENT],
    ['buffer', 'sampler'],
    [{ type: 'uniform' }, { type: 'filtering' }],
    [[{ buffer: vertexBaseUniformBuffer }, sampler]],
    'General',
    device
  );

  const baseVertexShaderState: GPUVertexState = {
    module: device.createShaderModule({
      code: baseVertexWGSL,
    }),
    entryPoint: 'vertexMain',
  };

  const blurVertexShaderState: GPUVertexState = {
    module: device.createShaderModule({
      code: blurVertexWGSL,
    }),
    entryPoint: 'vertexMain',
  };

  // SPLAT SHADER OBJECTS
  const splatUniformBuffer = device.createBuffer({
    //4 element velocity color,
    //4 element dye color
    //2 element point
    //1 element aspect ratio
    //1 element radius
    size: Float32Array.BYTES_PER_ELEMENT * 12,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const splatShaderBindGroupDescriptor = createBindGroupDescriptor(
    [0, 1, 2],
    [GPUShaderStage.FRAGMENT, GPUShaderStage.FRAGMENT, GPUShaderStage.FRAGMENT],
    ['buffer', 'texture', 'texture'],
    [{ type: 'uniform' }, { sampleType: 'float' }, { sampleType: 'float' }],
    [
      [
        { buffer: splatUniformBuffer },
        fluidPropertyTextures.velocity.prevView,
        fluidPropertyTextures.velocity.prevView,
      ],
    ],
    'Splat',
    device
  );

  const splatShaderPipeline = device.createRenderPipeline({
    label: 'Splat.pipeline',
    layout: device.createPipelineLayout({
      label: 'Splat.pipelineLayout',
      bindGroupLayouts: [
        generalBindGroupDescriptor.bindGroupLayout,
        splatShaderBindGroupDescriptor.bindGroupLayout,
      ],
    }),
    vertex: baseVertexShaderState,
    fragment: {
      module: device.createShaderModule({
        code: splatFragmentWGSL,
      }),
      entryPoint: 'fragmentMain',
      targets: [
        //velocity texture
        { format: fluidPropertyTextures.velocity.currentTexture.format },
        //dye texture
        { format: fluidPropertyTextures.dye.currentTexture.format },
      ],
    },
    primitive: planePrimitive,
  });

  const splatShaderRenderDescriptor: GPURenderPassDescriptor = {
    label: 'Splat.colorDescriptor',
    colorAttachments: [
      {
        //Replace with velocity.currentView at render
        view: undefined,
        ...standardClear,
      },
      {
        //Replace with dye.currentView at render
        view: undefined,
        ...standardClear,
      },
    ],
  };

  const curlShaderBindGroupDescriptor = createBindGroupDescriptor(
    [0],
    [GPUShaderStage.FRAGMENT],
    ['texture'],
    [{ sampleType: 'float' }],
    [
      [
        fluidPropertyTextures.velocity.prevView
      ]
    ],
    'Curl',
    device
  );

  const curlShaderPipeline = device.createRenderPipeline({
    label: 'Curl.pipeline',
    layout: device.createPipelineLayout({
      bindGroupLayouts: [
        generalBindGroupDescriptor.bindGroupLayout,
        curlShaderBindGroupDescriptor.bindGroupLayout,
      ],
    }),
    vertex: baseVertexShaderState,
    fragment: {
      module: device.createShaderModule({
        code: curlFragmentWGSL,
      }),
      entryPoint: 'fragmentMain',
      targets: [
        //velocity texture
        { format: fluidPropertyTextures.curl.currentTexture.format },
      ],
    },
    primitive: planePrimitive,
  });

  const curlShaderRenderDescriptor: GPURenderPassDescriptor = {
    label: 'Curl.renderDescriptor',
    colorAttachments: [
      {
        view: fluidPropertyTextures.curl.currentView,
        ...standardClear,
      },
    ],
  };

  const vorticityUniformBuffer = device.createBuffer({
    size: Float32Array.BYTES_PER_ELEMENT * 2,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const vorticityShaderBindGroupDescriptor = createBindGroupDescriptor(
    [0, 1, 2],
    [GPUShaderStage.FRAGMENT],
    ['buffer', 'texture', 'texture'],
    [{ type: 'uniform' }, { sampleType: 'float' }, { sampleType: 'float' }],
    [
      [
        { buffer: vorticityUniformBuffer },
        fluidPropertyTextures.velocity.prevView,
        fluidPropertyTextures.curl.currentView,
      ]
    ],
    'Vorticity',
    device
  );

  const vorticityShaderPipeline = device.createRenderPipeline({
    label: 'Vorticity.pipeline',
    layout: device.createPipelineLayout({
      bindGroupLayouts: [
        generalBindGroupDescriptor.bindGroupLayout,
        vorticityShaderBindGroupDescriptor.bindGroupLayout,
      ],
    }),
    vertex: baseVertexShaderState,
    fragment: {
      module: device.createShaderModule({
        code: vorticityFragmentWGSL,
      }),
      entryPoint: 'fragmentMain',
      targets: [
        //velocity texture
        { format: fluidPropertyTextures.velocity.currentTexture.format },
      ],
    },
    primitive: planePrimitive,
  });

  swapBuffersInDoubleFBO(fluidPropertyTextures.velocity);

  const vorticityShaderRenderDescriptor: GPURenderPassDescriptor = {
    label: 'Vorticity.renderDescriptor',
    colorAttachments: [
      {
        //Replace with velocity.currentView at render
        view: undefined,
        ...standardClear,
      },
    ],
  };

  //
  const divergenceShaderBindGroupDescriptor = createBindGroupDescriptor(
    [0],
    [GPUShaderStage.FRAGMENT],
    ['texture'],
    [{ sampleType: 'float' }],
    [
      [
        fluidPropertyTextures.velocity.prevView
      ]
    ],
    'Curl',
    device
  );

  const divergenceShaderPipeline = device.createRenderPipeline({
    label: 'Divergence.pipeline',
    layout: device.createPipelineLayout({
      bindGroupLayouts: [
        generalBindGroupDescriptor.bindGroupLayout,
        divergenceShaderBindGroupDescriptor.bindGroupLayout,
      ],
    }),
    vertex: baseVertexShaderState,
    fragment: {
      module: device.createShaderModule({
        code: divergenceFragmentWGSL,
      }),
      entryPoint: 'fragmentMain',
      targets: [
        //velocity texture
        { format: fluidPropertyTextures.divergence.currentTexture.format },
      ],
    },
    primitive: planePrimitive,
  });

  const divergenceShaderRenderDescriptor: GPURenderPassDescriptor = {
    label: 'Divergence.renderDescriptor',
    colorAttachments: [
      {
        view: fluidPropertyTextures.divergence.currentView,
        ...standardClear,
      },
    ],
  };

  const clearUniformBuffer = device.createBuffer({
    size: Float32Array.BYTES_PER_ELEMENT * 1,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const clearShaderBindGroupDescriptor = createBindGroupDescriptor(
    [0, 1],
    [GPUShaderStage.FRAGMENT],
    ['buffer', 'texture'],
    [{ type: 'uniform' }, { sampleType: 'float' }],
    [
      [
        { buffer: clearUniformBuffer }, fluidPropertyTextures.pressure.prevView
      ],
    ],
    'Clear',
    device
  );

  device.createBindGroup;

  const clearShaderPipeline = device.createRenderPipeline({
    label: 'Clear.pipeline',
    layout: device.createPipelineLayout({
      bindGroupLayouts: [
        generalBindGroupDescriptor.bindGroupLayout,
        clearShaderBindGroupDescriptor.bindGroupLayout,
      ],
    }),
    vertex: blurVertexShaderState,
    fragment: {
      module: device.createShaderModule({
        code: clearFragmentWGSL,
      }),
      entryPoint: 'fragmentMain',
      targets: [
        //velocity texture
        { format: fluidPropertyTextures.pressure.currentTexture.format },
      ],
    },
    primitive: planePrimitive,
  });

  const clearShaderRenderDescriptor: GPURenderPassDescriptor = {
    label: 'Clear.renderDescriptor',
    colorAttachments: [
      {
        view: fluidPropertyTextures.pressure.currentView,
        ...standardClear,
      },
    ],
  };

  swapBuffersInDoubleFBO(fluidPropertyTextures.pressure);

  const pressureShaderBindGroupDescriptor = createBindGroupDescriptor(
    [0, 1],
    [GPUShaderStage.FRAGMENT],
    ['texture', 'texture'],
    [{ sampleType: 'float' }, { sampleType: 'float' }],
    [
      [
        fluidPropertyTextures.divergence.currentView,
        fluidPropertyTextures.pressure.prevView,
      ]
    ],
    'Pressure',
    device
  );

  const pressureShaderPipeline = device.createRenderPipeline({
    label: 'Pressure.pipeline',
    layout: device.createPipelineLayout({
      bindGroupLayouts: [
        generalBindGroupDescriptor.bindGroupLayout,
        pressureShaderBindGroupDescriptor.bindGroupLayout,
      ],
    }),
    vertex: baseVertexShaderState,
    fragment: {
      module: device.createShaderModule({
        code: pressureFragmentWGSL,
      }),
      entryPoint: 'fragmentMain',
      targets: [
        //velocity texture
        { format: fluidPropertyTextures.pressure.currentTexture.format },
      ],
    },
    primitive: planePrimitive,
  });

  const pressureShaderRenderDescriptor: GPURenderPassDescriptor = {
    label: 'Pressure.renderDescriptor',
    colorAttachments: [
      {
        //Define at render time as currentPressure
        view: fluidPropertyTextures.pressure.currentView,
        ...standardClear,
      },
    ],
  };

  const gradientSubtractShaderBindGroupDescriptor = createBindGroupDescriptor(
    [0, 1],
    [GPUShaderStage.FRAGMENT],
    ['texture', 'texture'],
    [{ sampleType: 'float' }, { sampleType: 'float' }],
    [
      [
        fluidPropertyTextures.pressure.prevView,
        fluidPropertyTextures.velocity.prevView,
      ]
    ],
    'GradientSubtract',
    device
  );

  const gradientSubtractShaderPipeline = device.createRenderPipeline({
    label: 'GradientSubtract.pipeline',
    layout: device.createPipelineLayout({
      bindGroupLayouts: [
        generalBindGroupDescriptor.bindGroupLayout,
        gradientSubtractShaderBindGroupDescriptor.bindGroupLayout,
      ],
    }),
    vertex: baseVertexShaderState,
    fragment: {
      module: device.createShaderModule({
        code: gradientSubtractWGSL,
      }),
      entryPoint: 'fragmentMain',
      targets: [
        //velocity texture
        { format: fluidPropertyTextures.velocity.currentTexture.format },
      ],
    },
    primitive: planePrimitive,
  });

  const gradientSubtractRenderDescriptor: GPURenderPassDescriptor = {
    label: 'GradientSubtract.renderDescriptor',
    colorAttachments: [
      {
        view: fluidPropertyTextures.velocity.currentView,
        ...standardClear,
      },
    ],
  };

  const advectionUniformBuffer = device.createBuffer({
    size: Float32Array.BYTES_PER_ELEMENT * 6,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const advectionShaderBindGroupDescriptor = createBindGroupDescriptor(
    [0, 1, 2],
    [GPUShaderStage.FRAGMENT],
    ['buffer', 'texture', 'texture'],
    [{ type: 'uniform' }, { sampleType: 'float' }, { sampleType: 'float' }],
    [
      [
        { buffer: advectionUniformBuffer },
        fluidPropertyTextures.velocity.prevView,
        fluidPropertyTextures.velocity.prevView,
      ],
      [
        {buffer: advectionUniformBuffer},
        fluidPropertyTextures.velocity.prevView, 
        fluidPropertyTextures.dye.prevView,
      ]
    ],
    'Advection',
    device
  );

  const advectionShaderPipelineOne = device.createRenderPipeline({
    label: 'Advection.pipelineOne',
    layout: device.createPipelineLayout({
      bindGroupLayouts: [
        generalBindGroupDescriptor.bindGroupLayout,
        advectionShaderBindGroupDescriptor.bindGroupLayout,
      ],
    }),
    vertex: baseVertexShaderState,
    fragment: {
      module: device.createShaderModule({
        code: advectionFragmentWGSL,
      }),
      entryPoint: 'fragmentMain',
      targets: [
        //velocity texture
        { format: fluidPropertyTextures.velocity.currentTexture.format },
      ],
    },
    primitive: planePrimitive,
  });

  const advectionShaderPipelineTwo = device.createRenderPipeline({
    label: 'Advection.pipelineTwo',
    layout: device.createPipelineLayout({
      bindGroupLayouts: [
        generalBindGroupDescriptor.bindGroupLayout,
        advectionShaderBindGroupDescriptor.bindGroupLayout,
      ],
    }),
    vertex: baseVertexShaderState,
    fragment: {
      module: device.createShaderModule({
        code: advectionFragmentWGSL,
      }),
      entryPoint: 'fragmentMain',
      targets: [
        //velocity texture
        { format: fluidPropertyTextures.dye.currentTexture.format },
      ],
    },
    primitive: planePrimitive,
  });

  const advectionShaderRenderDescriptorOne: GPURenderPassDescriptor = {
    label: 'Advection.renderDescriptorOne',
    colorAttachments: [
      {
        view: fluidPropertyTextures.velocity.currentView,
        ...standardClear,
      },
    ],
  };

  const advectionShaderRenderAttachmentsTwo: GPURenderPassDescriptor = {
    label: 'Advection.renderDescriptorTwo',
    colorAttachments: [
      {
        view: fluidPropertyTextures.dye.currentView,
        ...standardClear,
      },
    ],
  };

  const finalDisplayBindGroupDescriptor = createBindGroupDescriptor(
    [0],
    [GPUShaderStage.FRAGMENT],
    ['texture'],
    [{ sampleType: 'float' }],
    [[fluidPropertyTextures.dye.currentView]],
    'Final',
    device
  );

  const finalDisplayPipeline = device.createRenderPipeline({
    label: 'Final.pipeline',
    layout: device.createPipelineLayout({
      bindGroupLayouts: [
        generalBindGroupDescriptor.bindGroupLayout,
        finalDisplayBindGroupDescriptor.bindGroupLayout,
      ],
    }),
    vertex: baseVertexShaderState,
    fragment: {
      module: device.createShaderModule({
        code: finalDisplayFragmentWGSL,
      }),
      entryPoint: 'fragmentMain',
      targets: [
        {
          format: presentationFormat,
        },
      ],
    },
    primitive: planePrimitive,
  });

  const finalDisplayRenderDescriptor: GPURenderPassDescriptor = {
    label: 'Final.renderDescriptor',
    colorAttachments: [
      {
        view: undefined,
        ...standardClear,
      },
    ],
  };

  const debugOutputBindGroupDescriptor = createBindGroupDescriptor(
    [0],
    [GPUShaderStage.FRAGMENT],
    ['texture'],
    [{ sampleType: 'float' }],
    [[fluidPropertyTextures.velocity.currentView]],
    'DebugOutput',
    device
  );

  const debugOutputShaderPipeline = device.createRenderPipeline({
    //@group(0) //@group(1)
    label: 'DebugOutput.pipeline',
    layout: device.createPipelineLayout({
      bindGroupLayouts: [
        generalBindGroupDescriptor.bindGroupLayout,
        debugOutputBindGroupDescriptor.bindGroupLayout,
      ],
    }),
    vertex: {
      module: device.createShaderModule({
        code: baseVertexWGSL,
      }),
      entryPoint: 'vertexMain',
    },
    fragment: {
      module: device.createShaderModule({
        code: debugOutputFragmentWGSL,
      }),
      entryPoint: 'fragmentMain',
      targets: [
        //velocity texture
        { format: presentationFormat },
      ],
    },
    primitive: planePrimitive,
  });

  const debugOutputRenderDescriptor: GPURenderPassDescriptor = {
    label: 'DebugOutput.renderDescriptor',
    colorAttachments: [
      {
        view: undefined,
        ...standardClear,
      },
    ],
  };

  const writeSplatUniforms = (
    //vec3s
    velocity_color: ArrayLike,
    dye_color: ArrayLike,
    //vec2s
    _point: ArrayLike,
    //float32s
    aspect_ratio: number,
    radius: number,
    offset = 0 //Will consider for 256 byte alligned loops later
  ) => {
    const rest = new Float32Array([aspect_ratio, radius]);
    writeToF32Buffer(
      [velocity_color, dye_color, _point],
      rest,
      splatUniformBuffer,
      device
    );
  };

  const writeVorticityUniforms = (curl: number, dt: number) => {
    const arr = new Float32Array([curl, dt]);
    device.queue.writeBuffer(
      vorticityUniformBuffer,
      0,
      arr.buffer,
      arr.byteOffset,
      arr.byteLength
    );
  };

  const writeClearUniforms = (pressure: number) => {
    const arr = new Float32Array([pressure]);
    device.queue.writeBuffer(
      clearUniformBuffer,
      0,
      arr.buffer,
      arr.byteOffset,
      arr.byteLength
    );
  };

  const writeAdvectionUniforms = (
    texel_size: ArrayLike,
    dye_texel_size: ArrayLike,
    dt: number,
    dissipation: number
  ) => {
    const arr = new Float32Array([dt, dissipation]);
    writeToF32Buffer(
      [texel_size, dye_texel_size],
      arr,
      advectionUniformBuffer,
      device
    );
  };

  //let splatStack = [];

  const config = defaultConfig;
  initGuiConstants(gui, config);
  initBloomGui(gui, config, () => console.log('test'));
  initSunraysGui(gui, config, () => console.log('test'));
  initCaptureGui(gui, config);
  initDebugGui(gui, config);

  //Will need to perform copy texture to texture for

  function frame() {
    // Sample is no longer the active page.
    if (!pageState.active) return;

    //Look to canvasChange in webgpu-samples for dealing with change in height

    const commandEncoder = device.createCommandEncoder();
    {
      // SPLAT SHADER
      const velocityTexelDims = getTexelDimsAsFloat32Array(
        fluidPropertyTextures.velocity.texelSizeX,
        fluidPropertyTextures.velocity.texelSizeY
      );

      //Get texel dimensions of sim texture
      device.queue.writeBuffer(
        vertexBaseUniformBuffer,
        0,
        velocityTexelDims.buffer,
        velocityTexelDims.byteOffset,
        velocityTexelDims.byteLength
      );

      //On desktop should only run once
      pointers.forEach((pointer, idx) => {
        if (pointer.moved) {
          pointer.moved = false;
          const dx = pointer.deltaX * config.SPLAT_FORCE;
          const dy = pointer.deltaY * config.SPLAT_FORCE;
          const textureAspectRatio =
            fluidPropertyTextures.velocity.width /
            fluidPropertyTextures.velocity.height;
          writeSplatUniforms(
            //velocity_color (velocity as a color)
            vec3.fromValues(dx, dy, 0.0),
            vec3.fromValues(
              pointer.color[0],
              pointer.color[1],
              pointer.color[2]
            ),
            vec2.fromValues(pointer.texcoordX, pointer.texcoordY),
            textureAspectRatio,
            correctRadius(config.SPLAT_RADIUS / 100.0, textureAspectRatio),
            idx
          );
        }
      });

      const splatPassEncoder = commandEncoder.beginRenderPass(
        splatShaderRenderDescriptor
      );
      splatPassEncoder.setPipeline(splatShaderPipeline);
      splatPassEncoder.setBindGroup(0, generalBindGroupDescriptor.bindGroups[0]);
      splatPassEncoder.setBindGroup(
        1,
        splatShaderBindGroupDescriptor.bindGroups[0]
      );
      splatPassEncoder.draw(6, 1, 0, 0);

      splatPassEncoder.end();
    }
    //Make sure to do something with config.clearValue within the colorAttachments of your final o
    {
      debugOutputRenderDescriptor.colorAttachments[0].view = context
        .getCurrentTexture()
        .createView();
      //debugOutputRenderDescriptor.colorAttachments[0].clearValue = normalizeColor(config.BACK_COLOR);
      const debugOutputPassEncoder = commandEncoder.beginRenderPass(
        debugOutputRenderDescriptor
      );
      debugOutputPassEncoder.setPipeline(debugOutputShaderPipeline);
      debugOutputPassEncoder.setBindGroup(
        0,
        generalBindGroupDescriptor.bindGroups[0]
      );
      debugOutputPassEncoder.setBindGroup(
        1,
        debugOutputBindGroupDescriptor.bindGroups[0]
      );
      debugOutputPassEncoder.draw(6, 1, 0, 0);
      debugOutputPassEncoder.end();
    }

    commandEncoder.copyTextureToTexture;

    device.queue.submit([commandEncoder.finish()]);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
};

const RainbowFluids: () => JSX.Element = () =>
  makeSample({
    name: 'Rainbow Fluids',
    description: 'Incompressible Navier-Stokes Fluid Simulation in WebGPU.',
    init,
    gui: true,
    sources: [
      {
        name: __filename.substring(__dirname.length + 1),
        contents: __SOURCE__,
      },
    ],
    filename: __filename,
  });

export default RainbowFluids;
