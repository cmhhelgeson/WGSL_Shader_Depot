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
  calculateDeltaTime,
  correctRadius,
  create2DRenderPipelineDescriptor,
  createBindGroupDescriptor,
  defaultConfig,
  getResolution,
  initDebugGui,
  initGuiConstants,
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
  FrameBufferDescriptor,
  getTexelDimsAsFloat32Array,
} from './texture';
import { ArrayLike } from 'wgpu-matrix/dist/1.x/array-like';
import { createUniformDescriptor } from '../uniform';

const standardClear: Omit<GPURenderPassColorAttachment, 'view'> = {
  clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
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


  //Create GUI
  const config = defaultConfig;
  initGuiConstants(gui, config);
  initDebugGui(gui, config);

  // CREATE ALL TEXTURE RESOURCES
  //rgba16float rg16float r16float
  const simDimensions = getResolution(canvas.width, canvas.height, config.SIM_RESOLUTION);
  const dyeDimensions = getResolution(canvas.width, canvas.height, config.DYE_RESOLUTION);
  const fluidPropertyTextures = createNavierStokeOutputTextures(
    simDimensions.width,
    simDimensions.height,
    dyeDimensions.width,
    dyeDimensions.height,
    device
  );

  // RESOURCES USED ACROSS MULTIPLE PIPELINES / SHADERS
  const planePrimitive: GPUPrimitiveState = {
    topology: 'triangle-list',
    cullMode: 'none',
  };

  const vertexBaseUniformBuffer = device.createBuffer({
    // vec2f
    size: Float32Array.BYTES_PER_ELEMENT * 2,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const canvasTexelBaseUniformBuffer = device.createBuffer({
    size: Float32Array.BYTES_PER_ELEMENT * 2,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  })

  const sampler = device.createSampler({
    minFilter: 'linear',
    magFilter: 'linear',
  });


  const generalBindGroupDescriptor = createBindGroupDescriptor(
    [0, 1],
    [GPUShaderStage.VERTEX, GPUShaderStage.FRAGMENT],
    ['buffer', 'sampler'],
    [{ type: 'uniform' }, { type: 'filtering' }],
    [
      [{ buffer: vertexBaseUniformBuffer }, sampler],
      [{buffer: canvasTexelBaseUniformBuffer}, sampler]
    ],
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
    [0, 1],
    [GPUShaderStage.FRAGMENT],
    ['buffer', 'texture'],
    [{ type: 'uniform' }, { sampleType: 'float' }],
    [
      [
        { buffer: splatUniformBuffer },
        fluidPropertyTextures.velocity3FromAdvection.currentView,
      ],
      [
        {buffer: splatUniformBuffer},
        fluidPropertyTextures.dye1FromAdvection.currentView,
      ]
    ],
    'Splat',
    device
  );

  const splatPipelineDescriptor = create2DRenderPipelineDescriptor(
    splatFragmentWGSL,
    [generalBindGroupDescriptor.bindGroupLayout, splatShaderBindGroupDescriptor.bindGroupLayout],
    [
      [fluidPropertyTextures.velocity0FromSplat], 
      [fluidPropertyTextures.dye0FromSplat]
    ],
    'Splat',
    device,
  )
  console.log(splatShaderBindGroupDescriptor);
  console.log(splatPipelineDescriptor)


  const curlShaderBindGroupDescriptor = createBindGroupDescriptor(
    [0],
    [GPUShaderStage.FRAGMENT],
    ['texture'],
    [{ sampleType: 'float' }],
    [
      [
        fluidPropertyTextures.velocity0FromSplat.currentView
      ]
    ],
    'Curl',
    device
  );

  const curlPipelineDescriptor = create2DRenderPipelineDescriptor(
    curlFragmentWGSL,
    [generalBindGroupDescriptor.bindGroupLayout, curlShaderBindGroupDescriptor.bindGroupLayout],
    [[fluidPropertyTextures.curl]],
    'Curl',
    device,
  )

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
        fluidPropertyTextures.velocity0FromSplat.currentView,
        fluidPropertyTextures.curl.currentView,
      ]
    ],
    'Vorticity',
    device
  );

  const vorticityPipelineDescriptor = create2DRenderPipelineDescriptor(
    vorticityFragmentWGSL,
    [generalBindGroupDescriptor.bindGroupLayout, vorticityShaderBindGroupDescriptor.bindGroupLayout],
    [[fluidPropertyTextures.velocity1FromVorticity]],
    'Vorticity',
    device,
  )

  //
  const divergenceShaderBindGroupDescriptor = createBindGroupDescriptor(
    [0],
    [GPUShaderStage.FRAGMENT],
    ['texture'],
    [{ sampleType: 'float' }],
    [
      [
        fluidPropertyTextures.velocity1FromVorticity.currentView
      ]
    ],
    'Curl',
    device
  );

  const divergencePipelineDescriptor = create2DRenderPipelineDescriptor(
    divergenceFragmentWGSL,
    [generalBindGroupDescriptor.bindGroupLayout, divergenceShaderBindGroupDescriptor.bindGroupLayout],
    [[fluidPropertyTextures.divergence]],
    'Divergence',
    device,
  );

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
        { buffer: clearUniformBuffer }, fluidPropertyTextures.pressure1FromPressure.currentView
      ],
    ],
    'Clear',
    device
  );

  const clearPipelineDescriptor = create2DRenderPipelineDescriptor(
    clearFragmentWGSL,
    [generalBindGroupDescriptor.bindGroupLayout, clearShaderBindGroupDescriptor.bindGroupLayout],
    [[fluidPropertyTextures.pressure0FromClear]],
    'Clear',
    device,
  )


  const pressureShaderBindGroupDescriptor = createBindGroupDescriptor(
    [0, 1],
    [GPUShaderStage.FRAGMENT],
    ['texture', 'texture'],
    [{ sampleType: 'float' }, { sampleType: 'float' }],
    [
      [
        fluidPropertyTextures.divergence.currentView,
        fluidPropertyTextures.pressure0FromClear.currentView,
      ],
      [
        fluidPropertyTextures.divergence.currentView,
        fluidPropertyTextures.pressure1FromPressure.currentView,
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
        { format: fluidPropertyTextures.pressure1FromPressure.currentTexture.format },
      ],
    },
    primitive: planePrimitive,
  });

  const pressureShaderRenderDescriptorWriteToOne: GPURenderPassDescriptor = {
    label: 'Pressure.renderDescriptor',
    colorAttachments: [
      {
        //Define at render time as currentPressure
        view: fluidPropertyTextures.pressure1FromPressure.currentView,
        ...standardClear,
      },
    ],
  };

  const pressureShaderRenderDescriptorWriteToZero: GPURenderPassDescriptor = {
    label: 'Pressure.renderDescriptor',
    colorAttachments: [
      {
        //Define at render time as currentPressure
        view: fluidPropertyTextures.pressure0FromClear.currentView,
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
        fluidPropertyTextures.velocity1FromVorticity.currentView,
        fluidPropertyTextures.pressure1FromPressure.currentView,
      ]
    ],
    'GradientSubtract',
    device
  );

  const gradientSubtractPipelineDescriptor = create2DRenderPipelineDescriptor(
    gradientSubtractWGSL,
    [generalBindGroupDescriptor.bindGroupLayout, gradientSubtractShaderBindGroupDescriptor.bindGroupLayout],
    [[fluidPropertyTextures.velocity2FromGradientSubtract]],
    'GradientSubtract',
    device,
  )

  const advectionUniformBufferOne = device.createBuffer({
    size: Float32Array.BYTES_PER_ELEMENT * 6,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const advectionUniformBufferTwo = device.createBuffer({
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
        { buffer: advectionUniformBufferOne },
        fluidPropertyTextures.velocity2FromGradientSubtract.currentView,
        fluidPropertyTextures.velocity2FromGradientSubtract.currentView,
      ],
      [
        {buffer: advectionUniformBufferTwo},
        fluidPropertyTextures.velocity3FromAdvection.currentView, 
        fluidPropertyTextures.dye0FromSplat.currentView,
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
        { format: fluidPropertyTextures.velocity3FromAdvection.currentTexture.format },
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
        { format: fluidPropertyTextures.dye1FromAdvection.currentTexture.format },
      ],
    },
    primitive: planePrimitive,
  });

  const advectionShaderRenderDescriptorOne: GPURenderPassDescriptor = {
    label: 'Advection.renderDescriptorOne',
    colorAttachments: [
      {
        view: fluidPropertyTextures.velocity3FromAdvection.currentView,
        ...standardClear,
      },
    ],
  };

  const advectionShaderRenderDescriptorTwo: GPURenderPassDescriptor = {
    label: 'Advection.renderDescriptorTwo',
    colorAttachments: [
      {
        view: fluidPropertyTextures.dye1FromAdvection.currentView,
        ...standardClear,
      },
    ],
  };

  const finalDisplayBindGroupDescriptor = createBindGroupDescriptor(
    [0],
    [GPUShaderStage.FRAGMENT],
    ['texture'],
    [{ sampleType: 'float' }],
    [[fluidPropertyTextures.dye1FromAdvection.currentView]],
    'Final',
    device
  );

  const canvasDisplayFbo: FrameBufferDescriptor = {
    width: canvas.width,
    height: canvas.height,
    texelSizeX: 1.0 / canvas.width,
    texelSizeY: 1.0 / canvas.height,
    currentTexture: context.getCurrentTexture(),
    currentView: context.getCurrentTexture().createView()
  }

  const finalDisplayPipelineDescriptor = create2DRenderPipelineDescriptor(
    finalDisplayFragmentWGSL,
    [
      generalBindGroupDescriptor.bindGroupLayout,
      finalDisplayBindGroupDescriptor.bindGroupLayout,
    ],
    [[canvasDisplayFbo]],
    'Final',
    device
  )

  const debugOutputBindGroupDescriptor = createBindGroupDescriptor(
    [0],
    [GPUShaderStage.FRAGMENT],
    ['texture'],
    [{ sampleType: 'float' }],
    [
      //Velocities, dyes, pressures, curls, divergence
      [fluidPropertyTextures.velocity0FromSplat.currentView],
      [fluidPropertyTextures.velocity1FromVorticity.currentView],
      [fluidPropertyTextures.velocity2FromGradientSubtract.currentView],
      [fluidPropertyTextures.velocity3FromAdvection.currentView],
      [fluidPropertyTextures.dye0FromSplat.currentView],
      [fluidPropertyTextures.dye1FromAdvection.currentView],
      [fluidPropertyTextures.pressure0FromClear.currentView],
      [fluidPropertyTextures.pressure1FromPressure.currentView],
      [fluidPropertyTextures.curl.currentView],
      [fluidPropertyTextures.divergence.currentView],
    ],
    'DebugOutput',
    device
  );

  const debugOutputPipelineDescriptor = create2DRenderPipelineDescriptor(
    debugOutputFragmentWGSL,
    [
      generalBindGroupDescriptor.bindGroupLayout,
      debugOutputBindGroupDescriptor.bindGroupLayout,
    ],
    [[canvasDisplayFbo]],
    'DebugOutput',
    device
  );

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

  const writeAdvectionUniformsOne = (
    texel_size: ArrayLike,
    dye_texel_size: ArrayLike,
    dt: number,
    dissipation: number
  ) => {
    const arr = new Float32Array([dt, dissipation]);
    writeToF32Buffer(
      [texel_size, dye_texel_size],
      arr,
      advectionUniformBufferOne,
      device
    );
  };

  const writeAdvectionUniformsTwo = (
    texel_size: ArrayLike,
    dye_texel_size: ArrayLike,
    dt: number,
    dissipation: number
  ) => {
    const arr = new Float32Array([dt, dissipation]);
    writeToF32Buffer(
      [texel_size, dye_texel_size],
      arr,
      advectionUniformBufferTwo,
      device
    );
  };

  //let splatStack = [];
  const velocityTexelDims = getTexelDimsAsFloat32Array(
    fluidPropertyTextures.velocity0FromSplat.texelSizeX,
    fluidPropertyTextures.velocity0FromSplat.texelSizeY
  );

  //Get texel dimensions of sim texture
  device.queue.writeBuffer(
    vertexBaseUniformBuffer,
    0,
    velocityTexelDims.buffer,
    velocityTexelDims.byteOffset,
    velocityTexelDims.byteLength
  );

  const canvasTexelDims = new Float32Array([1.0 / canvas.width, 1.0 / canvas.height]);
  device.queue.writeBuffer(
    canvasTexelBaseUniformBuffer,
    0,
    canvasTexelDims.buffer,
    canvasTexelDims.byteOffset,
    canvasTexelDims.byteLength
  );

  //Will need to perform copy texture to texture for

  let lastUpdateTime = Date.now();
  let dt = Date.now();

  function frame() {
    // Sample is no longer the active page.
    if (!pageState.active) return;

    //Look to canvasChange in webgpu-samples for dealing with change in height
    // SPLAT SHADER
    
    //On desktop should only run once
    pointers.forEach((pointer, idx) => {
      if (pointer.moved) {
        pointer.moved = false;
        const dx = pointer.deltaX * config.SPLAT_FORCE;
        const dy = pointer.deltaY * config.SPLAT_FORCE;
        const aspectRatio = canvas.width / canvas.height;
        writeSplatUniforms(
          //velocity_color (velocity as a color)
          vec3.fromValues(dx, dy, 0.0),
          vec3.fromValues(
            pointer.color[0],
            pointer.color[1],
            pointer.color[2]
          ),
          vec2.fromValues(pointer.texcoordX, pointer.texcoordY),
          aspectRatio,
          correctRadius(config.SPLAT_RADIUS / 100.0, aspectRatio),
          idx
        );
      }
    });
    
    [dt, lastUpdateTime] = calculateDeltaTime(lastUpdateTime);
    writeVorticityUniforms(config.CURL, dt);
    writeClearUniforms(config.PRESSURE);
    writeAdvectionUniformsOne(
      vec2.fromValues(
        fluidPropertyTextures.velocity2FromGradientSubtract.texelSizeX,
        fluidPropertyTextures.velocity2FromGradientSubtract.texelSizeY,
      ),
      vec2.fromValues(
        fluidPropertyTextures.velocity2FromGradientSubtract.texelSizeX,
        fluidPropertyTextures.velocity2FromGradientSubtract.texelSizeY,
      ),
      dt,
      config.VELOCITY_DISSIPATION,
    );
    writeAdvectionUniformsTwo(
      vec2.fromValues(
        fluidPropertyTextures.velocity2FromGradientSubtract.texelSizeX,
        fluidPropertyTextures.velocity2FromGradientSubtract.texelSizeY,
      ),
      vec2.fromValues(
        fluidPropertyTextures.dye0FromSplat.texelSizeX,
        fluidPropertyTextures.dye0FromSplat.texelSizeY,
      ),
      dt,
      config.DENSITY_DISSIPATION,
    );

    const commandEncoder = device.createCommandEncoder();
    {
      const splatPassEncoder = commandEncoder.beginRenderPass(
        splatPipelineDescriptor.renderDescriptors[0]
      );
      splatPassEncoder.setPipeline(splatPipelineDescriptor.pipelines[0]);
      splatPassEncoder.setBindGroup(0, generalBindGroupDescriptor.bindGroups[0]);
      splatPassEncoder.setBindGroup(
        1,
        splatShaderBindGroupDescriptor.bindGroups[0]
      );
      splatPassEncoder.draw(6, 1, 0, 0);

      splatPassEncoder.end();
    }
    {
      const splatPassEncoder = commandEncoder.beginRenderPass(
        splatPipelineDescriptor.renderDescriptors[1]
      );
      splatPassEncoder.setPipeline(splatPipelineDescriptor.pipelines[1]);
      splatPassEncoder.setBindGroup(0, generalBindGroupDescriptor.bindGroups[0]);
      splatPassEncoder.setBindGroup(
        1,
        splatShaderBindGroupDescriptor.bindGroups[1]
      );
      splatPassEncoder.draw(6, 1, 0, 0);

      splatPassEncoder.end();

    }
    {
      const curlPassEncoder = commandEncoder.beginRenderPass(
        curlPipelineDescriptor.renderDescriptors[0]
      );
      curlPassEncoder.setPipeline(curlPipelineDescriptor.pipelines[0]);
      curlPassEncoder.setBindGroup(0, generalBindGroupDescriptor.bindGroups[0]);
      curlPassEncoder.setBindGroup(1, curlShaderBindGroupDescriptor.bindGroups[0]);
      curlPassEncoder.draw(6, 1, 0, 0);
      curlPassEncoder.end();
    }
    {
      const vorticityPassEncoder = commandEncoder.beginRenderPass(
        vorticityPipelineDescriptor.renderDescriptors[0]
      );
      vorticityPassEncoder.setPipeline(vorticityPipelineDescriptor.pipelines[0]);
      vorticityPassEncoder.setBindGroup(0, generalBindGroupDescriptor.bindGroups[0]);
      vorticityPassEncoder.setBindGroup(1, vorticityShaderBindGroupDescriptor.bindGroups[0]);
      vorticityPassEncoder.draw(6, 1, 0, 0);
      vorticityPassEncoder.end();
    }
    {
      const divergencePassEncoder = commandEncoder.beginRenderPass(
        divergencePipelineDescriptor.renderDescriptors[0]
      );
      divergencePassEncoder.setPipeline(divergencePipelineDescriptor.pipelines[0]);
      divergencePassEncoder.setBindGroup(0, generalBindGroupDescriptor.bindGroups[0]);
      divergencePassEncoder.setBindGroup(1, divergenceShaderBindGroupDescriptor.bindGroups[0]);
      divergencePassEncoder.draw(6, 1, 0, 0);
      divergencePassEncoder.end();
    }
    {
      const clearPassEncoder = commandEncoder.beginRenderPass(
        clearPipelineDescriptor.renderDescriptors[0]
      );
      clearPassEncoder.setPipeline(clearPipelineDescriptor.pipelines[0]);
      clearPassEncoder.setBindGroup(0, generalBindGroupDescriptor.bindGroups[0]);
      clearPassEncoder.setBindGroup(1, clearShaderBindGroupDescriptor.bindGroups[0]);
      clearPassEncoder.draw(6, 1, 0, 0);
      clearPassEncoder.end();
    }
    for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
      const currentRenderDescriptor = i % 2 === 0 ? pressureShaderRenderDescriptorWriteToOne : pressureShaderRenderDescriptorWriteToZero;
      const pressurePassEncoder = commandEncoder.beginRenderPass( 
        currentRenderDescriptor
      );
      pressurePassEncoder.setPipeline(pressureShaderPipeline);
      pressurePassEncoder.setBindGroup(0, generalBindGroupDescriptor.bindGroups[0]);
      pressurePassEncoder.setBindGroup(1, pressureShaderBindGroupDescriptor.bindGroups[i % 2]);
      pressurePassEncoder.draw(6, 1, 0, 0);
      pressurePassEncoder.end();
    }
    {
      const gradientSubtractEncoder = commandEncoder.beginRenderPass(
        gradientSubtractPipelineDescriptor.renderDescriptors[0]
      );
      gradientSubtractEncoder.setPipeline(gradientSubtractPipelineDescriptor.pipelines[0]);
      gradientSubtractEncoder.setBindGroup(0, generalBindGroupDescriptor.bindGroups[0]);
      gradientSubtractEncoder.setBindGroup(1, gradientSubtractShaderBindGroupDescriptor.bindGroups[0]);
      gradientSubtractEncoder.draw(6, 1, 0, 0);
      gradientSubtractEncoder.end();
    }
    {
      const advectionPassOneEncoder = commandEncoder.beginRenderPass(
        advectionShaderRenderDescriptorOne
      );
      advectionPassOneEncoder.setPipeline(advectionShaderPipelineOne);
      advectionPassOneEncoder.setBindGroup(0, generalBindGroupDescriptor.bindGroups[0]);
      advectionPassOneEncoder.setBindGroup(1, advectionShaderBindGroupDescriptor.bindGroups[0]);
      advectionPassOneEncoder.draw(6, 1, 0, 0);
      advectionPassOneEncoder.end();
    }
    {
      const advectionPassTwoEncoder = commandEncoder.beginRenderPass(
        advectionShaderRenderDescriptorTwo
      );
      advectionPassTwoEncoder.setPipeline(advectionShaderPipelineTwo);
      advectionPassTwoEncoder.setBindGroup(0, generalBindGroupDescriptor.bindGroups[0]);
      advectionPassTwoEncoder.setBindGroup(1, advectionShaderBindGroupDescriptor.bindGroups[1]);
      advectionPassTwoEncoder.draw(6, 1, 0, 0);
      advectionPassTwoEncoder.end();
    } 
    //Dye is final output otherwise debug from velocities to dyes to pressures to curl to
    switch(config.DEBUG_VIEW) {
      case "None": {
        finalDisplayPipelineDescriptor.renderDescriptors[0].colorAttachments[0].view = context.getCurrentTexture().createView();
        const finalPassEncoder = commandEncoder.beginRenderPass(
          finalDisplayPipelineDescriptor.renderDescriptors[0]
        );
        finalPassEncoder.setPipeline(finalDisplayPipelineDescriptor.pipelines[0]);
        finalPassEncoder.setBindGroup(0, generalBindGroupDescriptor.bindGroups[1]);
        //Dye 1 from advection
        finalPassEncoder.setBindGroup(1, finalDisplayBindGroupDescriptor.bindGroups[0]);
        finalPassEncoder.draw(6, 1, 0, 0);
        finalPassEncoder.end();
      } break;
      case "SplatVelocityOutput": {
        debugOutputPipelineDescriptor.renderDescriptors[0].colorAttachments[0].view = context.getCurrentTexture().createView();
        const finalPassEncoder = commandEncoder.beginRenderPass(
          debugOutputPipelineDescriptor.renderDescriptors[0]
        );
        finalPassEncoder.setPipeline(debugOutputPipelineDescriptor.pipelines[0]);
        finalPassEncoder.setBindGroup(0, generalBindGroupDescriptor.bindGroups[0]);
        finalPassEncoder.setBindGroup(1, debugOutputBindGroupDescriptor.bindGroups[0]);
        finalPassEncoder.draw(6, 1, 0, 0);
        finalPassEncoder.end();
      } break;
      case "VorticityVelocityOutput": {
        debugOutputPipelineDescriptor.renderDescriptors[0].colorAttachments[0].view = context.getCurrentTexture().createView();
        const finalPassEncoder = commandEncoder.beginRenderPass(
          debugOutputPipelineDescriptor.renderDescriptors[0]
        );
        finalPassEncoder.setPipeline(debugOutputPipelineDescriptor.pipelines[0]);
        finalPassEncoder.setBindGroup(0, generalBindGroupDescriptor.bindGroups[0]);
        finalPassEncoder.setBindGroup(1, debugOutputBindGroupDescriptor.bindGroups[1]);
        finalPassEncoder.draw(6, 1, 0, 0);
        finalPassEncoder.end();
      } break;
      case "GradientSubtractVelocityOutput": {
        debugOutputPipelineDescriptor.renderDescriptors[0].colorAttachments[0].view = context.getCurrentTexture().createView();
        const finalPassEncoder = commandEncoder.beginRenderPass(
          debugOutputPipelineDescriptor.renderDescriptors[0]
        );
        finalPassEncoder.setPipeline(debugOutputPipelineDescriptor.pipelines[0]);
        finalPassEncoder.setBindGroup(0, generalBindGroupDescriptor.bindGroups[0]);
        finalPassEncoder.setBindGroup(1, debugOutputBindGroupDescriptor.bindGroups[2]);
        finalPassEncoder.draw(6, 1, 0, 0);
        finalPassEncoder.end();
      } break;
      case "AdvectionVelocityOutput": {
        debugOutputPipelineDescriptor.renderDescriptors[0].colorAttachments[0].view = context.getCurrentTexture().createView();
        const finalPassEncoder = commandEncoder.beginRenderPass(
          debugOutputPipelineDescriptor.renderDescriptors[0]
        );
        finalPassEncoder.setPipeline(debugOutputPipelineDescriptor.pipelines[0]);
        finalPassEncoder.setBindGroup(0, generalBindGroupDescriptor.bindGroups[0]);
        finalPassEncoder.setBindGroup(1, debugOutputBindGroupDescriptor.bindGroups[3]);
        finalPassEncoder.draw(6, 1, 0, 0);
        finalPassEncoder.end();
      } break;
      case "SplatDyeOutput": {
        debugOutputPipelineDescriptor.renderDescriptors[0].colorAttachments[0].view = context.getCurrentTexture().createView();
        const finalPassEncoder = commandEncoder.beginRenderPass(
          debugOutputPipelineDescriptor.renderDescriptors[0]
        );
        finalPassEncoder.setPipeline(debugOutputPipelineDescriptor.pipelines[0]);
        finalPassEncoder.setBindGroup(0, generalBindGroupDescriptor.bindGroups[0]);
        finalPassEncoder.setBindGroup(1, debugOutputBindGroupDescriptor.bindGroups[4]);
        finalPassEncoder.draw(6, 1, 0, 0);
        finalPassEncoder.end();
      } break;
      case "AdvectionDyeOutput": {
        debugOutputPipelineDescriptor.renderDescriptors[0].colorAttachments[0].view = context.getCurrentTexture().createView();
        const finalPassEncoder = commandEncoder.beginRenderPass(
          debugOutputPipelineDescriptor.renderDescriptors[0]
        );
        finalPassEncoder.setPipeline(debugOutputPipelineDescriptor.pipelines[0]);
        finalPassEncoder.setBindGroup(0, generalBindGroupDescriptor.bindGroups[0]);
        finalPassEncoder.setBindGroup(1, debugOutputBindGroupDescriptor.bindGroups[5]);
        finalPassEncoder.draw(6, 1, 0, 0);
        finalPassEncoder.end();
      } break;
      case "ClearPressureOutput": {
        debugOutputPipelineDescriptor.renderDescriptors[0].colorAttachments[0].view = context.getCurrentTexture().createView();
        const finalPassEncoder = commandEncoder.beginRenderPass(
          debugOutputPipelineDescriptor.renderDescriptors[0]
        );
        finalPassEncoder.setPipeline(debugOutputPipelineDescriptor.pipelines[0]);
        finalPassEncoder.setBindGroup(0, generalBindGroupDescriptor.bindGroups[0]);
        finalPassEncoder.setBindGroup(1, debugOutputBindGroupDescriptor.bindGroups[6]);
        finalPassEncoder.draw(6, 1, 0, 0);
        finalPassEncoder.end();
      } break;
      case "PressurePressureOutput": {
        debugOutputPipelineDescriptor.renderDescriptors[0].colorAttachments[0].view = context.getCurrentTexture().createView();
        const finalPassEncoder = commandEncoder.beginRenderPass(
          debugOutputPipelineDescriptor.renderDescriptors[0]
        );
        finalPassEncoder.setPipeline(debugOutputPipelineDescriptor.pipelines[0]);
        finalPassEncoder.setBindGroup(0, generalBindGroupDescriptor.bindGroups[0]);
        finalPassEncoder.setBindGroup(1, debugOutputBindGroupDescriptor.bindGroups[7]);
        finalPassEncoder.draw(6, 1, 0, 0);
        finalPassEncoder.end();
      } break;
      case "CurlOutput": {
        debugOutputPipelineDescriptor.renderDescriptors[0].colorAttachments[0].view = context.getCurrentTexture().createView();
        const finalPassEncoder = commandEncoder.beginRenderPass(
          debugOutputPipelineDescriptor.renderDescriptors[0]
        );
        finalPassEncoder.setPipeline(debugOutputPipelineDescriptor.pipelines[0]);
        finalPassEncoder.setBindGroup(0, generalBindGroupDescriptor.bindGroups[0]);
        finalPassEncoder.setBindGroup(1, debugOutputBindGroupDescriptor.bindGroups[8]);
        finalPassEncoder.draw(6, 1, 0, 0);
        finalPassEncoder.end();
      } break;
      case "DivergenceOutput": {
        debugOutputPipelineDescriptor.renderDescriptors[0].colorAttachments[0].view = context.getCurrentTexture().createView();
        const finalPassEncoder = commandEncoder.beginRenderPass(
          debugOutputPipelineDescriptor.renderDescriptors[0]
        );
        finalPassEncoder.setPipeline(debugOutputPipelineDescriptor.pipelines[0]);
        finalPassEncoder.setBindGroup(0, generalBindGroupDescriptor.bindGroups[0]);
        finalPassEncoder.setBindGroup(1, debugOutputBindGroupDescriptor.bindGroups[9]);
        finalPassEncoder.draw(6, 1, 0, 0);
        finalPassEncoder.end();
      } break;
    } 

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
