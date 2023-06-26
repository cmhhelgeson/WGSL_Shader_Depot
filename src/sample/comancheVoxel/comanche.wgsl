struct VertexOutput {
  @builtin(position) Position : vec4<f32>,
  @location(1) @interpolate(flat) rayStep: vec2f,
  @location(2) pixelY: f32,
}

struct Uniform_Canvas {
  dimensions: vec2f,
}

struct Uniform_Frame {
  //16 bytes (vec3s alligned to 16 in wgsl)
  mapPosition: vec4f, //xPosition, yPosition, helicopter height, padding
  //8 bytes (24 total)
  leftRayTerminator: vec2f, //leftRayX, leftRayY
  //8 bytes (32 total)
  rightRayTerminator: vec2f, //rightRayX, rightRayY
  //4 bytes (36 total)
  fovAngle: f32,
  //12 bytes (48 total)
  zFar: f32,
  heightScaleFactor: f32, 
  horizonLine: f32, 
}


@group(0) @binding(0) var<uniform> canvas: Uniform_Canvas;
@group(1) @binding(0) var<uniform> camera: Uniform_Frame;

@vertex
fn vertexMain(
  @builtin(instance_index) instanceIdx : u32,
  @location(0) position : vec2<f32>,
) -> VertexOutput {
  var output: VertexOutput;
  // Start by working exclusively in map coordinates
  // Get pixel x coordinate (corresponds to line instance)
  var instance = f32(instanceIdx);
  //Get pixel Y coordinate
  output.pixelY = (-position.y + 1) * (canvas.dimensions.y / 2); 
  //Get the xy span of the view cone in map space
  var span: vec2f = camera.rightRayTerminator.xy - camera.leftRayTerminator.xy;

  //The problem with all the example code is that deltaX and deltaY always refer to different things
  output.rayStep = vec2f(
    // Ray step determines, at each cross section of our view cone, how much we will move in
    // map space for every pixel in screen space
    // For instance 500span/500screenWidth = 1 pixel in map space for pixel in screen space
    (
      (camera.leftRayTerminator.x + (span.x / canvas.dimensions.x) * instance) / camera.zFar
    ), 
    (
      (camera.leftRayTerminator.y + (span.y / canvas.dimensions.x) * instance) / camera.zFar
    ),
  );
  var rayPosition = vec2f(camera.mapPosition.x, camera.mapPosition.y);

  var normalizedX = instance / (canvas.dimensions.x / 2.0) - 1.0;

  output.Position = vec4<f32>(normalizedX, position.y, 1.0, 1.0);
  return output;
}

@group(0) @binding(1) var textureSampler: sampler;
@group(0) @binding(2) var colorMap: texture_2d<f32>;
@group(0) @binding(3) var heightMap: texture_2d<f32>;

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  var testColor = textureSample(colorMap, textureSampler, input.rayStep);
  var finalColor = vec4f(-2.0, -2.0, -2.0, -2.0);
  var finalUVCoord = vec2f(-2.0, -2.0);
  for (var z: f32 = 1.0; z < camera.zFar; z += 1.0) {
    var mapPos = vec2f(camera.mapPosition.x + input.rayStep.x, camera.mapPosition.y + input.rayStep.y);
    var uvCoord = vec2f(mapPos) / vec2f(1024.0, 1024.0);

    var perspectiveHeight = (camera.mapPosition.z - textureSample(heightMap, textureSampler, uvCoord).r);
    var drawHeight = perspectiveHeight * camera.heightScaleFactor + camera.horizonLine;

    var newColor: vec4f = textureSample(colorMap, textureSampler, uvCoord);
    if (drawHeight < input.pixelY) {
      finalColor = select(newColor, finalColor, finalColor.x == -2.0);
    }
  }
  return vec4f(255.0, 0.1, 0.1, 1.0);
}



