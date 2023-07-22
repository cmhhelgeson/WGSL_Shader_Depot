import { Accessor, BufferView, GlTf } from './gltf';

enum GLTFRenderMode {
  POINTS = 0,
  LINE = 1,
  LINE_LOOP = 2,
  LINE_STRIP = 3,
  TRIANGLES = 4,
  TRIANGLE_STRIP = 5,
  // Note= fans are not supported in WebGPU, use should be
  // an error or converted into a list/strip
  TRIANGLE_FAN = 6,
}

enum GLTFComponentType {
  BYTE = 5120,
  UNSIGNED_BYTE = 5121,
  SHORT = 5122,
  UNSIGNED_SHORT = 5123,
  INT = 5124,
  UNSIGNED_INT = 5125,
  FLOAT = 5126,
  DOUBLE = 5130,
}

enum GLTFType {
  SCALAR = 0,
  VEC2 = 1,
  VEC3 = 2,
  VEC4 = 3,
  MAT2 = 4,
  MAT3 = 5,
  MAT4 = 6,
}

export const alignTo = (val: number, align: number): number => {
  return Math.floor((val + align - 1) / align) * align;
};

const parseGltfType = (type: string) => {
  switch (type) {
    case 'SCALAR':
      return GLTFType.SCALAR;
    case 'VEC2':
      return GLTFType.VEC2;
    case 'VEC3':
      return GLTFType.VEC3;
    case 'VEC4':
      return GLTFType.VEC4;
    case 'MAT2':
      return GLTFType.MAT2;
    case 'MAT3':
      return GLTFType.MAT3;
    case 'MAT4':
      return GLTFType.MAT4;
    default:
      throw Error(`Unhandled glTF Type ${type}`);
  }
};

const gltfTypeNumComponents = (type: GLTFType) => {
  switch (type) {
    case GLTFType.SCALAR:
      return 1;
    case GLTFType.VEC2:
      return 2;
    case GLTFType.VEC3:
      return 3;
    case GLTFType.VEC4:
    case GLTFType.MAT2:
      return 4;
    case GLTFType.MAT3:
      return 9;
    case GLTFType.MAT4:
      return 16;
    default:
      throw Error(`Invalid glTF Type ${type}`);
  }
};

// Note: only returns non-normalized type names,
// so byte/ubyte = sint8/uint8, not snorm8/unorm8, same for ushort
const gltfVertexType = (componentType: GLTFComponentType, type: GLTFType) => {
  let typeStr = null;
  switch (componentType) {
    case GLTFComponentType.BYTE:
      typeStr = 'sint8';
      break;
    case GLTFComponentType.UNSIGNED_BYTE:
      typeStr = 'uint8';
      break;
    case GLTFComponentType.SHORT:
      typeStr = 'sint16';
      break;
    case GLTFComponentType.UNSIGNED_SHORT:
      typeStr = 'uint16';
      break;
    case GLTFComponentType.INT:
      typeStr = 'int32';
      break;
    case GLTFComponentType.UNSIGNED_INT:
      typeStr = 'uint32';
      break;
    case GLTFComponentType.FLOAT:
      typeStr = 'float32';
      break;
    default:
      throw Error(`Unrecognized or unsupported glTF type ${componentType}`);
  }

  switch (gltfTypeNumComponents(type)) {
    case 1:
      return typeStr;
    case 2:
      return typeStr + 'x2';
    case 3:
      return typeStr + 'x3';
    case 4:
      return typeStr + 'x4';
    default:
      throw Error(`Invalid number of components for gltfType: ${type}`);
  }
};

const gltfTypeSize = (componentType: GLTFComponentType, type: GLTFType) => {
  let componentSize = 0;
  switch (componentType) {
    case GLTFComponentType.BYTE:
      componentSize = 1;
      break;
    case GLTFComponentType.UNSIGNED_BYTE:
      componentSize = 1;
      break;
    case GLTFComponentType.SHORT:
      componentSize = 2;
      break;
    case GLTFComponentType.UNSIGNED_SHORT:
      componentSize = 2;
      break;
    case GLTFComponentType.INT:
      componentSize = 4;
      break;
    case GLTFComponentType.UNSIGNED_INT:
      componentSize = 4;
      break;
    case GLTFComponentType.FLOAT:
      componentSize = 4;
      break;
    case GLTFComponentType.DOUBLE:
      componentSize = 8;
      break;
    default:
      throw Error('Unrecognized GLTF Component Type?');
  }
  return gltfTypeNumComponents(type) * componentSize;
};

export class GLTFBuffer {
  buffer: Uint8Array;
  constructor(buffer: ArrayBuffer, offset: number, size: number) {
    this.buffer = new Uint8Array(buffer, offset, size);
  }
}

export class GLTFBufferView {
  byteLength: number;
  byteStride: number;
  view: Uint8Array;
  needsUpload: boolean;
  gpuBuffer: GPUBuffer;
  usage: number;
  constructor(buffer: GLTFBuffer, view: BufferView) {
    this.byteLength = view['byteLength'];
    this.byteStride = 0;
    if (view['byteStride'] !== undefined) {
      this.byteStride = view['byteStride'];
    }
    // Create the buffer view. Note that subarray creates a new typed
    // view over the same array buffer, we do not make a copy here.
    let viewOffset = 0;
    if (view['byteOffset'] !== undefined) {
      viewOffset = view['byteOffset'];
    }
    this.view = buffer.buffer.subarray(
      viewOffset,
      viewOffset + this.byteLength
    );

    this.needsUpload = false;
    this.gpuBuffer = null;
    this.usage = 0;
  }

  addUsage(usage: number) {
    this.usage = this.usage | usage;
  }

  upload(device: GPUDevice) {
    // Note: must align to 4 byte size when mapped at creation is true
    const buf: GPUBuffer = device.createBuffer({
      size: alignTo(this.view.byteLength, 4),
      usage: this.usage,
      mappedAtCreation: true,
    });
    new Uint8Array(buf.getMappedRange()).set(this.view);
    buf.unmap();
    this.gpuBuffer = buf;
    this.needsUpload = false;
  }
}

export class GLTFAccessor {
  count: number;
  componentType: GLTFComponentType;
  gltfType: GLTFType;
  view: GLTFBufferView;
  byteOffset: number;
  constructor(view: GLTFBufferView, accessor: Accessor) {
    this.count = accessor['count'];
    this.componentType = accessor['componentType'];
    this.gltfType = parseGltfType(accessor['type']);
    this.view = view;
    this.byteOffset = 0;
    if (accessor['byteOffset'] !== undefined) {
      this.byteOffset = accessor['byteOffset'];
    }
  }

  get byteStride() {
    const elementSize = gltfTypeSize(this.componentType, this.gltfType);
    return Math.max(elementSize, this.view.byteStride);
  }

  get byteLength() {
    return this.count * this.byteStride;
  }

  // Get the vertex attribute type for accessors that are used as vertex attributes
  get vertexType() {
    return gltfVertexType(this.componentType, this.gltfType);
  }
}

export class GLTFPrimitive {
  positions: GLTFAccessor;
  indices: GLTFAccessor;
  topology: GLTFRenderMode;
  renderPipeline: GPURenderPipeline;
  constructor(
    positions: GLTFAccessor,
    indices: GLTFAccessor,
    topology: GLTFRenderMode
  ) {
    this.positions = positions;
    this.indices = indices;
    this.topology = topology;
    this.renderPipeline = null;

    this.positions.view.needsUpload = true;
    this.positions.view.addUsage(GPUBufferUsage.VERTEX);

    if (this.indices) {
      this.indices.view.needsUpload = true;
      this.indices.view.addUsage(GPUBufferUsage.INDEX);
    }
  }

  buildRenderPipeline(
    device: GPUDevice,
    vertexShaderModule: GPUShaderModule,
    fragmentShaderModule: GPUShaderModule,
    colorFormat: GPUTextureFormat,
    depthFormat: GPUTextureFormat,
    uniformsBGLayout: GPUBindGroupLayout
  ) {
    // Vertex attribute state and shader stage
    const vertexState: GPUVertexState = {
      // Shader stage info
      module: vertexShaderModule,
      entryPoint: 'vertexMain',
      // Vertex buffer info
      buffers: [
        {
          arrayStride: this.positions.byteStride,
          attributes: [
            {
              format: this.positions.vertexType,
              offset: 0,
              shaderLocation: 0,
            },
          ],
        },
      ],
    };

    const fragmentState: GPUFragmentState = {
      // Shader info
      module: fragmentShaderModule,
      entryPoint: 'fragmentMain',
      // Output render target info
      targets: [{ format: colorFormat }],
    };

    // Our loader only supports triangle lists and strips, so by default we set
    // the primitive topology to triangle list, and check if it's instead a triangle strip
    const primitive: GPUPrimitiveState = { topology: 'triangle-list' };
    if (this.topology == GLTFRenderMode.TRIANGLE_STRIP) {
      primitive.topology = 'triangle-strip';
      primitive.stripIndexFormat = this.indices.vertexType;
    }

    const layout: GPUPipelineLayout = device.createPipelineLayout({
      bindGroupLayouts: [uniformsBGLayout],
    });

    this.renderPipeline = device.createRenderPipeline({
      layout: layout,
      vertex: vertexState,
      fragment: fragmentState,
      primitive: primitive,
      depthStencil: {
        format: depthFormat,
        depthWriteEnabled: true,
        depthCompare: 'less',
      },
    });
  }

  render(renderPassEncoder: GPURenderPassEncoder, uniformsBG: GPUBindGroup) {
    renderPassEncoder.setPipeline(this.renderPipeline);
    renderPassEncoder.setBindGroup(0, uniformsBG);

    // Apply the accessor's byteOffset here to handle both global and interleaved
    // offsets for the buffer. Setting the offset here allows handling both cases,
    // with the downside that we must repeatedly bind the same buffer at different
    // offsets if we're dealing with interleaved attributes.
    // Since we only handle positions at the moment, this isn't a problem.
    renderPassEncoder.setVertexBuffer(
      0,
      this.positions.view.gpuBuffer,
      this.positions.byteOffset,
      this.positions.byteLength
    );

    if (this.indices) {
      renderPassEncoder.setIndexBuffer(
        this.indices.view.gpuBuffer,
        this.indices.vertexType,
        this.indices.byteOffset,
        this.indices.byteLength
      );
      renderPassEncoder.drawIndexed(this.indices.count);
    } else {
      renderPassEncoder.draw(this.positions.count);
    }
  }
}

export class GLTFMesh {
  name: string;
  primitives: GLTFPrimitive[];
  constructor(name: string, primitives: GLTFPrimitive[]) {
    this.name = name;
    this.primitives = primitives;
  }

  buildRenderPipeline(
    device: GPUDevice,
    vertexShaderModule: GPUShaderModule,
    fragmentShaderModule: GPUShaderModule,
    colorFormat: GPUTextureFormat,
    depthFormat: GPUTextureFormat,
    uniformsBGLayout: GPUBindGroupLayout
  ) {
    // We take a pretty simple approach to start. Just loop through all the primitives and
    // build their respective render pipelines
    for (let i = 0; i < this.primitives.length; ++i) {
      this.primitives[i].buildRenderPipeline(
        device,
        vertexShaderModule,
        fragmentShaderModule,
        colorFormat,
        depthFormat,
        uniformsBGLayout
      );
    }
  }

  render(renderPassEncoder: GPURenderPassEncoder, uniformsBG: GPUBindGroup) {
    // We take a pretty simple approach to start. Just loop through all the primitives and
    // call their individual draw methods
    for (let i = 0; i < this.primitives.length; ++i) {
      this.primitives[i].render(renderPassEncoder, uniformsBG);
    }
  }
}

export const validateGLBHeader = (header: DataView) => {
  if (header.getUint32(0, true) != 0x46546c67) {
    throw Error('Provided file is not a glB file');
  }
  if (header[1] != 2) {
    throw Error('Provided file is glTF 2.0 file');
  }
};

export const validateBinaryHeader = (header: Uint32Array) => {
  if (header[1] != 0x004e4942) {
    throw Error(
      'Invalid glB: The second chunk of the glB file is not a binary chunk!'
    );
  }
};

// Upload a GLB model and return it
export const convertGLBToJSONAndBinary = async (
  buffer: ArrayBuffer,
  device: GPUDevice
) => {
  const jsonHeader = new DataView(buffer, 0, 12);
  validateGLBHeader(jsonHeader);

  // Parse the JSON chunk of the glB file to a JSON object
  const jsonChunk: GlTf = JSON.parse(
    new TextDecoder('utf-8').decode(new Uint8Array(buffer, 20, jsonHeader[3]))
  );

  console.log(jsonChunk);

  const binaryHeader = new Uint32Array(buffer, 20 + jsonHeader[3], 2);
  validateBinaryHeader(binaryHeader);

  const binaryChunk = new GLTFBuffer(
    buffer,
    28 + jsonHeader[3],
    binaryHeader[0]
  );

  // Create GLTFBufferView objects for all the buffer views in the glTF file
  const bufferViews: GLTFBufferView[] = [];
  for (let i = 0; i < jsonChunk.bufferViews.length; ++i) {
    bufferViews.push(new GLTFBufferView(binaryChunk, jsonChunk.bufferViews[i]));
  }

  const accessors: GLTFAccessor[] = [];
  for (let i = 0; i < jsonChunk.accessors.length; ++i) {
    const accessorInfo = jsonChunk.accessors[i];
    const viewID = accessorInfo['bufferView'];
    accessors.push(new GLTFAccessor(bufferViews[viewID], accessorInfo));
  }

  console.log(`glTF file has ${jsonChunk.meshes.length} meshes`);
  // Load the first mesh
  const mesh = jsonChunk.meshes[0];
  const meshPrimitives: GLTFPrimitive[] = [];
  for (let i = 0; i < mesh.primitives.length; ++i) {
    const prim = mesh.primitives[i];
    let topology = prim['mode'];
    // Default is triangles if mode specified
    if (topology === undefined) {
      topology = GLTFRenderMode.TRIANGLES;
    }
    if (
      topology != GLTFRenderMode.TRIANGLES &&
      topology != GLTFRenderMode.TRIANGLE_STRIP
    ) {
      throw Error(`Unsupported primitive mode ${prim['mode']}`);
    }

    let indices = null;
    if (jsonChunk['accessors'][prim['indices']] !== undefined) {
      indices = accessors[prim['indices']];
    }

    // Loop through all the attributes to find the POSITION attribute.
    // While we only want the position attribute right now, we'll load
    // the others later as well.
    let positions = null;
    for (const attr in prim['attributes']) {
      const accessor = accessors[prim['attributes'][attr]];
      if (attr == 'POSITION') {
        positions = accessor;
      }
    }

    // Add the primitive to the mesh's list of primitives
    meshPrimitives.push(new GLTFPrimitive(positions, indices, topology));
  }

  // Upload the buffer views used by mesh
  for (let i = 0; i < bufferViews.length; ++i) {
    if (bufferViews[i].needsUpload) {
      bufferViews[i].upload(device);
    }
  }

  console.log(`Mesh ${mesh['name']} has ${meshPrimitives.length} primitives`);
  return new GLTFMesh(mesh['name'], meshPrimitives);
};
