
import { makeSample, SampleInit } from '../../components/SampleLayout';
import { vec2, vec3, vec4 } from 'wgpu-matrix';

import baseVertexWGSL from './shaders/vertex/base.vert.wgsl';
import splatFragmentWGSL from './shaders/fragment/splat.frag.wgsl';
import debugOutputFragmentWGSL from './shaders/fragment/debugOutput.frag.wgsl'
import curlFragmentWGSL from './shaders/fragment/curl.frag.wgsl';
import advectionFragmentWGSL from './shaders/fragment/advection.frag.wgsl';
import clearFragmentWGSL from './shaders/fragment/clear.frag.wgsl';
import copyFragmentWGSL from './shaders/fragment/clear.frag.wgsl';
import divergenceFragmentWGSL from './shaders/fragment/divergence.frag.wgsl';
import pressureFragmentWGSL from './shaders/fragment/pressure.frag.wgsl';
import vorticityFragmentWGSL from './shaders/fragment/vorticity.frag.wgsl';
import sunraysMaskFragmentWGSL from './shaders/fragment/sunraysMask.frag.wgsl'
import sunraysFragmentWGSL from './shaders/fragment/sunrays.frag.wgsl';
import gradientSubtractWGSL from './shaders/fragment/gradientSubtract.frag.wgsl';
import colorFragmentWGSL from './shaders/fragment/color.frag.wgsl';
import checkerboardFragmentWGSL from './shaders/fragment/checkerboard.frag.wgsl';

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
} from './texture';
import { ArrayLike } from 'wgpu-matrix/dist/1.x/array-like';
import { debug } from 'console';
import { create } from 'wgpu-matrix/dist/1.x/vec4-impl';

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
  });

  window.addEventListener('mouseup', () => {
    if (!pointers[0]) return;
    updatePointerUpData(pointers[0]);
  });

  // CREATE ALL TEXTURE RESOURCES
  //rgba16float rg16float r16float
  const fluidPropertyTextures = createNavierStokeOutputTextures(device, canvas);
  console.log(fluidPropertyTextures)


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
  })

  const generalBindGroupDescriptor = createBindGroupDescriptor(
    [0, 1],
    [GPUShaderStage.VERTEX, GPUShaderStage.FRAGMENT],
    ['buffer', 'sampler'],
    [{type: 'uniform'}, {type: 'filtering'}],
    [
      { buffer: vertexBaseUniformBuffer}, 
      sampler
    ],
    device
  );

  const baseVertexShaderState: GPUVertexState = {
    module: device.createShaderModule({
      code: baseVertexWGSL,
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
    [
      { type: 'uniform'},
      { sampleType: 'float' },
      { sampleType: 'float' },
    ],
    [
      {buffer: splatUniformBuffer},
      fluidPropertyTextures.prevVelocity.view,
      fluidPropertyTextures.prevDye.view,
    ],
    device
  ); 

  const splatShaderPipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [generalBindGroupDescriptor.bindGroupLayout, splatShaderBindGroupDescriptor.bindGroupLayout],
    }),
    vertex: baseVertexShaderState,
    fragment: {
      module: device.createShaderModule({
        code: splatFragmentWGSL,
      }),
      entryPoint: 'fragmentMain',
      targets: [
        //velocity texture
        { format: fluidPropertyTextures.currentVelocity.texture.format },
        //dye texture
        { format: fluidPropertyTextures.currentDye.texture.format }
      ],
    },
    primitive: planePrimitive,
  });

  const splatShaderRenderDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        view: fluidPropertyTextures.currentVelocity.view,
        ...standardClear,
      },
      {
        view: fluidPropertyTextures.currentDye.view,
        ...standardClear,
      },
    ],
  };

  const curlShaderBindGroupDescriptor = createBindGroupDescriptor(
    [0],
    [GPUShaderStage.FRAGMENT],
    ['texture'],
    [{sampleType: 'float'}],
    [fluidPropertyTextures.prevVelocity.view],
    device
  )

  const curlShaderPipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [generalBindGroupDescriptor.bindGroupLayout, curlShaderBindGroupDescriptor.bindGroupLayout],
    }),
    vertex: baseVertexShaderState,
    fragment: {
      module: device.createShaderModule({
        code: splatFragmentWGSL,
      }),
      entryPoint: 'fragmentMain',
      targets: [
        //velocity texture
        { format: fluidPropertyTextures.curl.texture.format },
      ],
    },
    primitive: planePrimitive,
  });

  const curlShaderRenderDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        view: fluidPropertyTextures.curl.view,
        ...standardClear,
      }
    ]
  };

  const vorticityUniformBuffer = device.createBuffer({
    size: Float32Array.BYTES_PER_ELEMENT * 2,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  });

  const vorticityShaderBindGroupDescriptor = createBindGroupDescriptor(
    [0, 1, 2],
    [GPUShaderStage.FRAGMENT],
    ['buffer', 'texture', 'texture'],
    [{type: 'uniform'}, {sampleType: 'float'}, {sampleType: 'float'}],
    [
      {buffer: vorticityUniformBuffer},
      fluidPropertyTextures.prevVelocity.view,
      fluidPropertyTextures.curl.view,
    ],
    device
  );

  const vorticityShaderPipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [generalBindGroupDescriptor.bindGroupLayout, vorticityShaderBindGroupDescriptor.bindGroupLayout],
    }),
    vertex: baseVertexShaderState,
    fragment: {
      module: device.createShaderModule({
        code: vorticityFragmentWGSL,
      }),
      entryPoint: 'fragmentMain',
      targets: [
        //velocity texture
        { format: fluidPropertyTextures.currentVelocity.texture.format },
      ],
    },
    primitive: planePrimitive,
  });

  const vorticityShaderRenderDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        view: fluidPropertyTextures.currentVelocity.view,
        ...standardClear,
      },
    ]
  };

  //
  const divergenceShaderBindGroupDescriptor = curlShaderBindGroupDescriptor;

  const divergenceShaderPipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [generalBindGroupDescriptor.bindGroupLayout, divergenceShaderBindGroupDescriptor.bindGroupLayout],
    }),
    vertex: baseVertexShaderState,
    fragment: {
      module: device.createShaderModule({
        code: divergenceFragmentWGSL,
      }),
      entryPoint: 'fragmentMain',
      targets: [
        //velocity texture
        { format: fluidPropertyTextures.divergence.texture.format },
      ],
    },
    primitive: planePrimitive,
  });

  const divergenceShaderRenderAttachment: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        view: fluidPropertyTextures.divergence.view,
        ...standardClear,
      },
    ]
  };

  const clearUniformBuffer = device.createBuffer({
    size: Float32Array.BYTES_PER_ELEMENT * 1,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  })

  const clearShaderBindGroupDescriptor = createBindGroupDescriptor(
    [0, 1],
    [GPUShaderStage.FRAGMENT],
    ['buffer', 'texture'],
    [{type: 'uniform'}, {sampleType: 'float'}],
    [{buffer: clearUniformBuffer}, fluidPropertyTextures.prevPressure.view],
    device,
  );

  const clearShaderPipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [generalBindGroupDescriptor.bindGroupLayout, clearShaderBindGroupDescriptor.bindGroupLayout],
    }),
    vertex: baseVertexShaderState,
    fragment: {
      module: device.createShaderModule({
        code: clearFragmentWGSL,
      }),
      entryPoint: 'fragmentMain',
      targets: [
        //velocity texture
        { format: fluidPropertyTextures.currentPressure.texture.format },
      ],
    },
    primitive: planePrimitive,
  });

  const clearShaderRenderDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        view: fluidPropertyTextures.currentPressure.view,
        ...standardClear,
      }
    ]
  };

  const pressureShaderBindGroupDescriptor = createBindGroupDescriptor(
    [0, 1],
    [GPUShaderStage.FRAGMENT],
    ['texture', 'texture'],
    [{sampleType: 'float'}, {sampleType: 'float'}],
    [fluidPropertyTextures.divergence.view, fluidPropertyTextures.prevPressure.view],
    device,
  );

  const pressureShaderPipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [generalBindGroupDescriptor.bindGroupLayout, pressureShaderBindGroupDescriptor.bindGroupLayout],
    }),
    vertex: baseVertexShaderState,
    fragment: {
      module: device.createShaderModule({
        code: pressureFragmentWGSL,
      }),
      entryPoint: 'fragmentMain',
      targets: [
        //velocity texture
        { format: fluidPropertyTextures.currentPressure.texture.format },
      ],
    },
    primitive: planePrimitive,
  });

  const pressureShaderRenderDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        view: fluidPropertyTextures.currentPressure.view,
        ...standardClear,
      }
    ]
  };

  const gradientSubtractShaderBindGroupDescriptor = createBindGroupDescriptor(
    [0, 1],
    [GPUShaderStage.FRAGMENT],
    ['texture', 'texture'],
    [{sampleType: 'float'}, {sampleType: 'float'}],
    [
      fluidPropertyTextures.prevPressure.view,
      fluidPropertyTextures.prevVelocity.view
    ],
    device
  );

  const gradientSubtractShaderPipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [generalBindGroupDescriptor.bindGroupLayout, gradientSubtractShaderBindGroupDescriptor.bindGroupLayout],
    }),
    vertex: baseVertexShaderState,
    fragment: {
      module: device.createShaderModule({
        code: pressureFragmentWGSL,
      }),
      entryPoint: 'fragmentMain',
      targets: [
        //velocity texture
        { format: fluidPropertyTextures.currentVelocity.texture.format },
      ],
    },
    primitive: planePrimitive,
  });

  const gradientShaderRenderAttachments: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        view: fluidPropertyTextures.currentVelocity.format,
        ...standardClear,
      }
    ]
  };


  const advectionUniformBuffer = device.createBuffer({
    size: Float32Array.BYTES_PER_ELEMENT * 6,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  });

  const advectionShaderBindGroupDescriptor = createBindGroupDescriptor(
    [0, 1, 2],
    [GPUShaderStage.FRAGMENT],
    ['buffer', 'texture'],
    [{type: 'uniform'}, {sampleType: 'float'}, {sampleType: 'float'}],
    [{buffer: advectionUniformBuffer}, fluidPropertyTextures.prevVelocity.view, fluidPropertyTextures.prevVelocity.view],
    device
  );

  const advectionShaderBindGroupAlt = device.createBindGroup({
    layout: advectionShaderBindGroupDescriptor.bindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: 
          {buffer: advectionUniformBuffer},
      },
      {
        binding: 1,
        resource: fluidPropertyTextures.prevVelocity.view,
      },
      {
        binding: 2,
        resource: fluidPropertyTextures.prevDye.view,
      },
    ]
  })

  const advectionShaderPipelineOne = device.createRenderPipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [generalBindGroupDescriptor.bindGroupLayout, advectionShaderBindGroupDescriptor.bindGroupLayout],
    }),
    vertex: baseVertexShaderState,
    fragment: {
      module: device.createShaderModule({
        code: advectionFragmentWGSL,
      }),
      entryPoint: 'fragmentMain',
      targets: [
        //velocity texture
        { format: fluidPropertyTextures.currentVelocity.texture.format },
      ],
    },
    primitive: planePrimitive,
  });

  const advectionShaderPipelineTwo = device.createRenderPipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [generalBindGroupDescriptor.bindGroupLayout, advectionShaderBindGroupDescriptor.bindGroupLayout],
    }),
    vertex: baseVertexShaderState,
    fragment: {
      module: device.createShaderModule({
        code: advectionFragmentWGSL,
      }),
      entryPoint: 'fragmentMain',
      targets: [
        //velocity texture
        { format: fluidPropertyTextures.currentDye.texture.format },
      ],
    },
    primitive: planePrimitive,
  });

  const advectionShaderRenderAttachmentsOne: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        view: fluidPropertyTextures.currentVelocity.view,
        ...standardClear,
      }
    ]
  }

  const advectionShaderRenderAttachmentsTwo: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        view: fluidPropertyTextures.currentDye.view,
        ...standardClear,
      }
    ]
  }


  const debugOutputBindGroupDescriptor = createBindGroupDescriptor(
    [0],
    [GPUShaderStage.FRAGMENT],
    ['texture'],
    [{sampleType: 'float'}],
    [fluidPropertyTextures.currentVelocity.view],
    device
  );

  const debugOutputShaderPipeline = device.createRenderPipeline({
    //@group(0) //@group(1)
    layout: device.createPipelineLayout({
      bindGroupLayouts: [generalBindGroupDescriptor.bindGroupLayout, debugOutputBindGroupDescriptor.bindGroupLayout],
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

  const writeVorticityUniforms = (
    curl: number,
    dt: number
  ) => {
    const arr = new Float32Array([curl, dt])
    device.queue.writeBuffer(
      vorticityUniformBuffer,
      0,
      arr.buffer,
      arr.byteOffset,
      arr.byteLength
    );
  }

  const writeClearUniforms = (
    pressure: number
  ) => {
    const arr = new Float32Array([pressure]);
    device.queue.writeBuffer(
      clearUniformBuffer,
      0,
      arr.buffer,
      arr.byteOffset,
      arr.byteLength
    );
  }


  const writeAdvectionUniforms = (
    texel_size: ArrayLike,
    dye_texel_size: ArrayLike,
    dt: number, 
    dissipation: number,
  ) => {
    const arr = new Float32Array([dt, dissipation]);
    writeToF32Buffer(
      [texel_size, dye_texel_size],
      arr,
      advectionUniformBuffer,
      device
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
    {
      // SPLAT SHADER
      const velocityTexelDims = getTexelDimsAsFloat32Array(
        fluidPropertyTextures.prevVelocity.texelSizeX,
        fluidPropertyTextures.prevVelocity.texelSizeY
      );
      console.log(velocityTexelDims);

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
          console.log(dx, dy);
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
        }
      });

      const splatPassEncoder = commandEncoder.beginRenderPass(
        splatShaderRenderDescriptor
      );
      splatPassEncoder.setPipeline(splatShaderPipeline);
      splatPassEncoder.setBindGroup(0, generalBindGroupDescriptor.bindGroup);
      splatPassEncoder.setBindGroup(1, splatShaderBindGroupDescriptor.bindGroup);
      splatPassEncoder.draw(6, 1, 0, 0);

      splatPassEncoder.end();

    }
    commandEncoder.copyTextureToTexture(
      {
        texture: fluidPropertyTextures.currentVelocity.texture,
      },
      {
        texture: fluidPropertyTextures.prevVelocity.texture,
      },
      [fluidPropertyTextures.prevVelocity.width, fluidPropertyTextures.prevVelocity.height]
    ); 

    commandEncoder.copyTextureToTexture(
      {
        texture: fluidPropertyTextures.currentDye.texture,
      },
      {
        texture: fluidPropertyTextures.prevDye.texture,
      },
      [fluidPropertyTextures.prevVelocity.width, fluidPropertyTextures.prevVelocity.height]
    ); 
    const curlPassEncoder = commandEncoder.
    {
      debugOutputRenderDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();
      const debugOutputPassEncoder = commandEncoder.beginRenderPass(
        debugOutputRenderDescriptor
      )
      debugOutputPassEncoder.setPipeline(debugOutputShaderPipeline);
      debugOutputPassEncoder.setBindGroup(0, generalBindGroupDescriptor.bindGroup);
      debugOutputPassEncoder.setBindGroup(1, debugOutputBindGroupDescriptor.bindGroup);
      debugOutputPassEncoder.draw(6, 1, 0, 0);
      debugOutputPassEncoder.end();
    }
    



    commandEncoder.copyTextureToTexture

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
