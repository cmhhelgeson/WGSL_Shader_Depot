import {
  Accessor,
  BufferView,
  Camera,
  CameraOrthographic,
  CameraPerspective,
  GlTf,
} from './gltf';

export enum GLTFRenderMode {
  POINTS,
  LINE,
  LINE_LOOP,
  LINE_STRIP,
  TRIANGLES,
  TRIANGLE_STRIP,
  TRIANGLE_FAN,
}

export enum GLTFDataType {
  BYTE = 5120,
  UNSIGNED_BYTE = 5121,
  SHORT = 5122,
  UNSIGNED_SHORT = 5123,
  INT = 5124,
  UNSIGNED_INT = 5125,
  FLOAT = 5126,
  DOUBLE = 5130,
}

export enum GLTFStructType {
  SCALAR,
  VEC2,
  VEC3,
  VEC4,
  MAT2,
  MAT3,
  MAT4,
}

class GLTFBuffer {
  buffer: Uint8Array;
  constructor(buffer: ArrayBuffer, offset: number, size: number) {
    this.buffer = new Uint8Array(buffer, offset, size);
  }
}

class GLTFBufferView {
  byteLength: number;
  byteStride: number;
  byteOffset: number;
  view: Uint8Array;
  usage: number;
  needsUpload: boolean;
  gpuBuffer: GPUBuffer;
  constructor(buffer: GLTFBuffer, view: BufferView) {
    //The offset to start reading from within the buffer (often used for allignment)
    this.byteOffset = view.byteOffset ? view.byteOffset : 0;
    //The number of bytes being read from the buffer after byteOffset
    this.byteLength = view.byteLength;
    //The Bytes Per element, 3f32s, 6 f16s, etc
    this.byteStride = view.byteStride ? view.byteStride : 0;

    this.view = buffer.buffer.subarray(
      this.byteOffset,
      this.byteOffset + this.byteLength
    );
    this.usage = 0;
  }

  addUsage(usage: number) {
    this.usage = this.usage | usage;
  }
}

class GLTFAccessor {
  count: number;
  dataType: GLTFDataType;
  structType: GLTFStructType;
  view: GLTFBufferView;
  byteOffset: number;
  vertexType: GPUVertexFormat;
  byteStride: number;
  constructor(view: GLTFBufferView, accessor: Accessor) {
    //How many data elements is the accessor...well...accessing?
    this.count = accessor.count;
    //GL_FLOAT, GL_INT
    this.dataType = accessor.componentType;
    //VEC2, VEC3, MAT4
    this.structType = GLTFStructType[accessor.type];
    this.view = view;
    //Byte Offset into view (start reading from view.byteOffset + accessor.byteOffset?)
    this.byteOffset = accessor.byteOffset ? accessor.byteOffset : 0;
    this.vertexType = getGLTFVertexType(this.dataType, this.structType);
    const elementByteLength = getGLTFElementSize(
      this.dataType,
      this.structType
    );
    //Change byteStride if necessary
    this.byteStride = Math.max(elementByteLength, this.view.byteStride);
  }
}

class GLTFPrimitive {
  mode: GLTFRenderMode;
  positionsAccesor: GLTFAccessor;
  indicesAccessor: GLTFAccessor | null;
  renderPipeline: GPURenderPipeline;
  constructor(
    positionsAccessor: GLTFAccessor,
    indicesAccessor: GLTFAccessor,
    renderMode: GLTFRenderMode
  ) {
    this.mode = renderMode;
    this.positionsAccesor = positionsAccessor;
    this.indicesAccessor = indicesAccessor;
    this.positionsAccesor.view.needsUpload = true;
    this.positionsAccesor.view.addUsage(GPUBufferUsage.VERTEX);
    if (this.indicesAccessor) {
      this.indicesAccessor.view.needsUpload = true;
      this.indicesAccessor.view.addUsage(GPUBufferUsage.INDEX);
    }
    this.renderPipeline = null;
  }
}

export class GLTFMesh {
  name: string;
  primitives: GLTFPrimitive[];

  constructor(name: string, primitives: GLTFPrimitive[]) {
    this.name = name;
    this.primitives = primitives;
  }
}

abstract class GLTFCamera {
  abstract xfar: number;
  abstract xnear: number;
  abstract type: string;
}

class GLTFPerspectiveCamera extends GLTFCamera {
  type: string;
  zfar: number;
  znear: number;
  aspectRatio: number;

  constructor(camera: CameraPerspective) {
    super();
    this.aspectRatio = camera.aspectRatio;
    this.zfar = camera.xfar;
    this.znear = camera.xnear;
    this.type = 'perspective';
  }
}

class GLTFOrthographicCamera extends GLTFCamera {

}

export const getPrimitiveStateFromRenderMode = (
  mode: GLTFRenderMode,
  indicesAccessor?: GLTFAccessor
): GPUPrimitiveState => {
  const primitiveState: GPUPrimitiveState = {};
  switch (mode) {
    case GLTFRenderMode.LINE:
    case GLTFRenderMode.LINE_LOOP:
      {
        primitiveState.topology = 'line-list';
      }
      break;
    case GLTFRenderMode.TRIANGLES:
    case GLTFRenderMode.TRIANGLE_FAN:
      {
        primitiveState.topology = 'triangle-list';
      }
      break;
    case GLTFRenderMode.LINE_STRIP:
      {
        primitiveState.topology = 'line-strip';
        if (indicesAccessor) {
          primitiveState.stripIndexFormat = indicesAccessor.vertexType.split(
            'x'
          )[0] as GPUIndexFormat;
        }
      }
      break;
    case GLTFRenderMode.TRIANGLE_STRIP:
      {
        primitiveState.topology = 'line-strip';
        if (indicesAccessor) {
          primitiveState.stripIndexFormat = indicesAccessor.vertexType.split(
            'x'
          )[0] as GPUIndexFormat;
        }
      }
      break;
    case GLTFRenderMode.POINTS:
      {
        primitiveState.topology = 'point-list';
      }
      break;
  }
  return primitiveState;
};

export const buildMeshRenderPipeline = (
  device: GPUDevice,
  mesh: GLTFMesh,
  vertexShader: string,
  fragmentShader: string,
  colorFormat: GPUTextureFormat,
  depthFormat: GPUTextureFormat,
  bgls: GPUBindGroupLayout[]
) => {
  const vertexShaderModule = device.createShaderModule({
    code: vertexShader,
  });
  const fragmentShaderModule = device.createShaderModule({
    code: fragmentShader,
  });
  for (let i = 0; i < mesh.primitives.length; i++) {
    buildPrimitiveRenderPipeline(
      device,
      mesh.primitives[i],
      vertexShaderModule,
      fragmentShaderModule,
      colorFormat,
      depthFormat,
      bgls
    );
  }
};

const buildPrimitiveRenderPipeline = (
  device: GPUDevice,
  primitive: GLTFPrimitive,
  vertexShaderModule: GPUShaderModule,
  fragmentShaderModule: GPUShaderModule,
  colorFormat: GPUTextureFormat,
  depthFormat: GPUTextureFormat,
  bgls: GPUBindGroupLayout[]
) => {
  primitive.renderPipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: bgls,
    }),
    vertex: {
      module: vertexShaderModule,
      entryPoint: 'vertexMain',
      buffers: [
        {
          arrayStride: primitive.positionsAccesor.byteStride,
          attributes: [
            {
              format: primitive.positionsAccesor.vertexType,
              offset: 0,
              shaderLocation: 0,
            },
          ],
        },
      ],
    },
    fragment: {
      module: fragmentShaderModule,
      entryPoint: 'fragmentMain',
      targets: [{ format: colorFormat }],
    },
    primitive: getPrimitiveStateFromRenderMode(primitive.mode),
    depthStencil: {
      format: depthFormat,
      depthWriteEnabled: true,
      depthCompare: 'less',
    },
  });
};

export const renderGLTFPrimitive = (
  primitive: GLTFPrimitive,
  passEncoder: GPURenderPassEncoder,
  bindGroups: GPUBindGroup[]
) => {
  passEncoder.setPipeline(primitive.renderPipeline);
  for (let i = 0; i < bindGroups.length; i++) {
    passEncoder.setBindGroup(i, bindGroups[i]);
  }
  passEncoder.setVertexBuffer(
    0,
    primitive.positionsAccesor.view.gpuBuffer,
    primitive.positionsAccesor.byteOffset,
    primitive.positionsAccesor.view.byteLength
  );

  if (primitive.indicesAccessor) {
    passEncoder.setIndexBuffer(
      primitive.indicesAccessor.view.gpuBuffer,
      primitive.indicesAccessor.vertexType.split('x')[0] as GPUIndexFormat,
      primitive.indicesAccessor.byteOffset,
      primitive.indicesAccessor.view.byteLength
    );
    passEncoder.drawIndexed(primitive.indicesAccessor.count);
  } else {
    passEncoder.draw(primitive.positionsAccesor.count);
  }
};

export const renderGLTFMesh = (
  mesh: GLTFMesh,
  passEncoder: GPURenderPassEncoder,
  bindGroups: GPUBindGroup[]
) => {
  for (let i = 0; i < mesh.primitives.length; i++) {
    renderGLTFPrimitive(mesh.primitives[i], passEncoder, bindGroups);
  }
};

export const getNumComponentsOfGLTFStructType = (type: GLTFStructType) => {
  switch (type) {
    case GLTFStructType.SCALAR:
      {
        return 1;
      }
      break;
    case GLTFStructType.VEC2:
      {
        return 2;
      }
      break;
    case GLTFStructType.VEC3:
      {
        return 3;
      }
      break;
    case GLTFStructType.VEC4:
    case GLTFStructType.MAT2:
      {
        return 4;
      }
      break;
    case GLTFStructType.MAT3:
      {
        return 9;
      }
      break;
    case GLTFStructType.MAT4:
      {
        return 16;
      }
      break;
    default:
      {
        throw Error(`Unrecongized gltf type ${type}`);
      }
      break;
  }
};

export const getGLTFVertexType = (
  dataType: GLTFDataType,
  structType: GLTFStructType
): GPUVertexFormat => {
  let typeStr = null;
  switch (dataType) {
    case GLTFDataType.BYTE:
      {
        typeStr = 'sint8';
      }
      break;
    case GLTFDataType.UNSIGNED_BYTE:
      {
        typeStr = 'uint8';
      }
      break;
    case GLTFDataType.SHORT:
      {
        typeStr = 'sint16';
      }
      break;
    case GLTFDataType.UNSIGNED_SHORT:
      {
        typeStr = 'uint16';
      }
      break;
    case GLTFDataType.INT:
      {
        typeStr = 'int32';
      }
      break;
    case GLTFDataType.UNSIGNED_INT:
      {
        typeStr = 'uint32';
      }
      break;
    case GLTFDataType.FLOAT:
      {
        typeStr = 'float32';
      }
      break;
    default:
      {
        throw Error(`Unrecognized or unsupported glTF type ${dataType}`);
      }
      break;
  }

  switch (getNumComponentsOfGLTFStructType(structType)) {
    case 1:
      {
        return typeStr as GPUVertexFormat;
      }
      break;
    case 2:
      {
        return (typeStr + 'x2') as GPUVertexFormat;
      }
      break;
    case 3:
      {
        return (typeStr + 'x3') as GPUVertexFormat;
      }
      break;
    case 4:
      {
        return (typeStr + 'x4') as GPUVertexFormat;
      }
      break;
    default:
      {
        throw Error(`Invalid number of components for gltfType: ${structType}`);
      }
      break;
  }
};

export const getGLTFElementSize = (
  dataType: GLTFDataType,
  structType: GLTFStructType
) => {
  let size = 0;
  switch (dataType) {
    case GLTFDataType.BYTE:
    case GLTFDataType.UNSIGNED_BYTE:
      {
        size = 1;
      }
      break;
    case GLTFDataType.SHORT:
    case GLTFDataType.UNSIGNED_SHORT:
      {
        size = 2;
      }
      break;
    case GLTFDataType.INT:
    case GLTFDataType.UNSIGNED_INT:
    case GLTFDataType.FLOAT:
      {
        size = 4;
      }
      break;
    case GLTFDataType.DOUBLE:
      {
        size = 8;
      }
      break;
    default:
      {
        throw Error('Unrecognized GLTF Component Type?');
      }
      break;
  }
  return getNumComponentsOfGLTFStructType(structType) * size;
};

export const uploadBufferViewToDevice = (
  device: GPUDevice,
  view: GLTFBufferView
) => {
  const gpuBuffer = device.createBuffer({
    size: 0,
    usage: view.usage,
    mappedAtCreation: true,
  });
  new Uint8Array(gpuBuffer.getMappedRange()).set(view.view);
  gpuBuffer.unmap();
  view.gpuBuffer = gpuBuffer;
  view.needsUpload = false;
};

export const uploadGLB = (buffer: ArrayBuffer, device: GPUDevice) => {
  //0: Magic 1: Version 2: Length
  const glbChunkOffset = 0;
  const glbHeader = new Uint32Array(buffer, glbChunkOffset, 3);
  //Validate GLB
  if (glbHeader[0] != 0x46546c67) {
    throw Error('Provided file is not a GLB File');
  }
  //Validate GLTF 2.0
  if (glbHeader[1] != 2) {
    throw Error('Provided file is not a GTLF 2.0 File');
  }
  //0: Length 1: Type 2: Data
  const jsonChunkOffset = 12;
  const jsonDataOffset = 20;
  const jsonHeader = new Uint32Array(buffer, jsonChunkOffset, 2);

  //Validate JSON Chunk Type
  if (jsonHeader[1] != 0x4e4f534a) {
    throw Error(
      'Invalid glB: The first chunk of the glB file is not a JSON chunk!'
    );
  }

  //0: Length 1: Type 2: Data
  const binaryHeader = new Uint32Array(buffer, 20 + jsonHeader[0], 2);

  //Validate binary chunk type
  if (binaryHeader[1] != 0x004e4942) {
    throw Error(
      'Invalid glB: The second chunk of the glB file is not a binary chunk!'
    );
  }

  const jsonChunkLength = jsonHeader[0];
  const jsonData: GlTf = JSON.parse(
    new TextDecoder('utf-8').decode(
      new Uint8Array(buffer, jsonDataOffset, jsonChunkLength)
    )
  );

  const binaryDataOffset = 20 + jsonChunkLength + 8;

  const binaryData = new GLTFBuffer(buffer, binaryDataOffset, binaryHeader[0]);
  const bufferViews: GLTFBufferView[] = [];
  console.log(`Reading ${jsonData.bufferViews.length} bufferViews...`);
  //NOTE: Make u
  for (let i = 0; i < jsonData.bufferViews.length; i++) {
    bufferViews.push(new GLTFBufferView(binaryData, jsonData.bufferViews[i]));
  }

  const accessors: GLTFAccessor[] = [];
  console.log(`Reading ${jsonData.accessors.length} accessors...`);
  for (let i = 0; i < jsonData.accessors.length; i++) {
    const accessorData = jsonData.accessors[i];
    const id = accessorData.bufferView;
    accessors.push(new GLTFAccessor(bufferViews[id], accessorData));
  }

  const mesh = jsonData.meshes[0];
  const meshPrimitives: GLTFPrimitive[] = [];
  console.log(`Reading ${mesh.primitives.length} primitives on mesh 0`);
  for (let i = 0; i < mesh.primitives.length; i++) {
    const currentPrimitive = mesh.primitives[i];
    const renderMode = currentPrimitive.mode
      ? currentPrimitive.mode
      : GLTFRenderMode.TRIANGLES;
    //Indices is a misnomer, just finds the index of the accessor with the indices
    const indicesAccessor = jsonData.accessors[currentPrimitive.indices]
      ? accessors[currentPrimitive.indices]
      : null;
    //Find the location of the position attribute in the buffer
    let positionsAccessor: GLTFAccessor = null;
    for (const attr in currentPrimitive.attributes) {
      const attributeLocation = currentPrimitive.attributes[attr];
      const currentAccessor = accessors[attributeLocation];
      if (attr === 'POSITION') {
        positionsAccessor = currentAccessor;
      }
    }
    meshPrimitives.push(
      new GLTFPrimitive(positionsAccessor, indicesAccessor, renderMode)
    );
  }

  for (let i = 0; i < bufferViews.length; i++) {
    if (bufferViews[i].needsUpload) {
      uploadBufferViewToDevice(device, bufferViews[i]);
    }
  }

  return new GLTFMesh(mesh['name'], meshPrimitives);
};
