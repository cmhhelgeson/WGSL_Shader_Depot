import { vec2, vec3 } from 'wgpu-matrix';
import { Vec2 } from 'wgpu-matrix/dist/1.x/vec2';
import { Vec3 } from 'wgpu-matrix/dist/1.x/vec3';

export const Mesh_OBJ_Has_Texture_Coords = (location: string): boolean => {
  //Pattern that selects indice lines of an obj
  const patternUV = /f([\s\S]+?)\n/g;
  const fileExplorer: XMLHttpRequest = new XMLHttpRequest();
  //Asynchronously 'get' the model
  fileExplorer.open('get', location, true);
  //Send request with null body
  fileExplorer.send(null);

  //When the file has been opened
  fileExplorer.onreadystatechange = () => {
    const { responseText, readyState, status } = fileExplorer;
    if (readyState === 4 && status === 200) {
      const indiceLines = patternUV.exec(responseText);
      if (indiceLines !== null) {
        return indiceLines[0].includes('//');
      } else {
        return false;
      }
    }
  };
  return false;
};

const parseOBJResponse = (
  response: string,
  verts: Vec3[],
  vertUVs: Vec2[],
  vertNormals: Vec3[],
  faceVerts: number[][],
  faceUVs: number[][],
  faceNormals: number[][]
): void => {
  const lines = response.split('\n');
  for (const l of lines) {
    const values = l.split(' ');
    if (values[values.length - 1].includes('\r')) {
      values[values.length - 1] = values[values.length - 1].slice(0, -1);
    }
    switch (values[0]) {
      //load new vertices
      case 'v':
        {
          const x = parseFloat(values[1]);
          const y = parseFloat(values[2]);
          const z = parseFloat(values[3]);
          verts.push(vec3.create(x, y, z));
        }
        break;
      //Load new texture coordinates
      case 'vt':
        {
          const u = parseFloat(values[1]);
          const v = parseFloat(values[2]);
          vertUVs.push(vec2.create(u, v));
        }
        break;
      //Load new vertexNormals
      case 'vn':
        {
          const x = parseFloat(values[1]);
          const y = parseFloat(values[2]);
          const z = parseFloat(values[3]);
          vertNormals.push(vec3.create(x, y, z));
        }
        break;
      //Load new indices
      case 'f':
        {
          //Note that the format for a f command is
          //f position_id/uv coords_id/normal_id
          //obj without textures will be
          //f position_id//normal_id
          const pos = [];
          const uv = [];
          const normals = [];
          //Index into each pos/uv/normal triplet
          for (let i = 0; i < 3; i++) {
            pos.push(parseInt(values[i + 1].split('/')[0]) - 1);
            uv.push(parseInt(values[i + 1].split('/')[1]) - 1);
            normals.push(parseInt(values[i + 1].split('/')[2]) - 1);
          }
          faceVerts.push(pos);
          faceUVs.push(uv);
          faceNormals.push(normals);
        }
        break;
    }
  }
};

const validateUVIndex = (index: any) => {
  return isNaN(index) || index === undefined || index === null;
};

export type SimpleMesh = {
  tris: Triangle[]
};

export type Triangle = {
  p: [Vec3, Vec3, Vec3],
  uvCoords: [Vec2, Vec2, Vec2]
};

export const SimpleMesh_Load_Model_OBJ = (data: string) => {
  const _verts: Vec3[] = [];
  const _vertUVs: Vec2[] = [];
  const _vertNormals: Vec3[] = [];
  const _faceVerts: number[][] = [];
  const _faceUVs: number[][] = [];
  const _faceNormals: number[][] = [];
  parseOBJResponse(
    data,
    _verts,
    _vertUVs,
    _vertNormals,
    _faceVerts,
    _faceUVs,
    _faceNormals
  );
  const mesh: SimpleMesh = {
    tris: [],
  };
  //For each triangle face
  for (let i = 0; i < _faceVerts.length; i++) {
    const vi1 = _faceVerts[i][0];
    const vi2 = _faceVerts[i][1];
    const vi3 = _faceVerts[i][2];

    let uvi1 = 0;
    let uvi2 = 0;
    let uvi3 = 0;
    //TODO: Currently, if no uvs are present, these values will be NaN, but perhaps we don't want to store
    //large arrays of NaN values
    uvi1 = _faceUVs[i][0];
    uvi2 = _faceUVs[i][1];
    uvi3 = _faceUVs[i][2];
    if (validateUVIndex(uvi1)) {
      const tri: Triangle = {
        p: [_verts[vi1], _verts[vi2], _verts[vi3]],
        uvCoords: [
          _vertUVs[uvi1] as Vec2,
          _vertUVs[uvi2] as Vec2,
          _vertUVs[uvi3] as Vec2,
        ],
      };
      mesh.tris.push(tri);
    } else {
      const dummy: Vec2 = vec2.create(0.0, 0.0);
      const tri: Triangle = {
        p: [_verts[vi1] as Vec2, _verts[vi2] as Vec2, _verts[vi3] as Vec2],
        uvCoords: [dummy, dummy, dummy],
      };
      mesh.tris.push(tri);
    }
  }
  return mesh;
};

type Mesh = {
  verts: Vec3[],
  vertexNormals: Vec3[],
  vertexUVs: Vec2[],
  faceVerts: number[][],
  faceUVs: number[][],
  faceNormals: number[][]   
}

export const Mesh_Load_Model_Obj = (data: string) => {
  let _verts: Vec3[] = [];
  let _vertUVs: Vec2[] = [];
  let _vertNormals: Vec3[] = [];
  let _faceVerts: number[][] = [];
  let _faceUVs: number[][] = [];
  let _faceNormals: number[][] = [];
  parseOBJResponse(
    data,
    _verts,
    _vertUVs,
    _vertNormals,
    _faceVerts,
    _faceUVs,
    _faceNormals
  );

  let mesh: Mesh = {
    verts: _verts,
    vertexUVs: _vertUVs,
    faceUVs: _faceUVs,
    faceNormals: _faceNormals,
    faceVerts: _faceVerts,
    vertexNormals: _vertNormals,
  };

  return mesh;
};

export const getChunkDistanceFromCamera = (
  cameraPos: Vec3,
  chunkCenter: Vec3
): number => {
  return Math.sqrt(
    (cameraPos[0] - chunkCenter[0]) ** 2 +
      (cameraPos[1] - chunkCenter[1]) ** 2 +
      (cameraPos[2] - chunkCenter[2]) ** 2
  );
};
