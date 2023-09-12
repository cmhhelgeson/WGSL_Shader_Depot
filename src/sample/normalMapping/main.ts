import { mat4, vec3 } from 'wgpu-matrix';
import {
  makeSample,
  SampleInit,
} from '../../components/SampleLayout/SampleLayout';

import normalMapWGSL from './normalMap.wgsl';
import {
  MESH_VERTEX_FEATURE,
  createMeshRenderable,
  createMeshVertexBufferLayout,
} from '../../meshes/mesh';
import { createBoxMeshWithTangents } from '../../meshes/box';
import { SampleInitFactoryWebGPU } from '../../components/SampleLayout/SampleLayoutUtils';
import { createTextureFromImage } from '../../utils/texture';
import { createBindGroupDescriptor } from '../../utils/bindGroup';

const MAT4X4_BYTES = 64;

// Inspired by the following articles
// https://apoorvaj.io/exploring-bump-mapping-with-webgl/
// https://learnopengl.com/Advanced-Lighting/Parallax-Mapping
// https://toji.dev/webgpu-best-practices/bind-groups.html
let init: SampleInit;
SampleInitFactoryWebGPU(
  async ({ canvas, pageState, gui, device, context, presentationFormat }) => {
    interface GUISettings {
      'Bump Mode': 'None' | 'Normal';
    }

    const settings: GUISettings = {
      'Bump Mode': 'Normal',
    };
    gui.add(settings, 'Bump Mode', ['None', 'Normal']);

    const depthTexture = device.createTexture({
      size: [canvas.width, canvas.height],
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    //4 4x4 mats, proj, view, normal, model
    const uniformBufferSize = MAT4X4_BYTES * 4;
    const uniformBuffer = device.createBuffer({
      size: uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const mapMethodBufferSize = 8; // u32
    const mapMethodBuffer = device.createBuffer({
      size: mapMethodBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Fetch the image and upload it into a GPUTexture.
    let woodTexture: GPUTexture;
    {
      const response = await fetch(
        new URL(
          '../../../assets/img/toy_box_diffuse.png',
          import.meta.url
        ).toString()
      );
      const imageBitmap = await createImageBitmap(await response.blob());
      woodTexture = createTextureFromImage(device, imageBitmap);
    }

    let woodNormalTexture: GPUTexture;
    {
      const response = await fetch(
        new URL(
          '../../../assets/img/toy_box_normal.png',
          import.meta.url
        ).toString()
      );
      const imageBitmap = await createImageBitmap(await response.blob());
      woodNormalTexture = createTextureFromImage(device, imageBitmap);
    }

    let woodDepthTexture: GPUTexture;
    {
      const response = await fetch(
        new URL(
          '../../../assets/img/toy_box_disp.png',
          import.meta.url
        ).toString()
      );
      const imageBitmap = await createImageBitmap(await response.blob());
      woodDepthTexture = createTextureFromImage(device, imageBitmap);
    }

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

    const toybox = createMeshRenderable(
      device,
      createBoxMeshWithTangents(1.0, 1.0, 1.0)
    );

    const frameBGDescriptor = createBindGroupDescriptor(
      [0, 1],
      [GPUShaderStage.VERTEX, GPUShaderStage.FRAGMENT],
      ['buffer', 'buffer'],
      [{ type: 'uniform' }, { type: 'uniform' }],
      [[{ buffer: uniformBuffer }, { buffer: mapMethodBuffer }]],
      'Frame',
      device
    );

    const toyboxBGDescriptor = createBindGroupDescriptor(
      [0, 1, 2, 3],
      [GPUShaderStage.FRAGMENT],
      ['sampler', 'texture', 'texture', 'texture'],
      [
        { type: 'filtering' },
        { sampleType: 'float' },
        { sampleType: 'float' },
        { sampleType: 'float' },
      ],
      [
        [
          sampler,
          woodTexture.createView(),
          woodNormalTexture.createView(),
          woodDepthTexture.createView(),
        ],
      ],
      'Toybox',
      device
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

    const getMappingType = (arr: Uint32Array) => {
      switch (settings['Bump Mode']) {
        case 'None':
          arr[0] = 0;
          break;
        case 'Normal':
          arr[0] = 1;
          break;
      }
    };

    const getParallaxScale = (arr: Float32Array) => {
      arr[0] = settings['Parallax Scale'];
    };

    const mappingType: Uint32Array = new Uint32Array([0]);
    const parallaxScale: Float32Array = new Float32Array([0]);

    const viewMatrixTemp = getViewMatrix();
    const viewMatrix = viewMatrixTemp as Float32Array;

    const pipeline = device.createRenderPipeline({
      layout: device.createPipelineLayout({
        bindGroupLayouts: [
          frameBGDescriptor.bindGroupLayout,
          toyboxBGDescriptor.bindGroupLayout,
        ],
      }),
      vertex: {
        module: device.createShaderModule({
          code: normalMapWGSL,
        }),
        entryPoint: 'vertexMain',
        buffers: createMeshVertexBufferLayout({
          features: MESH_VERTEX_FEATURE.TANGENT | MESH_VERTEX_FEATURE.BITANGENT,
        }),
      },
      fragment: {
        module: device.createShaderModule({
          code: normalMapWGSL,
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
        cullMode: 'back',
      },

      depthStencil: {
        depthWriteEnabled: true,
        depthCompare: 'less',
        format: 'depth24plus',
      },
    });

    function frame() {
      // Sample is no longer the active page.
      if (!pageState.active) return;
      //I really wish all these different APIS
      //were consistent when they talk about bytes and elements

      device.queue.writeBuffer(
        uniformBuffer,
        MAT4X4_BYTES * 0,
        projectionMatrix.buffer,
        projectionMatrix.byteOffset,
        projectionMatrix.byteLength
      );

      device.queue.writeBuffer(
        uniformBuffer,
        MAT4X4_BYTES * 1,
        viewMatrix.buffer,
        viewMatrix.byteOffset,
        viewMatrix.byteLength
      );

      const modelMatrixTemp = getModelMatrix();
      const normalMatrix = mat4.transpose(
        mat4.invert(mat4.multiply(modelMatrixTemp, viewMatrixTemp))
      ) as Float32Array;
      const modelMatrix = modelMatrixTemp as Float32Array;

      device.queue.writeBuffer(
        uniformBuffer,
        MAT4X4_BYTES * 2,
        normalMatrix.buffer,
        normalMatrix.byteOffset,
        normalMatrix.byteLength
      );

      device.queue.writeBuffer(
        uniformBuffer,
        MAT4X4_BYTES * 3,
        modelMatrix.buffer,
        modelMatrix.byteOffset,
        modelMatrix.byteLength
      );

      getMappingType(mappingType);
      getParallaxScale(parallaxScale);

      device.queue.writeBuffer(
        mapMethodBuffer,
        0,
        mappingType.buffer,
        mappingType.byteOffset,
        mappingType.byteLength
      );

      device.queue.writeBuffer(
        mapMethodBuffer,
        4,
        parallaxScale.buffer,
        parallaxScale.byteOffset,
        parallaxScale.byteLength
      );

      renderPassDescriptor.colorAttachments[0].view = context
        .getCurrentTexture()
        .createView();

      const commandEncoder = device.createCommandEncoder();
      const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
      passEncoder.setPipeline(pipeline);
      passEncoder.setBindGroup(0, frameBGDescriptor.bindGroups[0]);
      passEncoder.setBindGroup(1, toyboxBGDescriptor.bindGroups[0]);
      passEncoder.setVertexBuffer(0, toybox.vertexBuffer);
      passEncoder.setIndexBuffer(toybox.indexBuffer, 'uint16');
      passEncoder.drawIndexed(toybox.indexCount);
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
