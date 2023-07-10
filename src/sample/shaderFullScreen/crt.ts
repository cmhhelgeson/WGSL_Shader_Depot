import fullscreenVertWGSL from '../../shaders/fullscreenWebGL.vert.wgsl';
import { createBindGroupDescriptor } from '../../utils/bindGroup';
import gridFragWGSL from './grid.frag.wgsl';

type CRTArguments = {
  time: number,
};

export default class CRTRenderer {
  static sourceInfo = {
    name: __filename.substring(__dirname.length + 1),
    contents: __SOURCE__,
  };

  private readonly renderPassDescriptor: GPURenderPassDescriptor;
  private readonly pipeline: GPURenderPipeline;
  private readonly bindGroupMap: Record<string, GPUBindGroup>[];

  private currentBindGroup: GPUBindGroup;

  constructor(
    device: GPUDevice,
    presentationFormat: GPUTextureFormat,
    renderPassDescriptor: GPURenderPassDescriptor,
    bindGroupNames: string[],
    textures: GPUTexture[],
    label: string
  ) {
    this.renderPassDescriptor = renderPassDescriptor;

    const uniformBufferSize = Float32Array.BYTES_PER_ELEMENT * 2;
    const uniformBuffer = device.createBuffer({
      size: uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const resourceArr = textures.map((texture) => {
      return [{ buffer: uniformBuffer }, texture.createView()];
    });

    const bgDescript = createBindGroupDescriptor(
      [0, 1],
      [GPUShaderStage.FRAGMENT],
      ['buffer', 'texture'],
      [{ type: 'uniform' }, { sampleType: 'float' }],
      resourceArr,
      label,
      device
    );

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
          code: fullscreenVertWGSL,
        }),
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: device.createShaderModule({
          code: gridFragWGSL,
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
  }

  switchToBindGroup(name: string) {
    this.currentBindGroup = this.bindGroupMap[name];
  }

  run(commandEncoder: GPUCommandEncoder) {
    const passEncoder = commandEncoder.beginRenderPass(
      this.renderPassDescriptor
    );
    passEncoder.setPipeline(this.pipeline);
    passEncoder.setBindGroup(0, this.currentBindGroup);
    passEncoder.draw(8, 1, 0, 0);
    passEncoder.end();
  }
}
