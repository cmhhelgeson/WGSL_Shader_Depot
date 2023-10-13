import { mat4, vec3 } from 'wgpu-matrix';
import {
  makeSample,
  SampleInit,
} from '../../../components/SampleLayout/SampleLayout';
import wireFrameWGSL from './wireframe.wgsl';
import solidMeshWGSL from './solidMesh.wgsl';
import { VertexProperty, createMeshRenderable } from '../../../meshes/mesh';
import { createBoxMesh } from '../../../meshes/box';
import { SampleInitFactoryWebGPU } from '../../../components/SampleLayout/SampleLayoutUtils';
import { createBindGroupDescriptor } from '../../../utils/bindGroup';
import { create3DRenderPipeline } from '../../../utils/program/renderProgram';
import { writeMat4ToBuffer } from '../../../utils/buffer';
import {
  UniformDefiner,
  VertexBuiltIn,
  createRenderShader,
} from '../../../utils/shaderUtils';
import { createSphereMesh } from '../../../meshes/sphere';
const MAT4X4_BYTES = 64;

let init: SampleInit;
SampleInitFactoryWebGPU(
  async ({ canvas, pageState, gui, device, context, presentationFormat }) => {
    const settings = {
      cameraPosX: 0.0,
      cameraPosY: 0.0,
      cameraPosZ: -4.1,
      lineThickness: 1.0,
      'Render Mode': 'Wireframe',
    };

    //Create normal mapping resources and pipeline
    const depthTexture = device.createTexture({
      size: [canvas.width, canvas.height],
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    const spaceUniformsBuffer = device.createBuffer({
      size: MAT4X4_BYTES * 3,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const lineUniformsBuffer = device.createBuffer({
      //One extra element needed due to padding
      size: Float32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    //

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

    const toyboxIndexFormat = 'uint32';
    const toybox = createMeshRenderable(
      device,
      createBoxMesh(
        1.0,
        1.0,
        1.0,
        1.0,
        1.0,
        1.0,
        VertexProperty.POSITION,
        toyboxIndexFormat
      ),
      true,
      true
    );

    const wireFrameBGDescript = createBindGroupDescriptor(
      [0, 1, 2, 3],
      [
        GPUShaderStage.VERTEX,
        GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        GPUShaderStage.VERTEX,
        GPUShaderStage.VERTEX,
      ],
      ['buffer', 'buffer', 'buffer', 'buffer'],
      [
        { type: 'uniform' },
        { type: 'uniform' },
        { type: 'read-only-storage' },
        { type: 'read-only-storage' },
      ],
      [
        [
          { buffer: spaceUniformsBuffer },
          { buffer: lineUniformsBuffer },
          { buffer: toybox.vertexBuffer },
          { buffer: toybox.indexBuffer },
        ],
      ],
      'Wireframe',
      device
    );

    const vertexDataFormats: GPUVertexFormat[] = ['float32x3'];
    const vertexShaderFormats: GPUVertexFormat[] = ['float32x4'];

    const SpaceUniforms: UniformDefiner = {
      structName: 'SpaceUniforms',
      argKeys: ['projMat', 'viewMat', 'modelMat'],
      dataType: 'mat4x4f',
    };

    const wireFrameShaderCode = createRenderShader({
      uniforms: [
        SpaceUniforms,
        {
          structName: 'LineUniforms',
          argKeys: ['lineThickness'],
          dataType: 'f32',
        },
      ],
      vertexInputs: {
        names: [],
        formats: [],
        builtins: VertexBuiltIn.VERTEX_INDEX | VertexBuiltIn.INSTANCE_INDEX,
      },
      vertexOutput: {
        builtins: VertexBuiltIn.POSITION,
        outputs: [],
      },
      code: wireFrameWGSL,
    });

    const solidMeshShaderCode = createRenderShader({
      uniforms: [SpaceUniforms],
      vertexInputs: {
        names: ['position'],
        formats: ['float32x4'],
        builtins: VertexBuiltIn.VERTEX_INDEX,
      },
      vertexOutput: {
        builtins: VertexBuiltIn.POSITION,
        outputs: [],
      },
      code: solidMeshWGSL,
    });

    const wireFramePipeline = create3DRenderPipeline(
      device,
      'Wireframe',
      [wireFrameBGDescript.bindGroupLayout],
      wireFrameShaderCode,
      [],
      wireFrameShaderCode,
      presentationFormat,
      true,
      'line-list'
    );

    const solidMeshPipeline = create3DRenderPipeline(
      device,
      'SolidMesh',
      [wireFrameBGDescript.bindGroupLayout],
      solidMeshShaderCode,
      vertexDataFormats,
      solidMeshShaderCode,
      presentationFormat,
      true,
      'triangle-list'
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

    let currentPipeline = wireFramePipeline;

    gui.add(settings, 'cameraPosX', -5, 5).step(0.1);
    gui.add(settings, 'cameraPosY', -5, 5).step(0.1);
    gui.add(settings, 'cameraPosZ', -5, 5).step(0.1);
    gui.add(settings, 'lineThickness').step(0.1);
    gui
      .add(settings, 'Render Mode', ['Solid Mesh', 'Wireframe'])
      .onChange(() => {
        switch (settings['Render Mode']) {
          case 'Solid Mesh':
            {
              currentPipeline = solidMeshPipeline;
            }
            break;
          case 'Wireframe':
            {
              currentPipeline = wireFramePipeline;
            }
            break;
        }
      });

    function frame() {
      // Sample is no longer the active page.
      if (!pageState.active) return;

      //Write to normal map shader
      const viewMatrixTemp = getViewMatrix();
      const viewMatrix = viewMatrixTemp as Float32Array;

      const modelMatrixTemp = getModelMatrix();
      const modelMatrix = modelMatrixTemp as Float32Array;

      writeMat4ToBuffer(device, spaceUniformsBuffer, [
        projectionMatrix,
        viewMatrix,
        modelMatrix,
      ]);

      device.queue.writeBuffer(
        lineUniformsBuffer,
        0,
        new Float32Array([settings.lineThickness])
      );

      renderPassDescriptor.colorAttachments[0].view = context
        .getCurrentTexture()
        .createView();

      const commandEncoder = device.createCommandEncoder();
      const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
      //Draw wireframe Cube
      //passEncoder.setPipeline(wireFramePipeline);
      passEncoder.setPipeline(currentPipeline);
      passEncoder.setBindGroup(0, wireFrameBGDescript.bindGroups[0]);
      passEncoder.setVertexBuffer(0, toybox.vertexBuffer);
      passEncoder.setIndexBuffer(toybox.indexBuffer, toyboxIndexFormat);
      passEncoder.drawIndexed(toybox.indexCount);
      //End Pass Encoder
      passEncoder.end();
      device.queue.submit([commandEncoder.finish()]);

      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  },
  []
).then((resultInit) => (init = resultInit));

const Wireframe: () => JSX.Element = () =>
  makeSample({
    name: 'Wireframe',
    description: 'Simple vertex pulling wireframe shader',
    gui: true,
    init,
    coordinateSystem: 'NDC',
    sources: [
      {
        name: __filename.substring(__dirname.length + 1),
        contents: __SOURCE__,
      },
      {
        name: './wireframe.wgsl',
        contents: wireFrameWGSL,
        editable: true,
      },
      {
        name: '../../../meshes/box.ts',
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        contents: require('!!raw-loader!../../../meshes/box.ts').default,
      },
    ],
    filename: __filename,
  });

export default Wireframe;
