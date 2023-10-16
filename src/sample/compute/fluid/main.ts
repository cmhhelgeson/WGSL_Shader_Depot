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
import particleWGSL from './particle.wgsl';

let init: SampleInit;
SampleInitFactoryWebGPU(
  async ({ pageState, device, gui, presentationFormat, context, canvas }) => {
    //TODO: hover/target pos system a little too complex, need to simplify
    const settings = {
      //number of cellElements. Must equal widthInCells * heightInCells and workGroupThreads * 2
      Gravity: 9.2,
      'Particle Radius': 5.0,
      offset: 0.0,
    };

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

    console.log(presentationFormat);

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
      code: particleWGSL,
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

    const particlePipeline = create3DRenderPipeline(
      device,
      'Particle',
      [particleBGDescript.bindGroupLayout],
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

    async function frame() {
      if (!pageState.active) return;

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

      //Render Particles using sdfs
      const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
      passEncoder.setPipeline(particlePipeline);
      passEncoder.setBindGroup(0, particleBGDescript.bindGroups[0]);
      passEncoder.draw(6, 2, 0, 0);
      passEncoder.end();

      //Submit commands
      device.queue.submit([commandEncoder.finish()]);
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
