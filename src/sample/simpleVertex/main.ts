/* eslint-disable prettier/prettier */
import { mat4, vec3 } from 'wgpu-matrix';
import { makeSample, SampleInit } from '../../components/SampleLayout/SampleLayout';
import { createSphereMesh, SphereLayout } from '../../meshes/sphere';

import meshWGSL from './mesh.wgsl';
import { SampleInitFactoryWebGPU } from '../../components/SampleLayout/SampleLayoutUtils';

interface Renderable {
  vertices: GPUBuffer;
  indices: GPUBuffer;
  indexCount: number;
  bindGroup?: GPUBindGroup;
}

let init: SampleInit;
SampleInitFactoryWebGPU(
  async ({
    canvas,
    pageState,
    gui,
    stats,
    device,
    context,
    presentationFormat,
  }) => {

  const settings = {
    useRenderBundles: true,
    asteroidCount: 5000,
  };
  gui.add(settings, 'useRenderBundles');

  const shaderModule = device.createShaderModule({
    code: meshWGSL,
  });

  const pipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: {
      module: shaderModule,
      entryPoint: 'vertexMain',
      buffers: [
        {
          arrayStride: SphereLayout.vertexStride,
          attributes: [
            {
              // position
              shaderLocation: 0,
              offset: SphereLayout.positionsOffset,
              format: 'float32x3',
            },
            {
              // normal
              shaderLocation: 1,
              offset: SphereLayout.normalOffset,
              format: 'float32x3',
            },
            {
              // uv
              shaderLocation: 2,
              offset: SphereLayout.uvOffset,
              format: 'float32x2',
            },
          ],
        },
      ],
    },
    fragment: {
      module: shaderModule,
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

  const depthTexture = device.createTexture({
    size: [canvas.width, canvas.height],
    format: 'depth24plus',
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });

  const uniformBufferSize = 4 * 16; // 4x4 matrix
  const uniformBuffer = device.createBuffer({
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const timeSize = 4; 
  const timeBuffer = device.createBuffer({
    size: timeSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  let planetTexture: GPUTexture;
  {
    const response = await fetch(
      new URL('../../../assets/img/saturn.jpg', import.meta.url).toString()
    );
    const imageBitmap = await createImageBitmap(await response.blob());

    planetTexture = device.createTexture({
      size: [imageBitmap.width, imageBitmap.height, 1],
      format: 'rgba8unorm',
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });
    device.queue.copyExternalImageToTexture(
      { source: imageBitmap },
      { texture: planetTexture },
      [imageBitmap.width, imageBitmap.height]
    );
  }

  let moonTexture: GPUTexture;
  {
    const response = await fetch(
      new URL('../../../assets/img/moon.jpg', import.meta.url).toString()
    );
    const imageBitmap = await createImageBitmap(await response.blob());

    moonTexture = device.createTexture({
      size: [imageBitmap.width, imageBitmap.height, 1],
      format: 'rgba8unorm',
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });
    device.queue.copyExternalImageToTexture(
      { source: imageBitmap },
      { texture: moonTexture },
      [imageBitmap.width, imageBitmap.height]
    );
  }

  const sampler = device.createSampler({
    magFilter: 'linear',
    minFilter: 'linear',
  });

  // Helper functions to create the required meshes and bind groups for each sphere.
  function createSphereRenderable(
    radius: number,
    widthSegments = 32,
    heightSegments = 16,
    randomness = 0
  ): Renderable {
    const sphereMesh = createSphereMesh(
      radius,
      widthSegments,
      heightSegments,
      randomness
    );

    // Create a vertex buffer from the sphere data.
    const vertices = device.createBuffer({
      size: sphereMesh.vertices.byteLength,
      usage: GPUBufferUsage.VERTEX,
      mappedAtCreation: true,
    });
    new Float32Array(vertices.getMappedRange()).set(sphereMesh.vertices);
    vertices.unmap();

    const indices = device.createBuffer({
      size: sphereMesh.indices.byteLength,
      usage: GPUBufferUsage.INDEX,
      mappedAtCreation: true,
    });
    new Uint16Array(indices.getMappedRange()).set(sphereMesh.indices);
    indices.unmap();

    return {
      vertices,
      indices,
      indexCount: sphereMesh.indices.length,
    };
  }

  function createSphereBindGroup(
    texture: GPUTexture,
    transform: Float32Array
  ): GPUBindGroup {
    const uniformBufferSize = 4 * 16; // 4x4 matrix
    const uniformBuffer = device.createBuffer({
      size: uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Float32Array(uniformBuffer.getMappedRange()).set(transform);
    uniformBuffer.unmap();

    const layout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: {
            type: 'uniform'
          }
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          texture: {
            sampleType: 'float'
          }
        }
      ]
    })

    const bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(1),
      entries: [
        {
          binding: 0,
          resource: {
            buffer: uniformBuffer,
          },
        },
        {
          binding: 1,
          resource: sampler,
        },
        {
          binding: 2,
          resource: texture.createView(),
        },
        {
          binding: 3,
          resource: {
            buffer: timeBuffer,
          },
        },
      ],
    });

    return bindGroup;
  }

  const transform = mat4.create();
  mat4.identity(transform);

  // Create one large central planet surrounded by a large ring of asteroids
  const planet = createSphereRenderable(1.0);
  planet.bindGroup = createSphereBindGroup(planetTexture, transform);


  const renderables = [planet];

  //ensureEnoughAsteroids();

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

  const aspect = canvas.width / canvas.height;
  const projectionMatrix = mat4.perspective(
    (2 * Math.PI) / 5,
    aspect,
    1,
    100.0
  );
  const modelViewProjectionMatrix = mat4.create();

  const frameBindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: {
          buffer: uniformBuffer,
        },
      },
    ],
  });

  function getTransformationMatrix() {
    const viewMatrix = mat4.identity();
    mat4.translate(viewMatrix, vec3.fromValues(0, 0, -4), viewMatrix);
    const now = Date.now() / 1000;
    // Tilt the view matrix so the planet looks like it's off-axis.
    mat4.rotateZ(viewMatrix, Math.PI * 0.1, viewMatrix);
    mat4.rotateX(viewMatrix, Math.PI * 0.1, viewMatrix);
    // Rotate the view matrix slowly so the planet appears to spin.
    mat4.rotateY(viewMatrix, now * 0.05, viewMatrix);

    mat4.multiply(projectionMatrix, viewMatrix, modelViewProjectionMatrix);

    return modelViewProjectionMatrix as Float32Array;
  }

  // Render bundles function as partial, limited render passes, so we can use the
  // same code both to render the scene normally and to build the render bundle.
  function renderScene(
    passEncoder: GPURenderPassEncoder | GPURenderBundleEncoder
  ) {
    passEncoder.setPipeline(pipeline);
    passEncoder.setBindGroup(0, frameBindGroup);

    // Loop through every renderable object and draw them individually.
    // (Because many of these meshes are repeated, with only the transforms
    // differing, instancing would be highly effective here. This sample
    // intentionally avoids using instancing in order to emulate a more complex
    // scene, which helps demonstrate the potential time savings a render bundle
    // can provide.)
    let count = 0;
    for (const renderable of renderables) {
      passEncoder.setBindGroup(1, renderable.bindGroup);
      passEncoder.setVertexBuffer(0, renderable.vertices);
      passEncoder.setIndexBuffer(renderable.indices, 'uint16');
      passEncoder.drawIndexed(renderable.indexCount);

      if (++count > settings.asteroidCount) {
        break;
      }
    }
  }

  // The render bundle can be encoded once and re-used as many times as needed.
  // Because it encodes all of the commands needed to render at the GPU level,
  // those commands will not need to execute the associated JavaScript code upon
  // execution or be re-validated, which can represent a significant time savings.
  //
  // However, because render bundles are immutable once created, they are only
  // appropriate for rendering content where the same commands will be executed
  // every time, with the only changes being the contents of the buffers and
  // textures used. Cases where the executed commands differ from frame-to-frame,
  // such as when using frustrum or occlusion culling, will not benefit from
  // using render bundles as much.
  let renderBundle;
  function updateRenderBundle() {
    const renderBundleEncoder = device.createRenderBundleEncoder({
      colorFormats: [presentationFormat],
      depthStencilFormat: 'depth24plus',
    });
    renderScene(renderBundleEncoder);
    renderBundle = renderBundleEncoder.finish();
  }
  updateRenderBundle();

  let lastTime = performance.now();
  let timeElapsed = 0;

  function frame() {
    // Sample is no longer the active page.
    if (!pageState.active) return;

    const currentTime = performance.now();

    stats.begin();

    const transformationMatrix = getTransformationMatrix();
    device.queue.writeBuffer(
      uniformBuffer,
      0,
      transformationMatrix.buffer,
      transformationMatrix.byteOffset,
      transformationMatrix.byteLength
    );

    timeElapsed += Math.min(1 / 60, (currentTime - lastTime) / 1000);
    lastTime = currentTime;

    device.queue.writeBuffer(
      timeBuffer,
      0,
      new Float32Array([timeElapsed])
    );

    renderPassDescriptor.colorAttachments[0].view = context
      .getCurrentTexture()
      .createView();

    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

    if (settings.useRenderBundles) {
      // Executing a bundle is equivalent to calling all of the commands encoded
      // in the render bundle as part of the current render pass.
      passEncoder.executeBundles([renderBundle]);
    } else {
      // Alternatively, the same render commands can be encoded manually, which
      // can take longer since each command needs to be interpreted by the
      // JavaScript virtual machine and re-validated each time.
      renderScene(passEncoder);
    }

    passEncoder.end();
    device.queue.submit([commandEncoder.finish()]);

    stats.end();

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}, []).then((resultInit) => (init = resultInit));

const RenderBundles: () => JSX.Element = () =>
  makeSample({
    name: 'Render Bundles',
    description: `This example shows how to use render bundles. It renders a large number of
      meshes individually as a proxy for a more complex scene in order to demonstrate the reduction
      in JavaScript time spent to issue render commands. (Typically a scene like this would make use
      of instancing to reduce draw overhead.)`,
    gui: true,
    stats: true,
    init,
    sources: [
      {
        name: __filename.substring(__dirname.length + 1),
        contents: __SOURCE__,
      },
      {
        name: './mesh.wgsl',
        contents: meshWGSL,
        editable: true,
      },
      {
        name: '../../meshes/sphere.ts',
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        contents: require('!!raw-loader!../../meshes/sphere.ts').default,
      },
    ],
    filename: __filename,
  });

export default RenderBundles;
