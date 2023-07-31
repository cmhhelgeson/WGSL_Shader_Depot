import { vec2 } from 'wgpu-matrix';
import { makeSample, SampleInit } from '../../components/SampleLayout/SampleLayout';

import comancheWGSL from './comanche.wgsl';

const init: SampleInit = async ({ canvas, pageState }) => {
  //Normal setup
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();

  if (!pageState.active) return;
  const context = canvas.getContext('webgpu') as GPUCanvasContext;

  const devicePixelRatio = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

  context.configure({
    device,
    format: presentationFormat,
    alphaMode: 'premultiplied',
  });

  //Create line vertices
  //const lineStart = vec2.fromValues(-1.0, 1.0);
  //const lineEnd = vec2.fromValues(-1.0, -1.0);

  //4 floats, 2 vertices
  const verticalLineBuffer = new Float32Array([-1.0, 1.0, -1.0, -1.0]);
  // 2 position floats per vertex
  const vertex2DSize = Float32Array.BYTES_PER_ELEMENT * 2;

  // Create a vertex buffer from the cube data.
  const verticesBuffer = device.createBuffer({
    size: verticalLineBuffer.byteLength,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true,
  });
  new Float32Array(verticesBuffer.getMappedRange()).set(verticalLineBuffer);
  verticesBuffer.unmap();

  // Create a bindGroupLayout for the PerCanvas bindGroup
  // @group(0) @binding(0) canvasBuffer vert + frag access
  // @group(0) @binding(1) textureSampler frag access
  // @group(0) @binding(2) colorMap frag access
  // @group(0) @binding(3) heightMap frag access
  const perCanvasBindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        buffer: {
          type: 'uniform',
        },
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
      },
      {
        binding: 1,
        sampler: {
          type: 'filtering',
        },
        visibility: GPUShaderStage.FRAGMENT,
      },
      {
        binding: 2,
        texture: {
          sampleType: 'float',
        },
        visibility: GPUShaderStage.FRAGMENT,
      },
      {
        binding: 3,
        texture: {
          sampleType: 'float',
        },
        visibility: GPUShaderStage.FRAGMENT,
      },
    ],
  });

  // Create a bindGroupLayout for the PerFrame bindGroup
  // @group(1) @binding(0) camera vert + frag access
  const perFrameBindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        buffer: {
          type: 'uniform',
        },
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
      },
    ],
  });

  //Create the render pipeline
  const pipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [perCanvasBindGroupLayout, perFrameBindGroupLayout],
    }),
    vertex: {
      module: device.createShaderModule({
        code: comancheWGSL,
      }),
      entryPoint: 'vertexMain',
      buffers: [
        {
          arrayStride: vertex2DSize,
          attributes: [
            {
              // position
              shaderLocation: 0,
              offset: 0,
              format: 'float32x2',
            },
          ],
        },
      ],
    },
    fragment: {
      module: device.createShaderModule({
        code: comancheWGSL,
      }),
      entryPoint: 'fragmentMain',
      targets: [
        {
          format: presentationFormat,
        },
      ],
    },
    primitive: {
      topology: 'line-list',
      cullMode: 'none',
    },
  });

  const renderPassDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        view: undefined, // Assigned later

        clearValue: { r: 0.1, g: 0.4, b: 0.5, a: 1.0 },
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
  };

  // Binding 0: Create the uniform buffer for canvas dimensions
  const canvasDimensions = new Uint32Array([canvas.width, canvas.height]);
  const uniformCanvasDimensionsBufferSize = Uint32Array.BYTES_PER_ELEMENT * 2;
  const uniformCanvasDimensionsBuffer = device.createBuffer({
    size: uniformCanvasDimensionsBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  // Binding 1: Create a texture sampler that directly accesses pixels.
  const sampler = device.createSampler({
    magFilter: 'nearest',
    minFilter: 'nearest',
  });

  // Binding 2: Fetch the colormap and upload it into a GPUTexture.
  let colorMap: GPUTexture;
  {
    const response = await fetch(
      new URL('../../../assets/img/map0color.png', import.meta.url).toString()
    );
    const imageBitmap = await createImageBitmap(await response.blob());
    colorMap = device.createTexture({
      size: [imageBitmap.width, imageBitmap.height, 1],
      format: 'rgba8unorm',
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });
    device.queue.copyExternalImageToTexture(
      { source: imageBitmap },
      { texture: colorMap },
      [imageBitmap.width, imageBitmap.height]
    );
  }

  // Binding 3: Fetch the height map
  let heightMap: GPUTexture;
  {
    const response = await fetch(
      new URL('../../../assets/img/map0height.png', import.meta.url).toString()
    );
    const imageBitmap = await createImageBitmap(await response.blob());
    heightMap = device.createTexture({
      size: [imageBitmap.width, imageBitmap.height, 1],
      format: 'rgba8unorm',
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });
    device.queue.copyExternalImageToTexture(
      { source: imageBitmap },
      { texture: heightMap },
      [imageBitmap.width, imageBitmap.height]
    );
  }

  const perCanvasBindGroup = device.createBindGroup({
    layout: perCanvasBindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: {
          buffer: uniformCanvasDimensionsBuffer,
        },
      },
      {
        binding: 1,
        resource: sampler,
      },
      {
        binding: 2,
        resource: colorMap.createView(),
      },
      {
        binding: 3,
        resource: heightMap.createView(),
      },
    ],
  });

  // Write to the requisite buffer
  device.queue.writeBuffer(
    uniformCanvasDimensionsBuffer,
    0,
    canvasDimensions.buffer,
    canvasDimensions.byteOffset,
    canvasDimensions.byteLength
  );

  const sinangle = Math.sin(0.5 * 3.141592);
  const cosangle = Math.sin(0.5 * 3.141592);

  // Left-most point of the FOV
  const leftRayX = cosangle * 600.0 + sinangle * 600.0;
  const leftRayY = sinangle * 600.0 - cosangle * 600.0;

  // Right-most point of the FOV
  const rightRayX = cosangle * 600.0 - sinangle * 600.0;
  const rightRayY = sinangle * 600.0 + cosangle * 600.0;

  // Binding 0: Uniform with all the camera information
  const camera = new Float32Array([
    // ALLIGNMENT 1
    512.0, //xPos
    512.0, //yPos
    70.0, //zPos (height)
    0.0,
    // ALLIGNMENT 2
    leftRayX, //leftRayX
    leftRayY, //leftRayY
    rightRayX, //rightRayX,
    rightRayY, //rightRayY,
    // ALLIGNMENT 3
    90.0,   //fovAngle
    600.0, //zFar,
    16000.0, //heightScaleFactor,
    60.0, //horizon
  ]);
  const uniformCameraBufferSize = Float32Array.BYTES_PER_ELEMENT * 12;
  const uniformCameraBuffer = device.createBuffer({
    size: uniformCameraBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const perFrameBindGroup = device.createBindGroup({
    layout: perFrameBindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: {
          buffer: uniformCameraBuffer,
        },
      },
    ],
  });
  // Write to uniform buffer
  device.queue.writeBuffer(
    uniformCameraBuffer,
    0,
    camera.buffer,
    camera.byteOffset,
    camera.byteLength
  );

  function frame() {
    // Sample is no longer the active page.
    if (!pageState.active) return;

    renderPassDescriptor.colorAttachments[0].view = context
      .getCurrentTexture()
      .createView();

    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(pipeline);
    passEncoder.setBindGroup(0, perCanvasBindGroup);
    passEncoder.setBindGroup(1, perFrameBindGroup);
    passEncoder.setVertexBuffer(0, verticesBuffer);
    //passEncoder.draw(cubeVertexCount, 1, 0, 0);
    //Draw one single vertical line 800 times (w/different uniforms)
    passEncoder.draw(2, canvas.width, 0, 0);
    passEncoder.end();
    device.queue.submit([commandEncoder.finish()]);

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
};

const ComancheVoxel: () => JSX.Element = () =>
  makeSample({
    name: 'Comanche',
    description: 'WebGPU implementation of Comanche Rendering Engine.',
    init,
    sources: [
      {
        name: __filename.substring(__dirname.length + 1),
        contents: __SOURCE__,
      },
      {
        name: './comanche.wgsl',
        contents: comancheWGSL,
        editable: true,
      },
    ],
    filename: __filename,
  });

export default ComancheVoxel;
