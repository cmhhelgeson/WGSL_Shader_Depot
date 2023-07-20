/* eslint-disable prettier/prettier */
import {
  GLTFDataType,
  GLTFStructType,
  getGLTFElementSize,
  getGLTFVertexType,
  uploadGLB,
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
});

describe('GLB Parsing Tests', () => {

  test('upload from binary .glb returns same JSON as upload from JSON file', async () => {
  
    const fp = path.resolve('./public/gltf/Box.glb');
    const data = fs.readFileSync(fp);
    //Access underlying ArrayBuffer
    //ArrayBuffer may be sized differently than buffer object, so we
    //need to get the exact underlying data as an ArrayBuffer
    const binaryBuffer = data.buffer.slice(
      data.byteOffset,
      data.byteOffset + data.byteLength
    );
    //0: Length 1: Type 2: Data
    const jsonChunkOffset = 12;
    const jsonDataOffset = 20;
    const jsonHeader = new Uint32Array(binaryBuffer, jsonChunkOffset, 2);
    console.log(jsonHeader[1]);

    //Validate JSON Chunk Type
    if (jsonHeader[1] != 0x4e4f534a) {
      throw Error(
        'Invalid glB: The first chunk of the glB file is not a JSON chunk!'
      );
    }

    const jsonChunkLength = jsonHeader[0];
    const jsonDataBinary: GlTf = JSON.parse(
      new TextDecoder('utf-8').decode(
        new Uint8Array(binaryBuffer, jsonDataOffset, jsonChunkLength)
      )
    );

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
});
