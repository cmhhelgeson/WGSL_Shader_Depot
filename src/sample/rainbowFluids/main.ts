/* eslint-disable prettier/prettier */
import { makeSample, SampleInit } from '../../components/SampleLayout';
import { vec2, vec3, vec4 } from 'wgpu-matrix';

import baseVertexWGSL from './shaders/vertex/base.vert.wgsl';
import splatFragmentWGSL from './shaders/fragment/splat.frag.wgsl';

import {
  correctRadius,
  defaultConfig,
  initBloomGui,
  initCaptureGui,
  initDebugGui,
  initGuiConstants,
  initSunraysGui,
  scaleByPixelRatio,
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
} from './texture';
import { ArrayLike } from 'wgpu-matrix/dist/1.x/array-like';
import { debug } from 'console';

const standardClear: Omit<GPURenderPassColorAttachment, 'view'> = {
  clearValue: { r: 0.0, g: 0.0, b: 1.0, a: 1.0 },
  loadOp: 'clear',
  storeOp: 'store',
};

const init: SampleInit = async ({ canvas, pageState, gui }) => {
  // GET ALL DEVICE, WINDOW, ADAPTER DETAILS
  const adapter = await navigator.gpu.requestAdapter();
  let filteringType: GPUFilterMode = 'nearest';
  if (adapter.features.has('texture-compression-bc')) {
    filteringType = 'linear';
  }
  const device = await adapter.requestDevice();

  const isMobile: boolean = navigator.userAgentData.mobile;

  const dynamicUniformBufferIterationAllignment = adapter.limits.minUniformBufferOffsetAlignment;

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
    console.log(pointer);
  });

  window.addEventListener('mouseup', () => {
    if (!pointers[0]) return;
    updatePointerUpData(pointers[0]);
  });

  // CREATE ALL TEXTURE RESOURCES
  //rgba16float rg16float r16float
  const fluidPropertyTextures = createNavierStokeOutputTextures(device, canvas);


  // RESOURCES USED ACROSS MULTIPLE PIPELINES / SHADERES
  const planePrimitive: GPUPrimitiveState = {
    topology: 'triangle-list',
    cullMode: 'back',
  };

  // General shader bind group (pass texelSize and sampler to shaderes)
  const generalBindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX,
        buffer: { type: 'uniform' },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.FRAGMENT,
        sampler: { type: 'filtering' },
      },
    ],
  });

  const vertexBaseUniformBuffer = device.createBuffer({
    // vec2f
    size: Float32Array.BYTES_PER_ELEMENT * 2,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const sampler = device.createSampler({
    magFilter: filteringType,
    minFilter: filteringType,
  });

  //@group(0)
  const generalBindGroup = device.createBindGroup({
    layout: generalBindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: {
          buffer: vertexBaseUniformBuffer,
        },
      },
      {
        binding: 1,
        resource: sampler,
      },
    ],
  });

  const splatShaderBindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: { type: 'uniform' },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.FRAGMENT,
        texture: {
          sampleType: 'unfilterable-float',
        },
      },
      {
        binding: 2,
        visibility: GPUShaderStage.FRAGMENT,
        texture: {
          sampleType: 'unfilterable-float',
        },
      },
    ],
  });

  const splatUniformBuffer = device.createBuffer({
    //4 element velocity color,
    //4 element dye color
    //2 element point
    //1 element aspect ratio
    //1 element radius
    size: Float32Array.BYTES_PER_ELEMENT * 12,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  //@group(1)
  const splatShaderBindGroup = device.createBindGroup({
    layout: splatShaderBindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: {
          buffer: splatUniformBuffer,
        },
      },
      {
        binding: 1,
        resource: fluidPropertyTextures.prevVelocity.texture.createView(),
      },
      {
        binding: 2,
        resource: fluidPropertyTextures.prevDye.texture.createView(),
      },
    ],
  });

  const splatShaderPipeline = device.createRenderPipeline({
    //@group(0) //@group(1)
    layout: device.createPipelineLayout({
      bindGroupLayouts: [generalBindGroupLayout, splatShaderBindGroupLayout],
    }),
    vertex: {
      module: device.createShaderModule({
        code: baseVertexWGSL,
      }),
      entryPoint: 'vertexMain',
    },
    fragment: {
      module: device.createShaderModule({
        code: splatFragmentWGSL,
      }),
      entryPoint: 'splatFragmentMain',
      targets: [
        //velocity texture
        { format: 'rg16float' },
        //dye texture
        { format: 'rgba16float' }
      ],
    },
    primitive: planePrimitive,
  });

  const splatShaderRenderDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        view: fluidPropertyTextures.currentVelocity.texture.createView(),
        ...standardClear,
      },
      {
        view: fluidPropertyTextures.currentDye.texture.createView(),
        ...standardClear,
      },
    ],
  };

  const debugOutputBindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.FRAGMENT, 
        texture: {
          sampleType: 'unfilterable-float',
        }
      }
    ],
  })

  const debugOutputBindGroup = device.createBindGroup({
    layout: debugOutputBindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: fluidPropertyTextures.currentVelocity.texture.createView(),
      }
    ]
  })

  const debugOutputShaderPipeline = device.createRenderPipeline({
    //@group(0) //@group(1)
    layout: device.createPipelineLayout({
      bindGroupLayouts: [generalBindGroupLayout, debugOutputBindGroupLayout],
    }),
    vertex: {
      module: device.createShaderModule({
        code: baseVertexWGSL,
      }),
      entryPoint: 'vertexMain',
    },
    fragment: {
      module: device.createShaderModule({
        code: splatFragmentWGSL,
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
    colorAttachments: [
      {
        view: undefined,
        ...standardClear,
      }
    ]
  }

  const writeSplatUniforms = (
    //vec3s
    velocity_color: ArrayLike, 
    dye_color: ArrayLike,
    //vec2s
    _point: ArrayLike,
    //float32s
    aspect_ratio: number,
    radius: number,
    offset = 0, 
  ) => {
    const velocityColor = velocity_color as Float32Array;
    const dyeColor = dye_color as Float32Array;
    const point = _point as Float32Array;
    const rest = new Float32Array([aspect_ratio, radius]);

    //Velocity_Color 16 bytes pos 0
    device.queue.writeBuffer(
      splatUniformBuffer,
      0 + dynamicUniformBufferIterationAllignment * offset, 
      velocityColor.buffer,
      velocityColor.byteOffset,
      velocityColor.byteLength
    )

    //Dye_Color 16 bytes pos 16
    device.queue.writeBuffer(
      splatUniformBuffer,
      16 + dynamicUniformBufferIterationAllignment * offset, 
      dyeColor.buffer,
      dyeColor.byteOffset,
      dyeColor.byteLength
    )

    //Point 8 bytes pos 32
    device.queue.writeBuffer(
      splatUniformBuffer,
      32 + dynamicUniformBufferIterationAllignment * offset, 
      point.buffer,
      point.byteOffset,
      point.byteLength
    )

    //Ratio/Radius 8 bytes pos 40
    device.queue.writeBuffer(
      splatUniformBuffer,
      40 + dynamicUniformBufferIterationAllignment * offset, 
      rest.buffer,
      rest.byteOffset,
      rest.byteLength
    );
  }

  let splatStack = [];

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

    // SPLAT SHADER
    const velocityTexelDims = getTexelDimsAsFloat32Array(
      fluidPropertyTextures.prevVelocity.texelSizeX,
      fluidPropertyTextures.prevVelocity.texelSizeY
    );

    //Get texel dimensions of sim texture
    device.queue.writeBuffer(
      vertexBaseUniformBuffer,
      0,
      velocityTexelDims.buffer,
      velocityTexelDims.byteOffset,
      velocityTexelDims.byteLength
    );

    // Only in a mobile context, but for now we will simplify rendering by focusing on Desktop
    /*const splatShaderDynamicUniformBuffer = device.createBuffer({
      //size of float * number of floats * length of shader iterations
      size: Math.max(
        Float32Array.BYTES_PER_ELEMENT * 12 * pointers.length,
        dynamicUniformBufferIterationAllignment,
      ),
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    }) */

    //On desktop should only run once
    pointers.forEach((pointer, idx) => {
      if (pointer.moved) {
        pointer.moved = false;
        const dx = pointer.deltaX * config.SPLAT_FORCE;
        const dy = pointer.deltaY * config.SPLAT_FORCE;
        const textureAspectRatio = fluidPropertyTextures.prevVelocity.width / fluidPropertyTextures.prevVelocity.height;
        writeSplatUniforms(
          //velocity_color (velocity as a color)
          vec3.fromValues(dx, dy, 0.0),
          vec3.fromValues(pointer.color[0], pointer.color[1], pointer.color[2]),
          vec3.fromValues(pointer.texcoordX, pointer.texcoordY),
          textureAspectRatio,
          correctRadius(config.SPLAT_RADIUS / 100.0, textureAspectRatio),
          idx
        );
        //passEncoder.setBindGroup(0, generalBindGroup, );
        //passEncoder.setBindGroup(1, splatShaderBindGroup, );
        //passEncoder.draw(6, 1, 0, 0);
      }
    });

    const splatPassEncoder = commandEncoder.beginRenderPass(
      splatShaderRenderDescriptor
    );
    splatPassEncoder.setPipeline(splatShaderPipeline);
    splatPassEncoder.setBindGroup(0, generalBindGroup);
    splatPassEncoder.setBindGroup(1, splatShaderBindGroup);
    splatPassEncoder.draw(6, 1, 0, 0);

    splatPassEncoder.end();
  

    debugOutputRenderDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();
    const debugOutputPassEncoder = commandEncoder.beginRenderPass(
      debugOutputRenderDescriptor
    )
    debugOutputPassEncoder.setPipeline(debugOutputShaderPipeline);
    debugOutputPassEncoder.setBindGroup(0, generalBindGroup);
    debugOutputPassEncoder.setBindGroup(1, debugOutputBindGroup);
    debugOutputPassEncoder.draw(6, 1, 0, 0);
    debugOutputPassEncoder.end();

    /*commandEncoder.copyTextureToTexture(
      {
        texture: fluidPropertyTextures.currentVelocity.texture,
      },
      {
        texture: fluidPropertyTextures.prevVelocity.texture,
      },
      [fluidPropertyTextures.prevVelocity.width, fluidPropertyTextures.prevVelocity.height]
    ); */

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
