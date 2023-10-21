import {
  makeSample,
  SampleInit,
} from '../../../components/SampleLayout/SampleLayout';
import { SampleInitFactoryWebGPU } from '../../../components/SampleLayout/SampleLayoutUtils';
import { createBindGroupDescriptor } from '../../../utils/bindGroup';
import { create3DRenderPipeline } from '../../../utils/program/renderProgram';
import {
  createRenderShader,
  UniformDefiner,
  VertexBuiltIn,
} from '../../../utils/shaderUtils';
import particleRender from './particle.wgsl';
import { FluidComputeShader } from './fluid';

let init: SampleInit;
SampleInitFactoryWebGPU(
  async ({
    pageState,
    device,
    gui,
    presentationFormat,
    context,
    canvas,
    stats,
  }) => {
    const settings = {
      Gravity: -9.8,
      'Particle Radius': 10.0,
      Damping: 0.7,
      'Reset Simulation': () => {
        generateParticles();
      },
      isResetting: false,
    };

    const maxWorkgroups = device.limits.maxComputeWorkgroupSizeX;

    //Create bitonic debug renderer
    const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [
        {
          view: undefined, // Assigned later

          clearValue: { r: 0.3, g: 0.0, b: 0.5, a: 1.0 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    };

    // Define resources for render shader.
    const BallUniforms: UniformDefiner = {
      structName: 'BallUniforms',
      argKeys: ['radius', 'canvasWidth', 'canvasHeight'],
      dataType: 'f32',
    };

    const particleShader = createRenderShader({
      uniforms: [BallUniforms],
      vertexInputs: {
        names: [],
        builtins: VertexBuiltIn.VERTEX_INDEX | VertexBuiltIn.INSTANCE_INDEX,
        formats: [],
      },
      vertexOutput: {
        builtins: VertexBuiltIn.POSITION,
        outputs: [{ name: 'v_uv', format: 'vec2<f32>' }],
      },
      code: particleRender,
    });

    const ballUniformsBuffer = device.createBuffer({
      size: Float32Array.BYTES_PER_ELEMENT * BallUniforms.argKeys.length,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const particleBGDescript = createBindGroupDescriptor(
      [0],
      [GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT],
      ['buffer'],
      [{ type: 'uniform' }],
      [[{ buffer: ballUniformsBuffer }]],
      'Particle',
      device
    );

    const numParticles = 256;

    const inputPositionsData = new Float32Array(
      new ArrayBuffer(numParticles * 2 * Float32Array.BYTES_PER_ELEMENT)
    );

    const inputVelocitiesData = new Float32Array(
      new ArrayBuffer(numParticles * 2 * Float32Array.BYTES_PER_ELEMENT)
    );

    const generateParticles = () => {
      for (let i = 0; i < numParticles; i++) {
        console.log(`${i} particle`);
        // Position
        inputPositionsData[i * 2 + 0] =
          -canvas.width + Math.random() * (canvas.width * 2);
        inputPositionsData[i * 2 + 1] =
          -canvas.height + Math.random() * (canvas.height * 2);

        // Velocity
        inputVelocitiesData[i * 2 + 0] = 0;
        inputVelocitiesData[i * 2 + 1] = 0;
      }
    };

    const resetSimulation = () => {
      console.log('Generating new particles');
      generateParticles();
    };

    // Storage Buffers
    const positionsStorageBuffer = device.createBuffer({
      size: numParticles * 2 * Float32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      label: 'Positions.storageBuffer',
    });

    const predictedPositionsStorageBuffer = device.createBuffer({
      size: numParticles * 2 * Float32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      label: 'PredictedPositions.storageBuffer',
    });

    const velocitiesStorageBuffer = device.createBuffer({
      size: numParticles * 2 * Float32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      label: 'Velocities.storageBuffer',
    });

    const densitiesStorageBuffer = device.createBuffer({
      size: numParticles * 2 * Float32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      label: 'Densities.storageBuffer',
    });

    const spatialIndicesStorageBuffer = device.createBuffer({
      size: numParticles * 3 * Uint32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      label: 'SpatialIndices.storageBuffer',
    });

    const spatialOffsetsStorageBuffer = device.createBuffer({
      size: numParticles * Uint32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      label: 'SpatialIndices.storageBuffer',
    });

    // Uniform Buffers
    const particleUniformBuffer = device.createBuffer({
      size: Float32Array.BYTES_PER_ELEMENT * 3,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      label: 'Particles.uniformBuffer',
    });

    const generalUniformBuffer = device.createBuffer({
      size: Float32Array.BYTES_PER_ELEMENT * 3,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      label: 'General.uniformBuffer',
    });

    const fluidStorageBGDescript = createBindGroupDescriptor(
      [0, 1, 2, 3, 4, 5],
      // Output buffer will be written to by compute and read by fragment
      [GPUShaderStage.COMPUTE | GPUShaderStage.VERTEX],
      ['buffer', 'buffer'],
      [{ type: 'storage' }, { type: 'storage' }],
      [
        [
          { buffer: positionsStorageBuffer },
          { buffer: predictedPositionsStorageBuffer },
          { buffer: velocitiesStorageBuffer },
          { buffer: densitiesStorageBuffer },
          { buffer: spatialIndicesStorageBuffer },
          { buffer: spatialOffsetsStorageBuffer },
        ],
      ],
      'StorageBuffers',
      device
    );

    const fluidUniformsBGDescript = createBindGroupDescriptor(
      [0, 1],
      [GPUShaderStage.COMPUTE, GPUShaderStage.COMPUTE],
      ['buffer', 'buffer'],
      [{ type: 'uniform' }, { type: 'uniform' }],
      [[{ buffer: generalUniformBuffer }, { buffer: particleUniformBuffer }]],
      'UniformBuffers',
      device
    );

    const createFluidComputePipeline = (_entryPoint: string) => {
      return device.createComputePipeline({
        layout: device.createPipelineLayout({
          bindGroupLayouts: [
            fluidStorageBGDescript.bindGroupLayout,
            fluidUniformsBGDescript.bindGroupLayout,
          ],
        }),
        compute: {
          module: device.createShaderModule({
            code: FluidComputeShader(maxWorkgroups),
          }),
          entryPoint: _entryPoint,
        },
      });
    };

    const positionsComputePipeline = createFluidComputePipeline(
      'positionComputeMain'
    );
    const viscositiesComputePipeline = createFluidComputePipeline(
      'viscositiesComputeMain'
    );
    const pressureForceComputePipeline = createFluidComputePipeline(
      'pressureForceComputeMain'
    );
    const densitiesComputePipeline = createFluidComputePipeline(
      'densitiesComputeMain'
    );
    const spatialHashComputePipeline = createFluidComputePipeline(
      'spatialHashComputeMain'
    );

    const particleRenderPipeline = create3DRenderPipeline(
      device,
      'Particle',
      [
        particleBGDescript.bindGroupLayout,
        fluidStorageBGDescript.bindGroupLayout,
      ],
      particleShader,
      [],
      particleShader,
      presentationFormat,
      false,
      'triangle-list',
      'front'
    );

    generateParticles();

    gui.add(settings, 'Particle Radius', 0.0, 300.0).step(1.0);
    gui.add(settings, 'Gravity', -20.0, 20.0).step(0.1);
    gui.add(settings, 'Damping', 0.0, 1.0).step(0.1);
    gui.add(settings, 'Reset Simulation').onChange(() => {
      settings.isResetting = true;
      resetSimulation();
      settings.isResetting = false;
    });

    let lastFrame = performance.now();
    device.queue.writeBuffer(positionsStorageBuffer, 0, inputPositionsData);
    device.queue.writeBuffer(velocitiesStorageBuffer, 0, inputVelocitiesData);

    async function frame() {
      if (!pageState.active) return;

      stats.begin();

      const now = performance.now();
      const deltaTime = (now - lastFrame) / 1000;
      lastFrame = now;

      // Write to uniform buffers
      device.queue.writeBuffer(
        generalUniformBuffer,
        0,
        new Float32Array([
          deltaTime,
          canvas.width - settings['Particle Radius'],
          canvas.height - settings['Particle Radius'],
        ])
      );

      device.queue.writeBuffer(
        particleUniformBuffer,
        0,
        new Float32Array([
          settings.Damping,
          settings.Gravity,
          settings['Particle Radius'],
        ])
      );

      // Write to render uniform buffers
      device.queue.writeBuffer(
        ballUniformsBuffer,
        0,
        new Float32Array([
          settings['Particle Radius'],
          canvas.width,
          canvas.height,
        ])
      );

      renderPassDescriptor.colorAttachments[0].view = context
        .getCurrentTexture()
        .createView();

      const commandEncoder = device.createCommandEncoder();

      // Run compute shader to compute particle positions
      const computePassEncoder = commandEncoder.beginComputePass();
      computePassEncoder.setPipeline(positionsComputePipeline);
      computePassEncoder.setBindGroup(0, fluidStorageBGDescript.bindGroups[0]);
      computePassEncoder.setBindGroup(1, fluidUniformsBGDescript.bindGroups[0]);
      computePassEncoder.dispatchWorkgroups(
        Math.ceil(numParticles / maxWorkgroups)
      );
      computePassEncoder.end();

      // Run render shader to render particles as circle sdfs
      const renderPassEncoder =
        commandEncoder.beginRenderPass(renderPassDescriptor);
      renderPassEncoder.setPipeline(particleRenderPipeline);
      renderPassEncoder.setBindGroup(0, particleBGDescript.bindGroups[0]);
      renderPassEncoder.setBindGroup(1, fluidStorageBGDescript.bindGroups[0]);
      renderPassEncoder.draw(6, numParticles, 0, 0);
      renderPassEncoder.end();

      device.queue.submit([commandEncoder.finish()]);
      stats.end();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  },
  ['Add Explanations']
).then((resultInit) => (init = resultInit));

const fluidExample: () => JSX.Element = () =>
  makeSample({
    name: 'Fluid Example',
    description: 'WIP Fluid Sim',
    init,
    coordinateSystem: 'NDC',
    gui: true,
    stats: true,
    sources: [
      {
        name: __filename.substring(__dirname.length + 1),
        contents: __SOURCE__,
      },
    ],
    filename: __filename,
  });

export default fluidExample;
