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
  async ({ pageState, device, gui, presentationFormat, context, canvas }) => {
    //TODO: hover/target pos system a little too complex, need to simplify
    const settings = {
      //number of cellElements. Must equal widthInCells * heightInCells and workGroupThreads * 2
      Gravity: 9.8,
      'Particle Radius': 10.0,
      Damping: 0.7,
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
      argKeys: ['radius', 'offset', 'canvasWidth', 'canvasHeight'],
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

    // Define resources for compute shader
    // 3 elements for color, 1 padding byte, 2 for position, 2 for velocity
    const elementsPerParticle = 8;
    const numParticles = 256;
    const particlesBufferSize =
      elementsPerParticle * numParticles * Float32Array.BYTES_PER_ELEMENT;

    let inputParticlesData = new Float32Array(
      new ArrayBuffer(particlesBufferSize)
    );

    for (let i = 0; i < numParticles; i += elementsPerParticle) {
      // Color
      inputParticlesData[i * elementsPerParticle + 0] = 0.65;
      inputParticlesData[1] = 0.8;
      inputParticlesData[2] = 1;
      // inputParticles[3] Padding Byte

      // Position
      inputParticlesData[4] = -(elementsPerParticle / 2) + i;
      inputParticlesData[5] = 0;

      // Velocity
      inputParticlesData[6] = 0;
      inputParticlesData[7] = 0;
    }

    // Particles Buffer
    const inputParticlesBuffer = device.createBuffer({
      size: particlesBufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    const outputParticlesBuffer = device.createBuffer({
      size: particlesBufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
    const stagingParticlesBuffer = device.createBuffer({
      size: particlesBufferSize,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });

    const particleUniformsBuffer = device.createBuffer({
      size: Float32Array.BYTES_PER_ELEMENT * 3,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const generalUniformsBuffer = device.createBuffer({
      size: Float32Array.BYTES_PER_ELEMENT * 3,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const fluidStorageBGDescript = createBindGroupDescriptor(
      [0, 1],
      // Output buffer will be written to by compute and read by fragment
      [GPUShaderStage.COMPUTE | GPUShaderStage.VERTEX, GPUShaderStage.COMPUTE],
      ['buffer', 'buffer'],
      [{ type: 'read-only-storage' }, { type: 'storage' }],
      [[{ buffer: inputParticlesBuffer }, { buffer: outputParticlesBuffer }]],
      'StorageBuffers',
      device
    );

    const fluidUniformsBGDescript = createBindGroupDescriptor(
      [0, 1],
      [GPUShaderStage.COMPUTE, GPUShaderStage.COMPUTE],
      ['buffer', 'buffer'],
      [{ type: 'uniform' }, { type: 'uniform' }],
      [[{ buffer: generalUniformsBuffer }, { buffer: particleUniformsBuffer }]],
      'UniformBuffers',
      device
    );

    // Create Compute and Render Pipelines
    const fluidComputePipeline = device.createComputePipeline({
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
        entryPoint: 'computeMain',
      },
    });

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

    gui.add(settings, 'Particle Radius', 0.0, 100.0).step(1.0);
    gui.add(settings, 'offset', -100.0, 100.0).step(0.1);

    let lastFrame = performance.now();

    async function frame() {
      if (!pageState.active) return;

      const now = performance.now();
      const deltaTime = (now - lastFrame) / 1000;
      lastFrame = now;

      // Write to storage buffers
      device.queue.writeBuffer(inputParticlesBuffer, 0, inputParticlesData);

      // Write to compute uniform buffers
      device.queue.writeBuffer(
        generalUniformsBuffer,
        0,
        new Float32Array([deltaTime, canvas.width / 2, canvas.height / 2])
      );

      device.queue.writeBuffer(
        particleUniformsBuffer,
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
          settings.offset,
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
      computePassEncoder.setPipeline(fluidComputePipeline);
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

      // Copy output buffer to staging buffer to nput buffer
      commandEncoder.copyBufferToBuffer(
        outputParticlesBuffer,
        0,
        stagingParticlesBuffer,
        0,
        particlesBufferSize
      );
      device.queue.submit([commandEncoder.finish()]);
      await stagingParticlesBuffer.mapAsync(
        GPUMapMode.READ,
        0,
        particlesBufferSize
      );
      const copyArrayBuffer = stagingParticlesBuffer.getMappedRange(
        0,
        particlesBufferSize
      );
      const data = copyArrayBuffer.slice(0);
      const computedParticlesOutput = new Float32Array(data);
      //Unmap stagingBuffer all that data goes by by
      stagingParticlesBuffer.unmap();
      //Set the current input to the computed result of the GPU calculation
      inputParticlesData = computedParticlesOutput;
      console.log(inputParticlesData);
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
    sources: [
      {
        name: __filename.substring(__dirname.length + 1),
        contents: __SOURCE__,
      },
    ],
    filename: __filename,
  });

export default fluidExample;
