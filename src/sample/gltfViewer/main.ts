/* eslint-disable prettier/prettier */
import { makeSample, SampleInit } from '../../components/SampleLayout';
import { createBindGroupDescriptor } from '../../utils/bindGroup';
import { buildMeshRenderPipeline, renderGLTFMesh, uploadGLB } from '../../utils/glbUtils';
import gltfVertWGSL from './gltf.vert.wgsl';
import gltfFragWGSL from './gltf.frag.wgsl';
import { mat4, vec3 } from 'wgpu-matrix';

const init: SampleInit = async ({
  canvas,
  pageState,
}) => {
  //Normal setup
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();

  if (!pageState.active) return;
  const context = canvas.getContext('webgpu') as GPUCanvasContext;

  const devicePixelRatio = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;
  console.log(canvas.clientWidth * devicePixelRatio);
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

  context.configure({
    device,
    format: presentationFormat,
    alphaMode: 'premultiplied',
  });

  const depthTexture = device.createTexture({
    size: [canvas.width, canvas.height],
    format: "depth24plus",
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });

  const cameraBuffer = device.createBuffer({
    size: 64 * 3,
    usage: GPUBufferUsage.UNIFORM,
  })

  const bgDescriptor = createBindGroupDescriptor(
    [0],
    [GPUShaderStage.VERTEX],
    ['buffer'],
    [{ type: 'uniform' }],
    [[{ buffer: cameraBuffer }]],
    'Camera',
    device
  );

  const mesh = await fetch('/gltf/Box.glb')
    .then((res) => res.arrayBuffer())
    .then((buffer) => uploadGLB(buffer, device));

  buildMeshRenderPipeline(
    device,
    mesh,
    gltfVertWGSL,
    gltfFragWGSL,
    presentationFormat,
    "depth24plus",
    [bgDescriptor.bindGroupLayout]
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



  const renderPassDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        view: undefined, // Assigned later

        clearValue: { r: 0.1, g: 0.4, b: 0.5, a: 1.0 },
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

  device.queue.writeBuffer(
    cameraBuffer,
    0,
    projectionMatrix.buffer,
    projectionMatrix.byteOffset,
    projectionMatrix.length,
  );

  const vmt = getViewMatrix();
  const vm = vmt as Float32Array;

  device.queue.writeBuffer(
    cameraBuffer,
    64,
    vm.buffer,
    vm.byteOffset,
    vm.length
  );

  function frame() {
    // Sample is no longer the active page.
    if (!pageState.active) return;

    const modelMatrix = getModelMatrix() as Float32Array;
    device.queue.writeBuffer(
      cameraBuffer,
      128,
      modelMatrix.buffer,
      modelMatrix.byteOffset,
      modelMatrix.length
    );
    
    renderPassDescriptor.colorAttachments[0].view = context
      .getCurrentTexture()
      .createView();

    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    renderGLTFMesh(mesh, passEncoder, [bgDescriptor.bindGroups[0]]);
    passEncoder.end();

    device.queue.submit([commandEncoder.finish()]);

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return [
    'Set fragments to texture uvs (red as x goes right to 1, green as y goes up to 1).',
  ];
};

const gltfViewerExample: () => JSX.Element = () =>
  makeSample({
    name: 'Grid Shader',
    description: 'A shader that renders a basic, graph style grid.',
    init,
    gui: true,
    sources: [
      {
        name: __filename.substring(__dirname.length + 1),
        contents: __SOURCE__,
      },
    ],
    filename: __filename,
  });

export default gltfViewerExample;
