@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
  //var uv: vec2<f32> = -(input.v_uv * 2.0 - 1.0) * vec2<f32>(-1.0, -1.0);
  var uv = (input.Position.xy * 2.0 - vec2<f32>(uniforms.resolutionX, uniforms.resolutionY) + vec2<f32>(-35.0, -35.0)) / uniforms.resolutionY;
  var stepOneUv = uv;
  uv.y = -uv.y;
  var stepTwoUv = uv;
  var battery: f32 = 1.0;
  var fog: f32 = smoothstep(uniforms.fog, -0.02, abs(uv.y + 0.2));
  var color: vec3<f32> = vec3(0.0, 0.1, 0.2);
  var stepThreeUv: vec2<f32> = vec2(0.0, 0.0);
  var stepFourUv: vec2<f32> = vec2(0.0, 0.0);
  var stepFiveUv: vec2<f32> = vec2(0.0, 0.0);
  var stepSixUv: vec2<f32> = vec2(0.0, 0.0);
  var stepSevenUv: vec2<f32> = vec2(0.0, 0.0);
  var stepEightUv: vec2<f32> = vec2(0.0, 0.0);
  var stepNineUv: vec2<f32> = vec2(0.0, 0.0);
  var gridVal: f32 = 0.0;
  var val = 0.0;

  if (uv.y < -0.2) {
    uv.x = 1.0;
    uv.y = 3.0 / (abs(uv.y + 0.2) + 0.05);
    stepThreeUv = uv;
    gridVal = grid(uv, battery, uniforms.time, uniforms.lineSize, uniforms.lineGlow);
    //As uv.y gets closer to -0.2, y will get closer to one
    stepFourUv = vec2(uv.y, uv.y * uv.y * uniforms.lineSize) * uniforms.lineGlow;
    stepFiveUv = stepFourUv + vec2<f32>(0.0, uniforms.time * 4.0 * (battery + 0.05));
    stepFiveUv = abs(fract(stepFiveUv) - 0.5);
    stepSixUv = smoothstep(stepFourUv, vec2<f32>(0.0), stepFiveUv);
    stepSevenUv = smoothstep(stepFourUv * 5.0, vec2<f32>(0.0), stepFiveUv) * 0.4 * battery;
    color = mix(color, vec3(1.0, 0.5, 1.0), gridVal);
  } else {
    var fujiD: f32 = min(uv.y * 4.5 - 0.5, 1.0);
    uv.y -= battery * 1.1 - 0.51;
            
    var sunUV: vec2<f32> = uv;
    var fujiUV: vec2<f32> = uv;
            
    // Sun
    sunUV += vec2(0.75, 0.2);
    stepEightUv = sunUV;
    stepNineUv = fujiUV;
    //uv.y -= 1.1 - 0.51;
    color = vec3(1.0, 0.2, 1.0);
    var sunVal = sun(sunUV, battery, uniforms.time);
    
    color = mix(color, vec3(1.0, 0.4, 0.1), sunUV.y * 2.0 + 0.2);
    color = mix(vec3(0.0, 0.0, 0.0), color, sunVal);
    
    
    // cloud
    var cloudUV: vec2<f32> = uv;
    cloudUV.x = (cloudUV.x + uniforms.time * 0.1) % 4 - 2.0;
    var cloudTime = uniforms.time * 0.5;
    var cloudY = -0.5;
    var cloudVal1 = sdCloud(cloudUV, 
                             vec2(0.1 + sin(cloudTime + 140.5)*0.1,cloudY), 
                             vec2(1.05 + cos(cloudTime * 0.9 - 36.56) * 0.1, cloudY), 
                             vec2(0.2 + cos(cloudTime * 0.867 + 387.165) * 0.1,0.25+cloudY), 
                             vec2(0.5 + cos(cloudTime * 0.9675 - 15.162) * 0.09, 0.25+cloudY), 0.075);
    cloudY = -0.6;
    var cloudVal2: f32 = sdCloud(cloudUV, 
                             vec2(-0.9 + cos(cloudTime * 1.02 + 541.75) * 0.1,cloudY), 
                             vec2(-0.5 + sin(cloudTime * 0.9 - 316.56) * 0.1, cloudY), 
                             vec2(-1.5 + cos(cloudTime * 0.867 + 37.165) * 0.1,0.25+cloudY), 
                             vec2(-0.6 + sin(cloudTime * 0.9675 + 665.162) * 0.09, 0.25+cloudY), 0.075);
    
    var cloudVal: f32 = min(cloudVal1, cloudVal2);
    
    //col = mix(col, vec3(1.0,1.0,0.0), smoothstep(0.0751, 0.075, cloudVal));
    color = mix(color, vec3(0.0, 0.0, 0.2), 1.0 - smoothstep(0.075 - 0.0001, 0.075, cloudVal));
    color += vec3(1.0, 1.0, 1.0)*(1.0 - smoothstep(0.0,0.01,abs(cloudVal - 0.075)));
  }

  color += fog * fog * fog;
  color = mix(vec3f(color.r, color.r, color.r) * 0.5, color, battery * 0.7);

  if (uniforms.debugStep == 0) {
    return vec4<f32>(stepOneUv, 0.0, 1.0);
  }
  if (uniforms.debugStep == 1) {
    return vec4<f32>(stepTwoUv, 0.0, 1.0);
  }
  if (uniforms.debugStep == 2) {
    return vec4<f32>(stepThreeUv, 0.0, 1.0);
  }
  if (uniforms.debugStep == 3) {
    return vec4<f32>(stepFourUv, 0.0, 1.0);
  } 
  if (uniforms.debugStep == 4) {
    return vec4<f32>(stepFiveUv, 0.0, 1.0);
  }
  if (uniforms.debugStep == 5) {
    return vec4<f32>(stepSixUv, 0.0, 1.0);
  }
  if (uniforms.debugStep == 6) {
    return vec4<f32>(stepSevenUv, 0.0, 1.0);
  }
  if (uniforms.debugStep == 7) {
    return vec4<f32>(stepEightUv, 0.0, 1.0);
  }
  if (uniforms.debugStep == 8) {
    return vec4<f32>(stepNineUv, 0.0, 1.0);
  }

  //input.Position.xy * 2.0 - 1.0 

  return vec4<f32>(color, 1.0);
  // return vec4<f32>(uv, 0.0, 1.0);
}