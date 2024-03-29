import { Accessor, BufferView, GlTf, Node } from './gltf';
import { mat4, vec3, vec4 } from 'wgpu-matrix';
import { ArrayLike } from 'wgpu-matrix/dist/1.x/array-like';

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

type GLTFNode = {
  //name: string;
  //mesh: GLTFMesh;
  nodeIndex: number;
  childrenNodes: GLTFNode[];
  transformationMatrix: ArrayLike;
  worldTransformMatrix?: ArrayLike;
  mesh?: GLTFMesh;
};

type GLTFScene = {
  sceneIndex: number;
  nodes: GLTFNode[];
};

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
    uniformsBGLayout: GPUBindGroupLayout,
    label: string
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
      label: `${label}.pipelineLayout`,
    });

    const rpDescript: GPURenderPipelineDescriptor = {
      layout: layout,
      label: `${label}.pipeline`,
      vertex: vertexState,
      fragment: fragmentState,
      primitive: primitive,
      depthStencil: {
        format: depthFormat,
        depthWriteEnabled: true,
        depthCompare: 'less',
      },
    };

    this.renderPipeline = device.createRenderPipeline(rpDescript);
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
        uniformsBGLayout,
        `PrimitivePipeline${i}`
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
  if (header.getUint32(4, true) != 2) {
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

export const flattenNodeOutput = (parentNode: GLTFNode) => {
  if (!parentNode.transformationMatrix) {
    return mat4.identity();
  }
  if (parentNode.childrenNodes.length === 0) {
    return parentNode.transformationMatrix;
  }
  const accumulator = mat4.identity();
  parentNode.childrenNodes.forEach((node) => {
    mat4.multiply(accumulator, flattenNodeOutput(node), accumulator);
  });
  return parentNode.transformationMatrix;
};

export const mat4FromRotationTranslationScale = (
  rotation: ArrayLike,
  translation: ArrayLike,
  scale: ArrayLike
): ArrayLike => {
  const [x, y, z, w] = rotation;
  const [sx, sy, sz] = scale;

  const x2 = x * 2;
  const y2 = y * 2;
  const z2 = z * 2;

  const xx = x * x2;
  const xy = x * y2;
  const xz = x * z2;
  const yy = y * y2;
  const yz = y * z2;
  const zz = z * z2;
  const wx = w * x2;
  const wy = w * y2;
  const wz = w * z2;

  const mat = mat4.create(
    (1 - (yy + zz)) * sx,
    (xy + wz) * sx,
    (xz - wy) * sx,
    0,
    (xy - wz) * sy,
    (1 - (xx + zz)) * sy,
    (yz + wx) * sy,
    0,
    (xz + wy) * sz,
    (yz - wx) * sz,
    (1 - (xx + yy)) * sz,
    0,
    translation[0],
    translation[1],
    translation[2],
    1
  );
  return mat;
};

export const readNodeTransform = (node: Node): ArrayLike => {
  if (node.matrix) {
    return mat4.create(...node.matrix);
  }
  const scale: ArrayLike = node.scale
    ? vec3.fromValues(...node.scale)
    : vec3.fromValues(1, 1, 1);
  const rotation: ArrayLike = node.rotation
    ? vec4.fromValues(...node.rotation)
    : vec4.fromValues(0, 0, 0, 1);
  const translation = node.translation
    ? vec3.fromValues(...node.translation)
    : vec3.fromValues(0, 0, 0);
  return mat4FromRotationTranslationScale(rotation, translation, scale);
};

export const setNodeWorldTransformMatrix = (
  data: GlTf,
  node: Node,
  parentWorldTransformationMatrix: ArrayLike
) => {
  //Do not recompute the worldMatrixTransform if it has already been computed
  if (node.worldTransformationMatrix) {
    return;
  }
  node.worldTransformationMatrix = readNodeTransform(node);
  mat4.multiply(
    node.worldTransformationMatrix,
    parentWorldTransformationMatrix,
    node.worldTransformationMatrix
  );

  if (node.children) {
    for (const childIndex of node.children) {
      const childNode = data.nodes[childIndex];
      setNodeWorldTransformMatrix(
        data,
        childNode,
        node.worldTransformationMatrix
      );
    }
  }
};

type TempReturn = {
  meshes: GLTFMesh[];
  nodes: Node[];
};

// Upload a GLB model and return it
export const convertGLBToJSONAndBinary = async (
  buffer: ArrayBuffer,
  device: GPUDevice
): Promise<TempReturn> => {
  const jsonHeader = new DataView(buffer, 0, 20);
  validateGLBHeader(jsonHeader);

  // Parse the JSON chunk of the glB file to a JSON object
  const jsonChunk: GlTf = JSON.parse(
    new TextDecoder('utf-8').decode(
      new Uint8Array(buffer, 20, jsonHeader.getUint32(12, true))
    )
  );

  const binaryHeader = new Uint32Array(
    buffer,
    20 + jsonHeader.getUint32(12, true),
    2
  );
  validateBinaryHeader(binaryHeader);

  const binaryChunk = new GLTFBuffer(
    buffer,
    28 + jsonHeader.getUint32(12, true),
    binaryHeader[0]
  );

  //Const populate missing properties of jsonChunk
  for (const accessor of jsonChunk.accessors) {
    accessor.byteOffset = accessor.byteOffset ?? 0;
    accessor.normalized = accessor.normalized ?? false;
  }

  for (const bufferView of jsonChunk.bufferViews) {
    bufferView.byteOffset = bufferView.byteOffset ?? 0;
  }

  if (jsonChunk.samplers) {
    for (const sampler of jsonChunk.samplers) {
      sampler.wrapS = sampler.wrapS ?? 10497; //GL.REPEAT
      sampler.wrapT = sampler.wrapT ?? 10947; //GL.REPEAT
    }
  }

  //Iterate through the ancestor nodes of the gltf scene, applying world transforms down the tree to children
  for (let i = 0; i < jsonChunk.scenes.length; i++) {
    for (const nodeIndex of jsonChunk.scenes[i].nodes) {
      const currentNode = jsonChunk.nodes[nodeIndex];
      setNodeWorldTransformMatrix(jsonChunk, currentNode, mat4.identity());
    }
  }

  //Mark each accessor with its intended usage within the vertexShader.
  //Often necessary due to infrequencey with which the BufferView target field is populated.
  for (const mesh of jsonChunk.meshes) {
    for (const primitive of mesh.primitives) {
      if ('indices' in primitive) {
        const accessor = jsonChunk.accessors[primitive.indices];
        jsonChunk.accessors[primitive.indices].bufferViewUsage |=
          GPUBufferUsage.INDEX;
        jsonChunk.bufferViews[accessor.bufferView].usage |=
          GPUBufferUsage.INDEX;
      }
      for (const attribute of Object.values(primitive.attributes)) {
        const accessor = jsonChunk.accessors[attribute];
        jsonChunk.accessors[attribute].bufferViewUsage |= GPUBufferUsage.VERTEX;
        jsonChunk.bufferViews[accessor.bufferView].usage |=
          GPUBufferUsage.VERTEX;
      }
    }
  }

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

  // Load the first mesh
  const meshes: GLTFMesh[] = [];
  for (let i = 0; i < jsonChunk.meshes.length; i++) {
    const mesh = jsonChunk.meshes[i];
    const meshPrimitives: GLTFPrimitive[] = [];
    for (let j = 0; j < mesh.primitives.length; ++j) {
      const prim = mesh.primitives[j];
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
      meshPrimitives.push(new GLTFPrimitive(positions, indices, topology));
    }
    meshes.push(new GLTFMesh(mesh.name, meshPrimitives));
  }

  // Upload the buffer views used by mesh
  for (let i = 0; i < bufferViews.length; ++i) {
    if (bufferViews[i].needsUpload) {
      bufferViews[i].upload(device);
    }
  }

  const dfsConstructNodeTree = (gltf: GlTf, parentNode: GLTFNode) => {
    if (
      gltf.nodes[parentNode.nodeIndex] === undefined ||
      gltf.nodes[parentNode.nodeIndex] === null
    ) {
      return;
    }
    if (
      gltf.nodes[parentNode.nodeIndex].children === undefined ||
      gltf.nodes[parentNode.nodeIndex].children.length === 0
    ) {
      return;
    }
    for (let i = 0; i < gltf.nodes[parentNode.nodeIndex].children.length; i++) {
      const childNodeIndex = gltf.nodes[parentNode.nodeIndex].children[i];
      const childNodeObject = gltf.nodes[childNodeIndex];
      const childNode: GLTFNode = {
        nodeIndex: childNodeIndex,
        childrenNodes: [],
        transformationMatrix: readNodeTransform(childNodeObject),
        mesh: childNodeObject.mesh ? meshes[childNodeObject.mesh] : undefined,
      };
      if (
        gltf.nodes[childNode.nodeIndex].children !== undefined &&
        gltf.nodes[childNode.nodeIndex].children.length !== 0
      ) {
        dfsConstructNodeTree(gltf, childNode);
      }
      parentNode.childrenNodes.push(childNode);
    }
  };

  const theScenes: GLTFScene[] = [];
  for (let i = 0; i < jsonChunk.scenes.length; i++) {
    const scene: GLTFScene = {
      sceneIndex: i,
      nodes: [],
    };
    //Access every top-level ancestor node from this scene
    for (let j = 0; j < jsonChunk.scenes[i].nodes.length; j++) {
      //Get the index of the current top-level ancestor node
      const currentNodeIndex = jsonChunk.scenes[i].nodes[j];
      const currentNodeObject = jsonChunk.nodes[currentNodeIndex];
      //Construct the ancestor node
      const parentNode: GLTFNode = {
        nodeIndex: currentNodeIndex,
        childrenNodes: [],
        transformationMatrix: readNodeTransform(currentNodeObject),
        mesh: currentNodeObject.mesh
          ? meshes[currentNodeObject.mesh]
          : undefined,
      };
      dfsConstructNodeTree(jsonChunk, parentNode);
      scene.nodes.push(parentNode);
    }
    theScenes.push(scene);
  }
  return {
    meshes,
    nodes: jsonChunk.nodes,
  };
};
