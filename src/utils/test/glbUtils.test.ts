/* eslint-disable prettier/prettier */
import {
  GLTFAccessor,
  GLTFBuffer,
  GLTFBufferView,
  GLTFDataType,
  GLTFRenderMode,
  GLTFStructType,
  getGLTFElementSize,
  getGLTFVertexType,
  getPrimitiveStateFromRenderMode,
} from '../glbUtils';
import { GlTf } from '../gltf';
import fs from 'fs';
import path from 'path';

const structTypeByteValues = [1, 2, 3, 4, 4, 9, 16];

describe('GLTF Element Parsing tests', () => {
  test('if getGLTFElementSize gets proper values: BYTE', () => {
    const dataType = GLTFDataType['BYTE'];
    expect(dataType).toBe(5120);
    expect(getGLTFElementSize(dataType, GLTFStructType['SCALAR'])).toBe(
      structTypeByteValues[0]
    );
    expect(getGLTFElementSize(dataType, GLTFStructType['VEC2'])).toBe(
      structTypeByteValues[1]
    );
    expect(getGLTFElementSize(dataType, GLTFStructType['VEC3'])).toBe(
      structTypeByteValues[2]
    );
    expect(getGLTFElementSize(dataType, GLTFStructType['VEC4'])).toBe(
      structTypeByteValues[3]
    );
    expect(getGLTFElementSize(dataType, GLTFStructType['MAT2'])).toBe(
      structTypeByteValues[4]
    );
    expect(getGLTFElementSize(dataType, GLTFStructType['MAT3'])).toBe(
      structTypeByteValues[5]
    );
    expect(getGLTFElementSize(dataType, GLTFStructType['MAT4'])).toBe(
      structTypeByteValues[6]
    );
  });

  test('if getGLTFVertexType returns proper string: BYTE', () => {
    const dataType = GLTFDataType['BYTE'];
    expect(getGLTFVertexType(dataType, GLTFStructType['SCALAR'])).toBe('sint8');
    expect(getGLTFVertexType(dataType, GLTFStructType['VEC2'])).toBe('sint8x2');
    expect(getGLTFVertexType(dataType, GLTFStructType['VEC3'])).toBe('sint8x3');
    expect(getGLTFVertexType(dataType, GLTFStructType['VEC4'])).toBe('sint8x4');
    expect(getGLTFVertexType(dataType, GLTFStructType['MAT2'])).toBe('sint8x4');
  });

  test('if getGLTFElementSize gets proper values: UNSIGNED_BYTE', () => {
    const dataType = GLTFDataType['UNSIGNED_BYTE'];
    expect(dataType).toBe(5121);
    expect(getGLTFElementSize(dataType, GLTFStructType['SCALAR'])).toBe(
      structTypeByteValues[0]
    );
    expect(getGLTFElementSize(dataType, GLTFStructType['VEC2'])).toBe(
      structTypeByteValues[1]
    );
    expect(getGLTFElementSize(dataType, GLTFStructType['VEC3'])).toBe(
      structTypeByteValues[2]
    );
    expect(getGLTFElementSize(dataType, GLTFStructType['VEC4'])).toBe(
      structTypeByteValues[3]
    );
    expect(getGLTFElementSize(dataType, GLTFStructType['MAT2'])).toBe(
      structTypeByteValues[4]
    );
    expect(getGLTFElementSize(dataType, GLTFStructType['MAT3'])).toBe(
      structTypeByteValues[5]
    );
    expect(getGLTFElementSize(dataType, GLTFStructType['MAT4'])).toBe(
      structTypeByteValues[6]
    );
  });

  test('if getGLTFVertexType returns proper string: UNSIGNED_BYTE', () => {
    const dataType = GLTFDataType['UNSIGNED_BYTE'];
    expect(getGLTFVertexType(dataType, GLTFStructType['SCALAR'])).toBe('uint8');
    expect(getGLTFVertexType(dataType, GLTFStructType['VEC2'])).toBe('uint8x2');
    expect(getGLTFVertexType(dataType, GLTFStructType['VEC3'])).toBe('uint8x3');
    expect(getGLTFVertexType(dataType, GLTFStructType['VEC4'])).toBe('uint8x4');
    expect(getGLTFVertexType(dataType, GLTFStructType['MAT2'])).toBe('uint8x4');
  });

  test('if getGLTFElementSize gets proper values: SHORT', () => {
    const dataType = GLTFDataType['SHORT'];
    expect(dataType).toBe(5122);
    expect(getGLTFElementSize(dataType, GLTFStructType['SCALAR'])).toBe(
      structTypeByteValues[0] * 2
    );
    expect(getGLTFElementSize(dataType, GLTFStructType['VEC2'])).toBe(
      structTypeByteValues[1] * 2
    );
    expect(getGLTFElementSize(dataType, GLTFStructType['VEC3'])).toBe(
      structTypeByteValues[2] * 2
    );
    expect(getGLTFElementSize(dataType, GLTFStructType['VEC4'])).toBe(
      structTypeByteValues[3] * 2
    );
    expect(getGLTFElementSize(dataType, GLTFStructType['MAT2'])).toBe(
      structTypeByteValues[4] * 2
    );
    expect(getGLTFElementSize(dataType, GLTFStructType['MAT3'])).toBe(
      structTypeByteValues[5] * 2
    );
    expect(getGLTFElementSize(dataType, GLTFStructType['MAT4'])).toBe(
      structTypeByteValues[6] * 2
    );
  });

  test('if getGLTFVertexType returns proper string: SHORT', () => {
    const dataType = GLTFDataType['SHORT'];
    expect(getGLTFVertexType(dataType, GLTFStructType['SCALAR'])).toBe('sint16');
    expect(getGLTFVertexType(dataType, GLTFStructType['VEC2'])).toBe('sint16x2');
    expect(getGLTFVertexType(dataType, GLTFStructType['VEC3'])).toBe('sint16x3');
    expect(getGLTFVertexType(dataType, GLTFStructType['VEC4'])).toBe('sint16x4');
    expect(getGLTFVertexType(dataType, GLTFStructType['MAT2'])).toBe('sint16x4');
  });

  test('if getGLTFElementSize gets proper values: UNSIGNED_SHORT', () => {
    const dataType = GLTFDataType['UNSIGNED_SHORT'];
    expect(dataType).toBe(5123);
    expect(getGLTFElementSize(dataType, GLTFStructType['SCALAR'])).toBe(
      structTypeByteValues[0] * 2
    );
    expect(getGLTFElementSize(dataType, GLTFStructType['VEC2'])).toBe(
      structTypeByteValues[1] * 2
    );
    expect(getGLTFElementSize(dataType, GLTFStructType['VEC3'])).toBe(
      structTypeByteValues[2] * 2
    );
    expect(getGLTFElementSize(dataType, GLTFStructType['VEC4'])).toBe(
      structTypeByteValues[3] * 2
    );
    expect(getGLTFElementSize(dataType, GLTFStructType['MAT2'])).toBe(
      structTypeByteValues[4] * 2
    );
    expect(getGLTFElementSize(dataType, GLTFStructType['MAT3'])).toBe(
      structTypeByteValues[5] * 2
    );
    expect(getGLTFElementSize(dataType, GLTFStructType['MAT4'])).toBe(
      structTypeByteValues[6] * 2
    );
  });

  test('if getGLTFVertexType returns proper string: UNSIGNED_SHORT', () => {
    const dataType = GLTFDataType['UNSIGNED_SHORT'];
    expect(getGLTFVertexType(dataType, GLTFStructType['SCALAR'])).toBe('uint16');
    expect(getGLTFVertexType(dataType, GLTFStructType['VEC2'])).toBe('uint16x2');
    expect(getGLTFVertexType(dataType, GLTFStructType['VEC3'])).toBe('uint16x3');
    expect(getGLTFVertexType(dataType, GLTFStructType['VEC4'])).toBe('uint16x4');
    expect(getGLTFVertexType(dataType, GLTFStructType['MAT2'])).toBe('uint16x4');
  });

  test('if getGLTFElementSize gets proper values: INT', () => {
    const dataType = GLTFDataType['INT'];
    expect(dataType).toBe(5124);
    expect(getGLTFElementSize(dataType, GLTFStructType['SCALAR'])).toBe(
      structTypeByteValues[0] * 4
    );
    expect(getGLTFElementSize(dataType, GLTFStructType['VEC2'])).toBe(
      structTypeByteValues[1] * 4
    );
    expect(getGLTFElementSize(dataType, GLTFStructType['VEC3'])).toBe(
      structTypeByteValues[2] * 4
    );
    expect(getGLTFElementSize(dataType, GLTFStructType['VEC4'])).toBe(
      structTypeByteValues[3] * 4
    );
    expect(getGLTFElementSize(dataType, GLTFStructType['MAT2'])).toBe(
      structTypeByteValues[4] * 4
    );
    expect(getGLTFElementSize(dataType, GLTFStructType['MAT3'])).toBe(
      structTypeByteValues[5] * 4
    );
    expect(getGLTFElementSize(dataType, GLTFStructType['MAT4'])).toBe(
      structTypeByteValues[6] * 4
    );
  });

  test('if getGLTFVertexType returns proper string: INT', () => {
    const dataType = GLTFDataType['INT'];
    expect(getGLTFVertexType(dataType, GLTFStructType['SCALAR'])).toBe('int32');
    expect(getGLTFVertexType(dataType, GLTFStructType['VEC2'])).toBe('int32x2');
    expect(getGLTFVertexType(dataType, GLTFStructType['VEC3'])).toBe('int32x3');
    expect(getGLTFVertexType(dataType, GLTFStructType['VEC4'])).toBe('int32x4');
    expect(getGLTFVertexType(dataType, GLTFStructType['MAT2'])).toBe('int32x4');
  });

  test('if getGLTFElementSize gets proper values: UNSIGNED_INT', () => {
    const dataType = GLTFDataType['UNSIGNED_INT'];
    expect(dataType).toBe(5125);
    expect(getGLTFElementSize(dataType, GLTFStructType['SCALAR'])).toBe(
      structTypeByteValues[0] * 4
    );
    expect(getGLTFElementSize(dataType, GLTFStructType['VEC2'])).toBe(
      structTypeByteValues[1] * 4
    );
    expect(getGLTFElementSize(dataType, GLTFStructType['VEC3'])).toBe(
      structTypeByteValues[2] * 4
    );
    expect(getGLTFElementSize(dataType, GLTFStructType['VEC4'])).toBe(
      structTypeByteValues[3] * 4
    );
    expect(getGLTFElementSize(dataType, GLTFStructType['MAT2'])).toBe(
      structTypeByteValues[4] * 4
    );
    expect(getGLTFElementSize(dataType, GLTFStructType['MAT3'])).toBe(
      structTypeByteValues[5] * 4
    );
    expect(getGLTFElementSize(dataType, GLTFStructType['MAT4'])).toBe(
      structTypeByteValues[6] * 4
    );
  });

  test('if getGLTFVertexType returns proper string: UNSIGNED_INT', () => {
    const dataType = GLTFDataType['UNSIGNED_INT'];
    expect(getGLTFVertexType(dataType, GLTFStructType['SCALAR'])).toBe('uint32');
    expect(getGLTFVertexType(dataType, GLTFStructType['VEC2'])).toBe('uint32x2');
    expect(getGLTFVertexType(dataType, GLTFStructType['VEC3'])).toBe('uint32x3');
    expect(getGLTFVertexType(dataType, GLTFStructType['VEC4'])).toBe('uint32x4');
    expect(getGLTFVertexType(dataType, GLTFStructType['MAT2'])).toBe('uint32x4');
  });

  test('if getGLTFElementSize gets proper values: FLOAT', () => {
    const dataType = GLTFDataType['FLOAT'];
    expect(dataType).toBe(5126);
    expect(getGLTFElementSize(dataType, GLTFStructType['SCALAR'])).toBe(
      structTypeByteValues[0] * 4
    );
    expect(getGLTFElementSize(dataType, GLTFStructType['VEC2'])).toBe(
      structTypeByteValues[1] * 4
    );
    expect(getGLTFElementSize(dataType, GLTFStructType['VEC3'])).toBe(
      structTypeByteValues[2] * 4
    );
    expect(getGLTFElementSize(dataType, GLTFStructType['VEC4'])).toBe(
      structTypeByteValues[3] * 4
    );
    expect(getGLTFElementSize(dataType, GLTFStructType['MAT2'])).toBe(
      structTypeByteValues[4] * 4
    );
    expect(getGLTFElementSize(dataType, GLTFStructType['MAT3'])).toBe(
      structTypeByteValues[5] * 4
    );
    expect(getGLTFElementSize(dataType, GLTFStructType['MAT4'])).toBe(
      structTypeByteValues[6] * 4
    );
  });

  test('if getGLTFVertexType returns proper string: FLOAT', () => {
    const dataType = GLTFDataType['FLOAT'];
    expect(getGLTFVertexType(dataType, GLTFStructType['SCALAR'])).toBe('float32');
    expect(getGLTFVertexType(dataType, GLTFStructType['VEC2'])).toBe('float32x2');
    expect(getGLTFVertexType(dataType, GLTFStructType['VEC3'])).toBe('float32x3');
    expect(getGLTFVertexType(dataType, GLTFStructType['VEC4'])).toBe('float32x4');
    expect(getGLTFVertexType(dataType, GLTFStructType['MAT2'])).toBe('float32x4');
  });

  test('if getGLTFElementSize gets proper values: DOUBLE', () => {
    const dataType = GLTFDataType['DOUBLE'];
    expect(dataType).toBe(5130);
    expect(getGLTFElementSize(dataType, GLTFStructType['SCALAR'])).toBe(
      structTypeByteValues[0] * 8
    );
    expect(getGLTFElementSize(dataType, GLTFStructType['VEC2'])).toBe(
      structTypeByteValues[1] * 8
    );
    expect(getGLTFElementSize(dataType, GLTFStructType['VEC3'])).toBe(
      structTypeByteValues[2] * 8
    );
    expect(getGLTFElementSize(dataType, GLTFStructType['VEC4'])).toBe(
      structTypeByteValues[3] * 8
    );
    expect(getGLTFElementSize(dataType, GLTFStructType['MAT2'])).toBe(
      structTypeByteValues[4] * 8
    );
    expect(getGLTFElementSize(dataType, GLTFStructType['MAT3'])).toBe(
      structTypeByteValues[5] * 8
    );
    expect(getGLTFElementSize(dataType, GLTFStructType['MAT4'])).toBe(
      structTypeByteValues[6] * 8
    );
  });

  test('if getPrimitiveStateFromRenderMode works correctly', () => {
    let primitiveState = getPrimitiveStateFromRenderMode(GLTFRenderMode['LINE']);
    expect(primitiveState.topology).toBe('line-list')
    primitiveState = getPrimitiveStateFromRenderMode(GLTFRenderMode['LINE_LOOP']);
    expect(primitiveState.topology).toBe('line-list')
    primitiveState = getPrimitiveStateFromRenderMode(GLTFRenderMode['TRIANGLES']);
    expect(primitiveState.topology).toBe('triangle-list')
    primitiveState = getPrimitiveStateFromRenderMode(GLTFRenderMode['TRIANGLE_FAN']);
    expect(primitiveState.topology).toBe('triangle-list');
    primitiveState = getPrimitiveStateFromRenderMode(GLTFRenderMode['LINE_STRIP']);
    expect(primitiveState.topology).toBe('line-strip');
    primitiveState = getPrimitiveStateFromRenderMode(GLTFRenderMode['TRIANGLE_STRIP']);
    expect(primitiveState.topology).toBe('triangle-strip');
    primitiveState = getPrimitiveStateFromRenderMode(GLTFRenderMode['POINTS']);
    expect(primitiveState.topology).toBe('point-list');
  })
});

describe('GLB Parsing Tests', () => {

  const fp = path.resolve('./public/gltf/Box.glb');
  const data = fs.readFileSync(fp);
  //Access underlying ArrayBuffer
  //ArrayBuffer may be sized differently than buffer object, so we
  //need to get the exact underlying data as an ArrayBuffer
  const binaryBuffer = data.buffer.slice(
    data.byteOffset,
    data.byteOffset + data.byteLength
  );
  //0: Magic 1: Version 2: Length
  const glbChunkOffset = 0;
  const glbHeader = new Uint32Array(binaryBuffer, glbChunkOffset, 3);
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
  const jsonHeader = new Uint32Array(binaryBuffer, jsonChunkOffset, 2);

  //Validate JSON Chunk Type
  if (jsonHeader[1] != 0x4e4f534a) {
    throw Error(
      'Invalid glB: The first chunk of the glB file is not a JSON chunk!'
    );
  }

  //0: Length 1: Type 2: Data
  const binaryHeader = new Uint32Array(binaryBuffer, 20 + jsonHeader[0], 2);

  //Validate binary chunk type
  if (binaryHeader[1] != 0x004e4942) {
    throw Error(
      'Invalid glB: The second chunk of the glB file is not a binary chunk!'
    );
  }

  const jsonChunkLength = jsonHeader[0];
  const jsonDataBinary: GlTf = JSON.parse(
    new TextDecoder('utf-8').decode(
      new Uint8Array(binaryBuffer, jsonDataOffset, jsonChunkLength)
    )
  );

  const binaryDataOffset = 20 + jsonChunkLength + 8;


  test('upload from binary .glb returns same JSON as upload from JSON file', async () => {

    const jsfp = path.resolve('./public/gltf/Box.gltf');
    const jsd = fs.readFileSync(jsfp);
    const jsonBuffer = jsd.buffer.slice(
      jsd.byteOffset, 
      jsd.byteOffset + jsd.byteLength
    );
    const jsonDataJSON: GlTf = JSON.parse(
      new TextDecoder('utf-8').decode(
        new Uint8Array(jsonBuffer)
      )
    );
    //No uri since all data is packed
    delete jsonDataJSON.buffers[0].uri;
    console.log(jsonDataBinary);
    expect(jsonDataBinary).toEqual(jsonDataJSON);
  });

  test('glb bufferViews data translated to GLTFBufferView class', () => {
    const binaryData = new GLTFBuffer(binaryBuffer, binaryDataOffset, binaryHeader[0]);
    const bufferViews: GLTFBufferView[] = [];
    console.log(`Reading ${jsonDataBinary.bufferViews.length} bufferViews...`);
    expect(jsonDataBinary.bufferViews.length).toBe(2);
    for (let i = 0; i < jsonDataBinary.bufferViews.length; i++) {
      bufferViews.push(new GLTFBufferView(binaryData, jsonDataBinary.bufferViews[i]));
    }
    expect(bufferViews[0].byteOffset).toBe(576);
    expect(bufferViews[0].byteLength).toBe(72);
    expect(bufferViews[0].byteStride).toBe(0);

    expect(bufferViews[1].byteStride).toBe(12);

  })

  test('GLTFAccessor ByteStride fixed when GLTFBufferView byteStride is 0', () => {
    const binaryData = new GLTFBuffer(binaryBuffer, binaryDataOffset, binaryHeader[0]);
    const bufferViews: GLTFBufferView[] = [];
    console.log(`Reading ${jsonDataBinary.bufferViews.length} bufferViews...`);
    for (let i = 0; i < jsonDataBinary.bufferViews.length; i++) {
      bufferViews.push(new GLTFBufferView(binaryData, jsonDataBinary.bufferViews[i]));
    }
    const accessors: GLTFAccessor[] = [];
    for (let i = 0; i < jsonDataBinary.accessors.length; i++) {
      const accessorData = jsonDataBinary.accessors[i];
      const id = accessorData.bufferView;
      accessors.push(new GLTFAccessor(bufferViews[id], accessorData));
    }
    expect(accessors[0].vertexType).toBe('uint16');
    expect(accessors[0].byteStride).toBe(2);
    expect(accessors[1].byteStride).toBe(bufferViews[1].byteStride)
    expect(accessors[2].byteStride).toBe(bufferViews[1].byteStride)

  })
});
