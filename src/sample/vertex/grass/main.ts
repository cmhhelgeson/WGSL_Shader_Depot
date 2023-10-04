import { mat4, vec3 } from 'wgpu-matrix';
import {
  makeSample,
  SampleInit,
} from '../../../components/SampleLayout/SampleLayout';
import { matUniformArgKeys, fogUniformArgKeys, TerrainVertexShader } from './shader';
import { SampleInitFactoryWebGPU } from '../../../components/SampleLayout/SampleLayoutUtils';
import { createMeshRenderable } from '../../../meshes/mesh';
import { createBindGroupDescriptor } from '../../../utils/bindGroup';
import { create3DRenderPipeline } from '../../../utils/program/renderProgram';
import { createPlaneMesh } from '../../../meshes/plane';

let init: SampleInit;
SampleInitFactoryWebGPU(
  async ({ canvas, pageState, gui, device, context, presentationFormat }) => {

    //Create normal mapping resources and pipeline
    const depthTexture = device.createTexture({
      size: [canvas.width, canvas.height],
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    const fogUniformsBuffer = device.createBuffer({
      size: Float32Array.BYTES_PER_ELEMENT * fogUniformArgKeys.length,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const matUniformsBuffer = device.createBuffer({
      size: 64 * matUniformArgKeys.length,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    // Create a sampler with linear filtering for smooth interpolation.
    const sampler = device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
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

    const planeMesh = createMeshRenderable(
      device,
      createPlaneMesh(1.0, 1.0, 1.0)
    );

    const terrainBGDescriptor = createBindGroupDescriptor(
      [0, 1],
      [GPUShaderStage.VERTEX, GPUShaderStage.FRAGMENT],
      ['buffer', 'buffer'],
      [{ type: 'uniform' }, [{ type: 'uniform' }]],
      [[{ buffer: matUniformsBuffer }, { buffer: fogUniformsBuffer }]],
      'Terrain',
      device
    );

    //Position, normal, uv
    const vFormats: GPUVertexFormat[] = ['float32x4', 'float32x3', 'float32x2'];

    const terrainRenderer = create3DRenderPipeline(
      device,
      'Terrain',
      [terrainBGDescriptor.bindGroupLayout],
      TerrainVertexShader(vFormats),
      vFormats,
      TerrainVertexShader(vFormats),
      presentationFormat,
      true,
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
      mat4.translate(
        viewMatrix,
        vec3.fromValues(
          settings.cameraPosX,
          settings.cameraPosY,
          settings.cameraPosZ
        ),
        viewMatrix
      );
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



    function frame() {
      // Sample is no longer the active page.
      if (!pageState.active) return;

      //Write to normal map shader
      const viewMatrixTemp = getViewMatrix();
      const viewMatrix = viewMatrixTemp as Float32Array;

      const modelMatrixTemp = getModelMatrix();
      const normalMatrix = mat4.transpose(
        mat4.invert(modelMatrixTemp)
      ) as Float32Array;
      const modelMatrix = modelMatrixTemp as Float32Array;

      writeMat4ToBuffer(device, uniformBuffer, [
        projectionMatrix,
        viewMatrix,
        normalMatrix,
        modelMatrix,
      ]);

      getMappingType(mappingType);

      write32ToBuffer(device, mapMethodBuffer, [mappingType]);
      console.log(settings.depthLayers);
      device.queue.writeBuffer(
        mapMethodBuffer,
        4,
        new Float32Array([
          settings.lightPosX,
          settings.lightPosY,
          settings.lightPosZ,
          settings.lightIntensity,
          settings.depthScale,
          settings.depthLayers,
        ])
      );

      //Write to lightcube shader
      const lightCubeModelMatrix = getLightCubeModelMatrix();
      writeMat4ToBuffer(device, lightCubeUniformBuffer, [
        lightCubeModelMatrix,
        viewMatrix,
        projectionMatrix,
      ]);

      renderPassDescriptor.colorAttachments[0].view = context
        .getCurrentTexture()
        .createView();

      const commandEncoder = device.createCommandEncoder();
      const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
      //Draw textured Cube
      passEncoder.setPipeline(texturedCubePipeline);
      passEncoder.setBindGroup(0, frameBGDescriptor.bindGroups[0]);
      passEncoder.setBindGroup(1, toyboxBGDescriptor.bindGroups[0]);
      passEncoder.setVertexBuffer(0, toybox.vertexBuffer);
      passEncoder.setIndexBuffer(toybox.indexBuffer, 'uint16');
      passEncoder.drawIndexed(toybox.indexCount);
      //Draw LightBox
      passEncoder.setPipeline(lightCubePipeline);
      passEncoder.setBindGroup(0, lightCubeBGDescriptor.bindGroups[0]);
      passEncoder.setVertexBuffer(0, lightCube.vertexBuffer);
      passEncoder.setIndexBuffer(lightCube.indexBuffer, 'uint16');
      passEncoder.drawIndexed(lightCube.indexCount);
      //End Pass Encoder
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
        name: './lightcube.wgsl',
        contents: lightCubeWGSL,
        editable: true,
      },
      {
        name: '../../../meshes/cube.ts',
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        contents: require('!!raw-loader!../../../meshes/cube.ts').default,
      },
    ],
    filename: __filename,
  });

export default NormalMapping;
