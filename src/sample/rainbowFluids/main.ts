/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
import { makeSample, SampleInit } from '../../components/SampleLayout';
import { vec2, vec3 } from 'wgpu-matrix';

import { 
  advectDyeShader,
  advectShader,
  boundaryPressureShader,
  boundaryShader,
  clearPressureShader,
  divergenceShader,
  FinalOutputShader,
  gradientSubtractShader,
  pressureShader,
  updateDyeShader,
  updateVelocityShader, 
  vorticityConfinmentShader,
  vorticityShader,
  VertexBaseShader
} from './shader';

import debugOutputFragmentWGSL from './shaders/fragment/debugOutput.frag.wgsl';

import {
  BindGroupDescriptor,
  calculateDeltaTime,
  correctRadius,
  create2DRenderPipelineDescriptor,
  createBindGroupDescriptor,
  defaultConfig,
  getResolution,
  initDebugGui,
  initGuiConstants,
  RenderPipelineDescriptor,
  scaleByPixelRatio,
  writeToF32Buffer,
} from './utils';
import {
  updatePointerDownData,
  updatePointerMoveData,
  updatePointerUpData,
  PointerPrototype,
  InitMouse,
  getMouseVelocity,
} from './pointer';
import {
  createNSTextures
} from './texture';
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

 
  const simDimensions = getResolution(canvas.width, canvas.height, config.SIM_RESOLUTION);
  const dyeDimensions = getResolution(canvas.width, canvas.height, config.DYE_RESOLUTION);
  const GridInfoUniform = createUniformDescriptor(
    'gridSize',
    6,
    [
      simDimensions.width, 
      simDimensions.height, 
      dyeDimensions.width, 
      dyeDimensions.height,
      canvas.width,
      canvas.height,
      1.0 / config.SIM_RESOLUTION,
      config.SIM_RESOLUTION * 4,
      config.DYE_RESOLUTION * 4,
    ],
    device
  );

  const GridInfoBindGroupDescriptor = createBindGroupDescriptor(
    [0],
    [GPUShaderStage.FRAGMENT],
    ['buffer'],
    [{type: 'uniform'}],
    [
      [{buffer: GridInfoUniform.buffer}]
    ],
    'GridInfo',
    device
  )

  const mouseUniformBuffer = device.createBuffer({
    size: 4,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  });

  const MouseBindGroupDescriptor = createBindGroupDescriptor(
    [0],
    [GPUShaderStage.FRAGMENT],
    ['buffer'],
    [{type: 'uniform'}],
    [
      [{buffer: mouseUniformBuffer}]
    ],
    'Mouse',
    device
  )

  const fluidPropertyTextures = createNSTextures(
    simDimensions.width,
    simDimensions.height,
    dyeDimensions.width,
    dyeDimensions.height,
    device
  );

  // SPLAT SHADER OBJECTS
  const splatUniformBuffer = device.createBuffer({
    size: Float32Array.BYTES_PER_ELEMENT * 9,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const splatBindGroupDescriptor = createBindGroupDescriptor(
    [0],
    [GPUShaderStage.FRAGMENT],
    ['buffer'],
    [{ type: 'uniform' }],
    [[{ buffer: splatUniformBuffer }]],
    'SplatUniforms',
    device
  );

  const oneTextureBindGroupDescriptor = createBindGroupDescriptor(
    [0], 
    [GPUShaderStage.FRAGMENT], 
    ['texture'], 
    [{sampleType: 'float'}],
    [
      // 1. Update Dye Shader
      [fluidPropertyTextures.dyeSwap1.createView()],
      // 2. Update Velocity Shader
      [fluidPropertyTextures.velocitySwap1.createView()],
      // 4. Boundary Shader
      [fluidPropertyTextures.velocitySwap1.createView()],
      // 5. Divergence Shader
      [fluidPropertyTextures.velocitySwap0.createView()],
      // 6. Boundary Div Shader
      [fluidPropertyTextures.divergenceSwap0.createView()],
      // 8. Boundary Pressure Shader
      [fluidPropertyTextures.pressureSwap0.createView()],
      // 10. Clear Pressure Shader
      [fluidPropertyTextures.pressureSwap1.createView()],
      // 11. Vorticity Shader
      [fluidPropertyTextures.velocitySwap1.createView()],
      // 14. Output Dye
      [fluidPropertyTextures.dyeSwap1.createView()],
    ],
    'PressureOrGradient',
    device
  );

  //Used for both pressure and gradientSubtract
  const twoTextureBindGroupDescriptor = createBindGroupDescriptor(
    [0, 1], 
    [GPUShaderStage.FRAGMENT], 
    ['texture', 'texture'], 
    [{sampleType: 'float'}, {sampleType: 'float'}],
    [
      // 3. Advect Velocity Shader
      [fluidPropertyTextures.velocitySwap0.createView(), fluidPropertyTextures.velocitySwap0.createView()],
      // 7. Pressure Shader
      [fluidPropertyTextures.pressureSwap1.createView(), fluidPropertyTextures.divergenceSwap1.createView()],
      // 9. Gradient Subtract Shader
      [fluidPropertyTextures.pressureSwap1.createView(), fluidPropertyTextures.velocitySwap0.createView()],
      // 12. Vorticity Confinement Shader
      [fluidPropertyTextures.velocitySwap1.createView(), fluidPropertyTextures.vorticity.createView()],
      // 13. Advect Dye Shader
      [fluidPropertyTextures.dyeSwap0.createView(), fluidPropertyTextures.velocitySwap1.createView()],
    ],
    'TwoTextureBindGroup',
    device
  );
  //1
  const updateDyePipelineDescriptor = create2DRenderPipelineDescriptor(
    updateDyeShader,
    [
      GridInfoBindGroupDescriptor.bindGroupLayout, 
      MouseBindGroupDescriptor.bindGroupLayout,
      splatBindGroupDescriptor.bindGroupLayout,
      oneTextureBindGroupDescriptor.bindGroupLayout,
    ],
    [
      [fluidPropertyTextures.dyeSwap0], 
    ],
    'UpdateDye',
    device,
  );
  //2
  const updateVelocityPipelineDescriptor = create2DRenderPipelineDescriptor(
    updateVelocityShader,
    [
      GridInfoBindGroupDescriptor.bindGroupLayout, 
      MouseBindGroupDescriptor.bindGroupLayout,
      splatBindGroupDescriptor.bindGroupLayout,
      oneTextureBindGroupDescriptor.bindGroupLayout,
    ],
    [
      [fluidPropertyTextures.velocitySwap0], 
    ],
    'UpdateVelocity',
    device,
  );
  //3
  const advectVelocityPipelineDescriptor = create2DRenderPipelineDescriptor(
    advectShader,
    [
      GridInfoBindGroupDescriptor.bindGroupLayout, 
      MouseBindGroupDescriptor.bindGroupLayout,
      splatBindGroupDescriptor.bindGroupLayout,
      twoTextureBindGroupDescriptor.bindGroupLayout,
    ],
    [
      [fluidPropertyTextures.velocitySwap1], 
    ],
    'AdvectVelocity',
    device,
  );
  //4
  const boundaryPipelineDescriptor = create2DRenderPipelineDescriptor(
    boundaryShader,
    [
      GridInfoBindGroupDescriptor.bindGroupLayout, 
      MouseBindGroupDescriptor.bindGroupLayout,
      splatBindGroupDescriptor.bindGroupLayout,
      oneTextureBindGroupDescriptor.bindGroupLayout,
    ],
    [
      [fluidPropertyTextures.velocitySwap0], 
    ],
    'Boundary',
    device,
  );
  //5
  const divergencePipelineDescriptor = create2DRenderPipelineDescriptor(
    divergenceShader,
    [
      GridInfoBindGroupDescriptor.bindGroupLayout, 
      MouseBindGroupDescriptor.bindGroupLayout,
      splatBindGroupDescriptor.bindGroupLayout,
      oneTextureBindGroupDescriptor.bindGroupLayout,
    ],
    [
      [fluidPropertyTextures.divergenceSwap0], 
    ],
    'Boundary',
    device,
  );
  //6
  const boundaryDivPipelineDescriptor = create2DRenderPipelineDescriptor(
    boundaryPressureShader,
    [
      GridInfoBindGroupDescriptor.bindGroupLayout, 
      MouseBindGroupDescriptor.bindGroupLayout,
      splatBindGroupDescriptor.bindGroupLayout,
      oneTextureBindGroupDescriptor.bindGroupLayout,
    ],
    [
      [fluidPropertyTextures.divergenceSwap1], 
    ],
    'BoundaryDiv',
    device,
  );
  //7
  const pressurePipelineDescriptor = create2DRenderPipelineDescriptor(
    pressureShader,
    [
      GridInfoBindGroupDescriptor.bindGroupLayout, 
      MouseBindGroupDescriptor.bindGroupLayout,
      splatBindGroupDescriptor.bindGroupLayout,
      twoTextureBindGroupDescriptor.bindGroupLayout,
    ],
    [
      [fluidPropertyTextures.pressureSwap0], 
    ],
    'Pressure',
    device,
  );
  //8
  const boundaryPressurePipelineDescriptor = create2DRenderPipelineDescriptor(
    boundaryPressureShader,
    [
      GridInfoBindGroupDescriptor.bindGroupLayout, 
      MouseBindGroupDescriptor.bindGroupLayout,
      splatBindGroupDescriptor.bindGroupLayout,
      oneTextureBindGroupDescriptor.bindGroupLayout,
    ],
    [
      [fluidPropertyTextures.pressureSwap1], 
    ],
    'BoundaryPressure',
    device,
  );
  //9
  const gradientSubtractPipelineDescriptor = create2DRenderPipelineDescriptor(
    gradientSubtractShader,
    [
      GridInfoBindGroupDescriptor.bindGroupLayout, 
      MouseBindGroupDescriptor.bindGroupLayout,
      splatBindGroupDescriptor.bindGroupLayout,
      twoTextureBindGroupDescriptor.bindGroupLayout,
    ],
    [
      [fluidPropertyTextures.velocitySwap1], 
    ],
    'GradientSubtract',
    device,
  );
  //10
  const clearPressurePipelineDescriptor = create2DRenderPipelineDescriptor(
    clearPressureShader,
    [
      GridInfoBindGroupDescriptor.bindGroupLayout, 
      MouseBindGroupDescriptor.bindGroupLayout,
      splatBindGroupDescriptor.bindGroupLayout,
      oneTextureBindGroupDescriptor.bindGroupLayout,
    ],
    [
      [fluidPropertyTextures.pressureSwap0], 
    ],
    'ClearPressure',
    device,
  );
  //11
  const vorticityPipelineDescriptor = create2DRenderPipelineDescriptor(
    vorticityShader,
    [
      GridInfoBindGroupDescriptor.bindGroupLayout, 
      MouseBindGroupDescriptor.bindGroupLayout,
      splatBindGroupDescriptor.bindGroupLayout,
      oneTextureBindGroupDescriptor.bindGroupLayout,
    ],
    [
      [fluidPropertyTextures.vorticity], 
    ],
    'Vorticity',
    device,
  );
  //12
  const vorticityConfinementPipelineDescriptor = create2DRenderPipelineDescriptor(
    vorticityConfinmentShader,
    [
      GridInfoBindGroupDescriptor.bindGroupLayout, 
      MouseBindGroupDescriptor.bindGroupLayout,
      splatBindGroupDescriptor.bindGroupLayout,
      twoTextureBindGroupDescriptor.bindGroupLayout,
    ],
    [
      [fluidPropertyTextures.velocitySwap0], 
    ],
    'VorticityConfinement',
    device,
  );
  //13
  const advectDyePipelineDescriptor = create2DRenderPipelineDescriptor(
    advectDyeShader,
    [
      GridInfoBindGroupDescriptor.bindGroupLayout, 
      MouseBindGroupDescriptor.bindGroupLayout,
      splatBindGroupDescriptor.bindGroupLayout,
      twoTextureBindGroupDescriptor.bindGroupLayout,
    ],
    [
      [fluidPropertyTextures.dyeSwap1], 
    ],
    'AdvectDye',
    device,
  );
  //14
  const outputDyePipelineDescriptor = create2DRenderPipelineDescriptor(
    FinalOutputShader,
    [
      GridInfoBindGroupDescriptor.bindGroupLayout, 
      MouseBindGroupDescriptor.bindGroupLayout,
      splatBindGroupDescriptor.bindGroupLayout,
      oneTextureBindGroupDescriptor.bindGroupLayout,
    ],
    [
      [null], 
    ],
    'OutputDye',
    device,
  );

  const mouse = InitMouse();

  device.queue.writeBuffer(
    splatUniformBuffer,
    0,
    new Float32Array([
      0.2, //force
      0.
    ])
  )

  function frame() {
    // Sample is no longer the active page.
    if (!pageState.active) return;


    if (mouse.current) {
      //Get velocity by subtracting positions
      mouse.velocity = mouse.last ? getMouseVelocity(mouse.current, mouse.last) : {x: 0, y: 0};
      //Push new pos and velocity to buffer
      const arr = new Float32Array([
        mouse.current.x,
        mouse.current.y,
        mouse.velocity.x,
        mouse.velocity.y
      ])
      device.queue.writeBuffer(
        mouseUniformBuffer,
        0,
        arr.buffer,
        arr.byteOffset,
        arr.byteLength
      );
      // Make current step previous step for next iteration
      mouse.last = {x: mouse.current.x, y: mouse.current.y};
    }

   

    const commandEncoder = device.createCommandEncoder();
    const runPass = (
      pipelineDescriptor: RenderPipelineDescriptor,
      textureBindGroup: BindGroupDescriptor,
      bgIdx: number,
    ) => {
      const passEncoder = commandEncoder.beginRenderPass(
        pipelineDescriptor.renderDescriptors[0]
      );
      passEncoder.setPipeline(pipelineDescriptor.pipelines[0]);
      passEncoder.setBindGroup(0, GridInfoBindGroupDescriptor.bindGroups[0]);
      passEncoder.setBindGroup(1, MouseBindGroupDescriptor.bindGroups[0]);
      passEncoder.setBindGroup(2, splatBindGroupDescriptor.bindGroups[0]);
      passEncoder.setBindGroup(3, textureBindGroup.bindGroups[bgIdx]);
      passEncoder.draw(6, 1, 0, 0);
      passEncoder.end();
    }
    {//1
      runPass(updateDyePipelineDescriptor, oneTextureBindGroupDescriptor, 0)
    }
    {//2
      runPass(updateVelocityPipelineDescriptor, oneTextureBindGroupDescriptor, 1)
    }
    {//3
      runPass(advectVelocityPipelineDescriptor, twoTextureBindGroupDescriptor, 0)
    }
    {//4
      runPass(boundaryPipelineDescriptor, oneTextureBindGroupDescriptor, 2)
    }
    {//5
      runPass(divergencePipelineDescriptor, oneTextureBindGroupDescriptor, 3)
    }
    {//6
      runPass(boundaryDivPipelineDescriptor, oneTextureBindGroupDescriptor, 4)
    }
    {
      for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {  
        //7
        runPass(pressurePipelineDescriptor, twoTextureBindGroupDescriptor, 1)
        //8
        runPass(boundaryPressurePipelineDescriptor, oneTextureBindGroupDescriptor, 5)
      }
    }
    {//9
      runPass(gradientSubtractPipelineDescriptor, twoTextureBindGroupDescriptor, 2)
    }
    {//10
      runPass(clearPressurePipelineDescriptor, oneTextureBindGroupDescriptor, 6)
    }
    {//11
      runPass(vorticityPipelineDescriptor, oneTextureBindGroupDescriptor, 7)
    }
    {//12
      runPass(vorticityConfinementPipelineDescriptor, twoTextureBindGroupDescriptor, 3)
    }
    {//13
      runPass(advectDyePipelineDescriptor, twoTextureBindGroupDescriptor, 4)
    }
    {//14
      runPass(outputDyePipelineDescriptor, oneTextureBindGroupDescriptor, 8);
    }

    commandEncoder.copyTextureToTexture(
      {texture: fluidPropertyTextures.velocitySwap0},
      {texture: fluidPropertyTextures.velocitySwap1},
      [simDimensions.width, simDimensions.height]
    );

    commandEncoder.copyTextureToTexture(
      {texture: fluidPropertyTextures.pressureSwap0},
      {texture: fluidPropertyTextures.pressureSwap1},
      [simDimensions.width, simDimensions.height]
    )


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
