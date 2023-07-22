/* eslint-disable prettier/prettier */
import { makeSample, SampleInit } from '../../components/SampleLayout';
import { createBindGroupDescriptor } from '../../utils/bindGroup';
import { convertGLBToJSONAndBinary, GLTFMesh, uploadGLB } from '../../utils/glbUtils';
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
    format: 'depth24plus-stencil8',
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });

  const cameraBuffer = device.createBuffer({
    size: 64 * 1,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
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

  const mesh: GLTFMesh = await fetch('/gltf/Avocado.glb')
    .then((res) => res.arrayBuffer())
    .then((buffer) => convertGLBToJSONAndBinary(buffer, device));

  mesh.buildRenderPipeline(
    device,
    device.createShaderModule({
      code: gltfVertWGSL
    }),
    device.createShaderModule({
      code: gltfFragWGSL
    }),
    presentationFormat,
    depthTexture.format,
    bgDescriptor.bindGroupLayout
  )

  const aspect = canvas.width / canvas.height;
  const projectionMatrix = mat4.perspective(
    (50 * Math.PI) / 180.0,
    aspect,
    0.01,
    1000.0
  ) as Float32Array;


  const projView = mat4.create();



  const renderPassDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        view: undefined, // Assigned later

        clearValue: { r: 0.3, g: 0.3, b: 0.3, a: 1.0 },
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
    depthStencilAttachment: {
      view: depthTexture.createView(),
      depthLoadOp: "clear",
      depthClearValue: 1.0,
      depthStoreOp: "store",
      stencilLoadOp: "clear",
      stencilClearValue: 0,
      stencilStoreOp: "store"
    },
  };


  function frame() {
    // Sample is no longer the active page.
    if (!pageState.active) return;

    const camera = mat4.create();
    mat4.mul(projView, projectionMatrix, camera);
    device.queue.writeBuffer(
      cameraBuffer,
      0,
      camera.buffer,
      camera.byteOffset,
      camera.length
    );
    
    renderPassDescriptor.colorAttachments[0].view = context
      .getCurrentTexture()
      .createView();

    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    mesh.render(passEncoder, bgDescriptor.bindGroups[0]);
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
