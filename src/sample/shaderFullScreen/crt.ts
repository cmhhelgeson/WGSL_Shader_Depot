import fullscreenVertWebGLWGSL from '../../shaders/fullscreenWebGL.vert.wgsl';
import fullscreenVertWebGPUWGSL from '../../shaders/fullscreenWebGPU.vert.wgsl';
import { createBindGroupDescriptor } from '../../utils/bindGroup';
import crtFragWGSL from './crt.frag.wgsl';

type CRTRendererArgs = {
  time: number;
  textureName: string;
};

export default class CRTRenderer {
  static sourceInfo = {
    name: __filename.substring(__dirname.length + 1),
    contents: __SOURCE__,
  };

  private readonly renderPassDescriptor: GPURenderPassDescriptor;
  private readonly pipeline: GPURenderPipeline;
  private readonly bindGroupMap: Record<string, GPUBindGroup>;
  private readonly setTime: (time: number) => void;
  private readonly switchBindGroup: (name: string) => void;
  private currentBindGroup: GPUBindGroup;
  private currentBindGroupName: string;

  constructor(
    device: GPUDevice,
    presentationFormat: GPUTextureFormat,
    renderPassDescriptor: GPURenderPassDescriptor,
    bindGroupNames: string[],
    textures: GPUTexture[],
    label: string
  ) {
    this.renderPassDescriptor = renderPassDescriptor;

    const uniformBufferSize = Float32Array.BYTES_PER_ELEMENT * 1;
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
      label: 'GridRenderer.pipeline',
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
          code: crtFragWGSL,
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

    this.switchBindGroup = (name: string) => {
      this.currentBindGroup = this.bindGroupMap[name];
      this.currentBindGroupName = name;
    };
  }

  run(commandEncoder: GPUCommandEncoder, args: CRTRendererArgs) {
    this.setTime(args.time);
    if (args.textureName !== this.currentBindGroupName) {
      this.switchBindGroup(args.textureName);
    }
    const passEncoder = commandEncoder.beginRenderPass(
      this.renderPassDescriptor
    );
    passEncoder.setPipeline(this.pipeline);
    passEncoder.setBindGroup(0, this.currentBindGroup);
    passEncoder.draw(8, 1, 0, 0);
    passEncoder.end();
  }
}
