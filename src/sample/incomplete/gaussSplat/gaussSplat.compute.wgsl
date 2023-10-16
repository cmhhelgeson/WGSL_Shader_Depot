struct ScalarUniforms {
  splats: u32,
  splatsPowerOfTwo: u32,
}

struct MatUniforms {
  worldToCamMatrix: mat4x4<f32>,
}

struct SplatBoundsInfo {
  color: vec4<f32>,
  position: vec3<f32>,
  scalarScale: vec3<f32>,
  harmonicsScale: vec3<f32>,
}

struct SplatChunkInfo {
  boundsMin: SplatBoundsInfo,
  boundMax: SplatBoundsInfo,
}


@group(0) @binding(0) 
var<storage, read_write> sortDistances: array<u32>;

@group(0) @binding(1)
var<storage, read_write> sortKeys: array<u32>;

@group(0) @binding(2)
var<storage, read_write> splatChunks: array<SplatChunkInfo>;

@group(0) @binding(3)
var<uniform> matUniforms: MatUniforms;

@group(0) @binding(4)
var<uniform> scalarUniforms: ScalarUniforms;

@group(0) @binding(5)
var textureSample: texture_storage_2d<rgba8unorm, read>;

// Morton interleaving 16x16 group i.e. by 4 bits of coordinates, based on this thread:
// https://twitter.com/rygorous/status/986715358852608000
// which is simplified version of https://fgiesen.wordpress.com/2009/12/13/decoding-morton-codes/
fn Morton2D_16x16(t: u32) -> vec2<u32>  // --------EAFBGCHD
{
    t = (t & 0xFF) | ((t & 0xFE) << 7); // -EAFBGCHEAFBGCHD
    t &= 0x5555;                        // -E-F-G-H-A-B-C-D
    t = (t ^ (t >> 1)) & 0x3333;        // --EF--GH--AB--CD
    t = (t ^ (t >> 2)) & 0x0f0f;        // ----EFGH----ABCD
    return vec2<u32>(t & 0xF, t >> 8);      // --------EFGHABCD
}


fn SplatIndexToPixelIndex(idx: u32) -> vec3<u32> {
  var res: vec3<u32>;
  var xy: vec2<u32> = Morton2D_16x16(idx);
  var width: u32 = 2048 / 16;
  idx >> 8;
  res.x = (idx % width) * 16 + xy.x;
  res.y = (idx / width) * 16 + xy.y;
  res.z = 0;
  return res;
}

fn LoadSplatPosTex(
  coord: vec3<u32>, 
  tex_format: u32
) -> vec3<f32> {
  var val: vec3<f32> = textureSample.read(coord).rgb;
  if (tex_format & 1) {
    val = DecodePacked_11_10_11(val.r);
  }
  return val;
}

@compute
//SV_DispatchThreadID roughly equivalent to WGSL's global_invocation_id
fn computeMain(
  @builtin(global_invocation_id) global_id: vec3<u32>,
) {
  var idx: u32 = global_id.x
  //If idx is greater than the highest power of two derived from our splat count
  //We have exceeded the bounds of our bitonic sort
  if (idx >= scalarUniforms.splatsPowerOfTwo) {
    return;
  }
  //If we have exceeded our total splats
  if (idx >= scalarUniforms.splats) {
    sortDistances[idx] = 0;
    return;
  }

  var original_index = sortKeys[idx];
  var coord = SplatIndexToPixelIndex(original_index);
  var chunk_index = original_index / 256;

  var chunk: SplatChunkInfo = splatChunks[chunk_index];

  var pos = LoadSplatPosTex(coord, 0);

  pos = mix(chunk.boundsMin.position, chunk.boundsMax.position, pos);

  pos = matUniforms.worldToCameraMatrix * vec4<f32>(
    pos.xyz * vec3<f32>(1.0, 1.0, -1.0), 1.0
  ).xyz;

  var fu: u32 = bitcast<u32>(pos.z);
  var mask: u32 = -((u32)(fu >> 31)) | 0x80000000;
  sortDistances[idx] = fu ^ mask;


  

}