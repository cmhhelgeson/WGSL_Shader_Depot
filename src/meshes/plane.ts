import { vec3 } from 'wgpu-matrix';
import { Mesh } from './mesh';

//Plane facing the ground
const createPlaneGeometry = (
  width = 1.0,
  height = 1.0,
  depth = 1.0,
  widthSegments = 1.0,
  depthSegments = 1.0
) => {
  widthSegments = Math.floor(widthSegments);
  depthSegments = Math.floor(depthSegments);

  const indices = [];
  const vertNormalUVBuffer: number[] = [];

  let numVertices = 0;

  const buildPlane = (
    planeWidth: number,
    planeHeight: number,
    planeDepth: number,
    xSections: number,
    ySections: number
  ) => {
    const segmentWidth = planeWidth / xSections;
    const segmentHeight = planeHeight / ySections;

    const widthHalf = planeWidth / 2;
    const heightHalf = planeHeight / 2;
    const depthHalf = planeDepth / 2;

    const gridX1 = xSections + 1;
    const gridY1 = ySections + 1;

    let vertexCounter = 0;

    const vertex = vec3.create();
    const normal = vec3.create();
    for (let iy = 0; iy < gridY1; iy++) {
      const y = iy * segmentHeight - heightHalf;

      for (let ix = 0; ix < gridX1; ix++) {
        const x = ix * segmentWidth - widthHalf;

        //Calculate plane vertices
        vertex[0] = x;
        vertex[2] = y;
        vertex[1] = depthHalf;
        vertNormalUVBuffer.push(...vertex);

        //Caclulate normal
        normal[0] = 0;
        normal[2] = 0;
        normal[1] = planeDepth > 0 ? 1.0 : -1.0;
        vertNormalUVBuffer.push(...normal);

        //Calculate uvs
        vertNormalUVBuffer.push(ix / xSections);
        vertNormalUVBuffer.push(1 - iy / ySections);

        vertexCounter += 1;
      }
    }

    for (let iy = 0; iy < ySections; iy++) {
      for (let ix = 0; ix < xSections; ix++) {
        const a = numVertices + ix + gridX1 * iy;
        const b = numVertices + ix + gridX1 * (iy + 1);
        const c = numVertices + (ix + 1) + gridX1 * (iy + 1);
        const d = numVertices + (ix + 1) + gridX1 * iy;

        //Push vertex indices
        //6 indices for each face
        indices.push(a, b, d);
        indices.push(b, c, d);

        numVertices += vertexCounter;
      }
    }
  };

  //Bottom face
  buildPlane(width, depth, height, widthSegments, depthSegments);

  return {
    vertices: vertNormalUVBuffer,
    indices: indices,
  };
};

export const createPlaneMesh = (
  width = 1.0,
  height = 1.0,
  depth = 1.0,
  widthSegments = 1.0,
  depthSegments = 1.0
): Mesh => {
  const { vertices, indices } = createPlaneGeometry(
    width,
    height,
    depth,
    widthSegments,
    depthSegments
  );

  return {
    vertices: new Float32Array(vertices),
    indices: new Uint16Array(indices),
    vertexStride: 8 * 4,
  };
};
