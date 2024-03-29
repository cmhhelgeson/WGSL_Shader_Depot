import { mat4, vec3 } from 'wgpu-matrix';
import {
  makeSample,
  SampleInit,
} from '../../../components/SampleLayout/SampleLayout';
import normalMapWGSL from './normalMap.wgsl';
import lightCubeWGSL from './lightCube.wgsl';
import { createMeshRenderable } from '../../../meshes/mesh';
import { createBoxMeshWithTangents } from '../../../meshes/box';
import { SampleInitFactoryWebGPU } from '../../../components/SampleLayout/SampleLayoutUtils';
import { PBRDescriptor, createPBRDescriptor } from '../../../utils/texture';
import { createBindGroupDescriptor } from '../../../utils/bindGroup';
import { create3DRenderPipeline } from '../../../utils/program/renderProgram';
import { write32ToBuffer, writeMat4ToBuffer } from '../../../utils/buffer';
import { VertexBuiltIn, createRenderShader } from '../../../utils/shaderUtils';
const MAT4X4_BYTES = 64;

let init: SampleInit;
SampleInitFactoryWebGPU(
  async ({ canvas, pageState, gui, device, context, presentationFormat }) => {
    interface GUISettings {
      'Bump Mode':
        | 'None'
        | 'Normal Texture'
        | 'Normal Map'
        | 'Parallax Scale'
        | 'Steep Parallax'
        | 'Parallax Occlusion';
      cameraPosX: number;
      cameraPosY: number;
      cameraPosZ: number;
      lightPosX: number;
      lightPosY: number;
      lightPosZ: number;
      lightIntensity: number;
      depthScale: number;
      depthLayers: number;
    }

    const settings: GUISettings = {
      'Bump Mode': 'Normal Map',
      cameraPosX: 0.0,
      cameraPosY: 0.0,
      cameraPosZ: -4.1,
      lightPosX: 1.7,
      lightPosY: -0.7,
      lightPosZ: 1.9,
      lightIntensity: 0.02,
      depthScale: 0.05,
      depthLayers: 16,
    };
    gui.add(settings, 'Bump Mode', [
      'None',
      'Normal Texture',
      'Normal Map',
      'Parallax Scale',
      'Steep Parallax',
      'Parallax Occlusion',
    ]);
    const cameraFolder = gui.addFolder('Camera');
    const lightFolder = gui.addFolder('Light');
    const depthFolder = gui.addFolder('Depth');
    cameraFolder.add(settings, 'cameraPosX', -5, 5).step(0.1);
    cameraFolder.add(settings, 'cameraPosY', -5, 5).step(0.1);
    cameraFolder.add(settings, 'cameraPosZ', -5, 5).step(0.1);
    lightFolder.add(settings, 'lightPosX', -5, 5).step(0.1);
    lightFolder.add(settings, 'lightPosY', -5, 5).step(0.1);
    lightFolder.add(settings, 'lightPosZ', -5, 5).step(0.1);
    lightFolder.add(settings, 'lightIntensity', 0.0, 0.1).step(0.01);
    depthFolder.add(settings, 'depthScale', 0.0, 0.1).step(0.01);
    depthFolder.add(settings, 'depthLayers', 1, 32).step(1);

    //Create normal mapping resources and pipeline
    const depthTexture = device.createTexture({
      size: [canvas.width, canvas.height],
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    const uniformBuffer = device.createBuffer({
      //One extra element needed due to padding
      size: MAT4X4_BYTES * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const mapMethodBuffer = device.createBuffer({
      size: Float32Array.BYTES_PER_ELEMENT * 7,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    //TODO: Make sure a shader only gets passed the textures that are created in case an invalid format is passed
    //TODO: Allow user to pass multiple diffuse, normals, height, etc
    let toyboxPBR: Required<PBRDescriptor>;
    {
      const response = await createPBRDescriptor(device, [
        'toy_box_diffuse.png',
        'spiral_normal.png',
        'spiral_height.png',
      ]);
      toyboxPBR = response as Required<PBRDescriptor>;
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
      [
        GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX,
      ],
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
          toyboxPBR.diffuse.createView(),
          toyboxPBR.normal.createView(),
          toyboxPBR.height.createView(),
        ],
      ],
      'Toybox',
      device
    );

    //Create lightmap resources
    const lightCubeUniformBuffer = device.createBuffer({
      size: MAT4X4_BYTES * 3,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const lightCube = createMeshRenderable(
      device,
      createBoxMeshWithTangents(0.2, 0.2, 0.2)
    );

    const lightCubeBGDescriptor = createBindGroupDescriptor(
      [0],
      [GPUShaderStage.VERTEX],
      ['buffer'],
      [{ type: 'uniform' }],
      [[{ buffer: lightCubeUniformBuffer }]],
      'LightCube',
      device
    );

    const vertexDataFormats: GPUVertexFormat[] = [
      'float32x3',
      'float32x3',
      'float32x2',
      'float32x3',
      'float32x3',
    ];
    const vertexShaderFormats: GPUVertexFormat[] = [
      'float32x4',
      ...vertexDataFormats.slice(1),
    ];

    const lightCubeShaderCode = createRenderShader({
      uniforms: [
        {
          structName: 'SpaceUniforms',
          argKeys: ['projMat', 'viewMat', 'modelMat'],
          dataType: 'mat4x4f',
        },
      ],
      vertexInputs: {
        names: ['position', 'normal', 'uv', 'vert_tan', 'vert_bitan'],
        formats: vertexShaderFormats,
      },
      vertexOutput: {
        builtins: VertexBuiltIn.POSITION,
        outputs: [],
      },
      code: lightCubeWGSL,
    });

    const lightCubePipeline = create3DRenderPipeline(
      device,
      'LightCube',
      [lightCubeBGDescriptor.bindGroupLayout],
      lightCubeShaderCode,
      vertexDataFormats,
      lightCubeShaderCode,
      presentationFormat,
      true
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

    function getLightCubeModelMatrix() {
      const modelMatrix = mat4.create();
      mat4.identity(modelMatrix);
      mat4.translate(
        modelMatrix,
        vec3.create(settings.lightPosX, settings.lightPosY, settings.lightPosZ),
        modelMatrix
      );
      return modelMatrix;
    }

    const getMappingType = (arr: Uint32Array) => {
      switch (settings['Bump Mode']) {
        case 'None':
          arr[0] = 0;
          break;
        case 'Normal Texture':
          arr[0] = 1;
          break;
        case 'Normal Map':
          arr[0] = 2;
          break;
        case 'Parallax Scale':
          arr[0] = 3;
          break;
        case 'Steep Parallax':
          arr[0] = 4;
          break;
        case 'Parallax Occlusion':
          arr[0] = 5;
          break;
      }
    };

    const mappingType: Uint32Array = new Uint32Array([0]);

    const texturedCubePipeline = create3DRenderPipeline(
      device,
      'NormalMappingRender',
      [frameBGDescriptor.bindGroupLayout, toyboxBGDescriptor.bindGroupLayout],
      normalMapWGSL,
      ['float32x3', 'float32x3', 'float32x2', 'float32x3', 'float32x3'],
      normalMapWGSL,
      presentationFormat,
      true
    );

    function frame() {
      // Sample is no longer the active page.
      if (!pageState.active) return;

      //Write to normal map shader
      const viewMatrixTemp = getViewMatrix();
      const viewMatrix = viewMatrixTemp as Float32Array;

      const modelMatrixTemp = getModelMatrix();
      const modelMatrix = modelMatrixTemp as Float32Array;

      writeMat4ToBuffer(device, uniformBuffer, [
        projectionMatrix,
        viewMatrix,
        modelMatrix,
      ]);

      getMappingType(mappingType);

      write32ToBuffer(device, mapMethodBuffer, [mappingType]);
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
        projectionMatrix,
        viewMatrix,
        lightCubeModelMatrix,
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
        name: '../../../meshes/box.ts',
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        contents: require('!!raw-loader!../../../meshes/box.ts').default,
      },
    ],
    filename: __filename,
  });

export default NormalMapping;
