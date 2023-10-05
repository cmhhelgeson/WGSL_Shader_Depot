import { createBoxMeshWithTangents } from '../../../meshes/box';
import { createMeshRenderable } from '../../../meshes/mesh';
import { createBindGroupDescriptor } from '../../../utils/bindGroup';
import { Base3DRendererClass } from '../../../utils/program/renderProgram';
import { VertexBuiltIn, createRenderShader } from '../../../utils/shaderUtils';
import lightCubeWGSL from './lightCube.wgsl';

type LightCubeRendererArgs = {
  projMat: Float32Array;
  viewMat: Float32Array;
  modelMat: Float32Array;
};

export default class LightCubeRenderer extends Base3DRendererClass {
  static sourceInfo = {
    name: __filename.substring(__dirname.length + 1),
    contents: __SOURCE__,
  };

  switchBindGroup: (name: string) => void;
  setArguments: (args: LightCubeRendererArgs) => void;

  constructor(
    device: GPUDevice,
    presentationFormat: GPUTextureFormat,
    bindGroupNames: string[],
    label: string
  ) {
    super();

    const lightCubeUniformBuffer = device.createBuffer({
      size: 64 * 3,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bgDescript = createBindGroupDescriptor(
      [0],
      [GPUShaderStage.VERTEX],
      ['buffer'],
      [{ type: 'uniform' }],
      [[{ buffer: lightCubeUniformBuffer }]],
      label,
      device
    );

    const vertFormats: GPUVertexFormat[] = [
      'float32x4',
      'float32x3',
      'float32x2',
      'float32x3',
      'float32x3',
    ];

    const lightCubeShader = createRenderShader({
      uniforms: [
        {
          structName: 'SpaceUniforms',
          argKeys: ['projMat', 'viewMat', 'modelMat'],
          dataType: 'mat4x4f',
        },
      ],
      vertexInputs: {
        names: ['position', 'normal', 'uv', 'vert_tan', 'vert_bitan'],
        formats: vertFormats,
      },
      vertexOutput: {
        builtins: VertexBuiltIn.POSITION,
        outputs: [],
      },
      bindGroups: `@group(0) @binding(0) var<uniform> spaceUniforms: SpaceUniforms;\n\n`,
      code: lightCubeWGSL,
    });

    console.log(lightCubeShader);

    this.pipeline = super.createRenderPipeline(
      device,
      'LightCube',
      [bgDescript.bindGroupLayout],
      lightCubeShader,
      vertFormats,
      lightCubeShader,
      presentationFormat,
      true
    );

    this.renderables = [];
    this.renderables.push(
      createMeshRenderable(device, createBoxMeshWithTangents(0.2, 0.2, 0.2))
    );

    this.currentBindGroup = bgDescript.bindGroups[0];
    this.currentBindGroupName = bindGroupNames[0];

    this.bindGroupMap = {};

    bgDescript.bindGroups.forEach((bg, idx) => {
      this.bindGroupMap[bindGroupNames[idx]] = bg;
    });

    this.switchBindGroup = (name: string) => {
      this.currentBindGroup = this.bindGroupMap[name];
      this.currentBindGroupName = name;
    };

    this.setArguments = (args: LightCubeRendererArgs) => {
      super.setUniformArguments(
        device,
        lightCubeUniformBuffer,
        'mat4x4f',
        args,
        Object.keys(args)
      );
    };
  }

  startRun(
    passEncoder: GPURenderPassEncoder | GPURenderBundleEncoder,
    args: LightCubeRendererArgs
  ) {
    this.setArguments(args);
    super.executeRun(passEncoder, this.pipeline, [this.currentBindGroup]);
  }
}
