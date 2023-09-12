import { mat4, vec3 } from 'wgpu-matrix';
import {
  makeSample,
  SampleInit,
} from '../../components/SampleLayout/SampleLayout';
import normalMapWGSL from './normalMap.wgsl';
import { SampleInitFactoryWebGPU } from '../../components/SampleLayout/SampleLayoutUtils';
import { createBindGroupDescriptor } from '../../utils/bindGroup';
import { create3DRenderPipeline } from '../../utils/renderProgram';
import { writeMat4ToBuffer } from '../../utils/buffer';

import GaussianSplatShader from './gaussSplat.wgsl';

const MAT4X4_BYTES = 64;

// Inspired by the following articles
// https://apoorvaj.io/exploring-bump-mapping-with-webgl/
// https://learnopengl.com/Advanced-Lighting/Parallax-Mapping
// https://toji.dev/webgpu-best-practices/bind-groups.html
let init: SampleInit;
SampleInitFactoryWebGPU(
  async ({ canvas, pageState, gui, device, context, presentationFormat }) => {
    const depthTexture = device.createTexture({
      size: [canvas.width, canvas.height],
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    const uniformBuffer = device.createBuffer({
      size: MAT4X4_BYTES * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [
        {
          view: undefined, // Assigned later

          clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
      depthStencilAttachment: {
        view: depthTexture.createView(),

        depthClearValue: 1.0,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
      },
    };

    const matBuffer = device.createBuffer({
      size: 64 * 2,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const vec2Buffer = device.createBuffer({
      size: Float32Array.BYTES_PER_ELEMENT * 2 * 2,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bgDescript = createBindGroupDescriptor(
      [0, 1],
      [
        GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
      ],
      ['buffer', 'buffer'],
      [{ type: 'uniform' }, { type: 'uniform' }],
      [[{ buffer: matBuffer }, { buffer: vec2Buffer }]],
      'GaussianSplat',
      device
    );

    const pipeline = create3DRenderPipeline(
      device,
      'GaussianSplat',
      [bgDescript.bindGroupLayout],
      GaussianSplatShader,
      ['float32x4', 'float32x4', 'float32x4', 'float32x4'],
      GaussianSplatShader,
      presentationFormat
    );

    const aspect = canvas.width / canvas.height;
    const projectionMatrix = mat4.perspective(
      (2 * Math.PI) / 5,
      aspect,
      1,
      100.0
    ) as Float32Array;

    function getViewMatrix() {
      const viewMatrix = mat4.identity();
      mat4.translate(viewMatrix, vec3.fromValues(0, 0, -2), viewMatrix);
      return viewMatrix;
    }

    function getModelMatrix() {
      const modelMatrix = mat4.create();
      mat4.identity(modelMatrix);
      mat4.rotateX(modelMatrix, 10, modelMatrix);
      const now = Date.now() / 1000;
      mat4.rotateY(modelMatrix, now * -0.5, modelMatrix);
      return modelMatrix;
    }

    const viewMatrixTemp = getViewMatrix();
    const viewMatrix = viewMatrixTemp as Float32Array;

    function frame() {
      // Sample is no longer the active page.
      if (!pageState.active) return;

      const modelMatrixTemp = getModelMatrix();
      const normalMatrix = mat4.transpose(
        mat4.invert(mat4.multiply(modelMatrixTemp, viewMatrixTemp))
      ) as Float32Array;
      const modelMatrix = modelMatrixTemp as Float32Array;

      writeMat4ToBuffer(device, uniformBuffer, [
        projectionMatrix,
        viewMatrix,
        normalMatrix,
        modelMatrix,
      ]);

      renderPassDescriptor.colorAttachments[0].view = context
        .getCurrentTexture()
        .createView();

      const commandEncoder = device.createCommandEncoder();
      const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
      passEncoder.setPipeline(pipeline);
      passEncoder.setBindGroup(0, bgDescript.bindGroups[0]);
      passEncoder.end();
      device.queue.submit([commandEncoder.finish()]);

      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  },
  []
).then((resultInit) => (init = resultInit));

const NormalMapping: () => JSX.Element = () =>
  makeSample({
    name: 'Normal Mapping',
    description:
      'This example shows how to apply normal maps to a textured mesh.',
    gui: true,
    init,
    coordinateSystem: 'NDC',
    sources: [
      {
        name: __filename.substring(__dirname.length + 1),
        contents: __SOURCE__,
      },
      {
        name: './normalMap.wgsl',
        contents: normalMapWGSL,
        editable: true,
      },
      {
        name: '../../meshes/cube.ts',
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        contents: require('!!raw-loader!../../meshes/cube.ts').default,
      },
    ],
    filename: __filename,
  });

export default NormalMapping;
