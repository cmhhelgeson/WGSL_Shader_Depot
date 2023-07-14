import fullscreenVertWebGPUWGSL from '../../shaders/fullscreenWebGPU.vert.wgsl';
import { createBindGroupDescriptor } from '../../utils/bindGroup';
import crtFragWGSL from './crt.frag.wgsl';
import crtDebugFragWGSL from './crtDebug.frag.wgsl';
import { BaseRenderer } from '../../utils/renderProgram';

type CRTRendererArgs = {
  time: number;
  textureName: string;
  debugStep: number;
};

export default class CRTRenderer implements BaseRenderer {
  static sourceInfo = {
    name: __filename.substring(__dirname.length + 1),
    contents: __SOURCE__,
  };

  readonly renderPassDescriptor: GPURenderPassDescriptor;
  readonly pipeline: GPURenderPipeline;
  readonly bindGroupMap: Record<string, GPUBindGroup>;
  currentBindGroup: GPUBindGroup;
  currentBindGroupName: string;
  private readonly setTime: (time: number) => void;
  private readonly switchBindGroup: (name: string) => void;
  private setDebugStep: (step: number) => void;

  constructor(
    device: GPUDevice,
    presentationFormat: GPUTextureFormat,
    renderPassDescriptor: GPURenderPassDescriptor,
    bindGroupNames: string[],
    textures: GPUTexture[],
    label: string,
    debug = false
  ) {
    this.renderPassDescriptor = renderPassDescriptor;
    let uniformElements = 1;
    if (debug) {
      uniformElements += 1;
    }

    const uniformBufferSize = Float32Array.BYTES_PER_ELEMENT * uniformElements;
    const uniformBuffer = device.createBuffer({
      size: uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const sampler = device.createSampler({
      minFilter: 'linear',
      magFilter: 'linear',
    });

    const resourceArr = textures.map((texture) => {
      return [{ buffer: uniformBuffer }, sampler, texture.createView()];
    });
    console.log(resourceArr);

    const bgDescript = createBindGroupDescriptor(
      [0, 1, 2],
      [GPUShaderStage.FRAGMENT],
      ['buffer', 'sampler', 'texture'],
      [{ type: 'uniform' }, { type: 'filtering' }, { sampleType: 'float' }],
      resourceArr,
      label,
      device
    );

    this.currentBindGroup = bgDescript.bindGroups[0];
    this.currentBindGroupName = bindGroupNames[0];

    this.bindGroupMap = {};

    bgDescript.bindGroups.forEach((bg, idx) => {
      this.bindGroupMap[bindGroupNames[idx]] = bg;
    });

    console.log(this.bindGroupMap);

    this.pipeline = device.createRenderPipeline({
      label: 'CRTRenderer.pipeline',
      layout: device.createPipelineLayout({
        bindGroupLayouts: [bgDescript.bindGroupLayout],
      }),
      vertex: {
        module: device.createShaderModule({
          code: fullscreenVertWebGPUWGSL,
        }),
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: device.createShaderModule({
          code: debug ? crtDebugFragWGSL : crtFragWGSL,
        }),
        entryPoint: 'fragmentMain',
        targets: [
          {
            format: presentationFormat,
          },
        ],
      },
      primitive: {
        topology: 'triangle-list',
        cullMode: 'none',
      },
    });

    this.setTime = (time: number) => {
      device.queue.writeBuffer(uniformBuffer, 0, new Float32Array([time]));
    };

    if (debug) {
      this.setDebugStep = (step: number) => {
        const offset = (uniformElements - 1) * Float32Array.BYTES_PER_ELEMENT;
        device.queue.writeBuffer(
          uniformBuffer,
          offset,
          new Float32Array([step])
        );
      };
    } else {
      this.setDebugStep = (step: number) => {
        return;
      };
    }

    this.switchBindGroup = (name: string) => {
      this.currentBindGroup = this.bindGroupMap[name];
      this.currentBindGroupName = name;
    };
  }

  run(commandEncoder: GPUCommandEncoder, args: CRTRendererArgs) {
    this.setTime(args.time);
    this.setDebugStep(args.debugStep);
    if (args.textureName !== this.currentBindGroupName) {
      this.switchBindGroup(args.textureName);
    }
    const passEncoder = commandEncoder.beginRenderPass(
      this.renderPassDescriptor
    );
    passEncoder.setPipeline(this.pipeline);
    passEncoder.setBindGroup(0, this.currentBindGroup);
    passEncoder.draw(6, 1, 0, 0);
    passEncoder.end();
  }
}
