/* eslint-disable prettier/prettier */
import {
  GLTFAccessor,
  GLTFBuffer,
  GLTFBufferView,
  validateBinaryHeader,
  validateJSONHeader,
} from '../glbUtils';
import { GlTf } from '../gltf';
import fs from 'fs';
import path from 'path';

const structTypeByteValues = [1, 2, 3, 4, 4, 9, 16];

/*describe('GLTF Element Parsing tests', () => {
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
}); */

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
  const jsonHeader = new Uint32Array(binaryBuffer, 0, 5);
  validateJSONHeader(jsonHeader);

  // Parse the JSON chunk of the glB file to a JSON object
  const jsonData: GlTf = JSON.parse(
    new TextDecoder('utf-8').decode(new Uint8Array(binaryBuffer, 20, jsonHeader[3]))
  );

  //0: Length 1: Type 2: Data
  const binaryHeader = new Uint32Array(binaryBuffer, 20 + jsonHeader[3], 2);

  validateBinaryHeader(binaryHeader);

  const binaryData = new Uint8Array(
    binaryBuffer,
    28 + jsonHeader[3],
    binaryHeader[0]
  );

  test('Expected correct mesh values from Box.glb', () => {
    expect(jsonData.meshes.length).toBe(1);
    expect(jsonData.meshes[0].primitives.length).toBe(1);
    expect(jsonData.meshes[0].primitives[0].attributes["NORMAL"]).toEqual(1);
    expect(jsonData.meshes[0].primitives[0].attributes["POSITION"]).toEqual(2);
    expect(jsonData.meshes[0].primitives[0].indices).toEqual(0);
  })

  test('Expected correct buffers values from Box.glb', () => {
    expect(jsonData.buffers[0].byteLength).toBe(648);
    expect(jsonData.buffers[0].uri).toBeFalsy();
  })

});
