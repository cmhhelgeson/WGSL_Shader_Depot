export const computeArgKeys = ['width', 'height', 'algo', 'blockHeight'];

export const NaiveBitonicCompute = (workgroupSize: number) => {
  if (workgroupSize % 2 !== 0 || workgroupSize > 256) {
    workgroupSize = 256;
  }
  //Ensure that workgroupSize is half the number of elements
  return `

struct Uniforms {
  width: f32,
  height: f32,
  algo: u32,
  blockHeight: u32,
}

//Data that is local to the workgroup. Gets reset on each workgroup dispatch
var<workgroup> local_data: array<u32, ${workgroupSize}>;

//Swap values in local_data
fn swap(idx1: u32, idx2: u32) {
  if (local_data[idx1] < local_data[idx2]) {
    let temp: u32 = local_data[idx1];
    local_data[idx1] = local_data[idx2];
    local_data[idx2] = temp;
  }
  return;
}

fn prepare_flip(thread_id: u32, block_height: u32) {
  let q: u32 = ((2 * thread_id) / block_height) / block_height;
  var idx: vec2<u32> = q + vec2<u32>(
    thread_id % block_height, block_height - (thread_id % block_height)
  );
  swap(idx.x, idx.y);
}

fn prepare_disperse(thread_id: u32, block_height: u32) {
  var q: u32 = ((2 * thread_id) / block_height) * block_height;
	var idx: vec2<u32> = q + vec2<u32>(
    thread_id % block_height, (thread_id % block_height) + (block_height / 2) 
  );
	swap(idx.x, idx.y);
}

fn prepare_flip_and_disperse(thread_id: u32, block_height: u32) {
  swap(0, 0);
}

@group(0) @binding(0) var<storage, read_write> alpha_data: array<u32>;
@group(0) @binding(1) var<uniform> uniforms: Uniforms;

@compute @workgroup_size(${workgroupSize}, 1, 1)
fn computeMain(
  @builtin(global_invocation_id) global_id: vec3<u32>,
  @builtin(local_invocation_id) local_id: vec3<u32>,
) {
  //Each thread will populate the workgroup data... (1 thread for every 2 elements)
  local_data[local_id.x * 2] = alpha_data[local_id.x * 2];
  local_data[local_id.x * 2 + 1] = alpha_data[local_id.x * 2 + 1];

  //...and wait for each other to finish their own bit of data population.
  workgroupBarrier();

  var num_elements = uniforms.width * uniforms.height;

  switch uniforms.algo {
    case 1: { //Local Flip
      prepare_flip(local_id.x, uniforms.blockHeight);
    }
    case 2: { //Local Disperse
      prepare_disperse(local_id.x, uniforms.blockHeight);
    }
    case 3, default: { //Local Flip and Disperse
      prepare_flip_and_disperse(local_id.x, uniforms.blockHeight);
    }
  }

  //Ensure that all threads have swapped their own regions of data
  workgroupBarrier();

  //Repopulate global data with local data
  alpha_data[local_id.x * 2] = local_data[local_id.x * 2];
  alpha_data[local_id.x * 2 + 1] = local_data[local_id.x * 2 + 1];

}`;
};
