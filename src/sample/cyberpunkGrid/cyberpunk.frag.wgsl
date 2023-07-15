
struct Uniforms {
  time: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;


fn sun(
  uv: vec2<f32>, 
  battery: f32
) -> f32 {
  var val = smoothstep(0.3, 0.29, length(uv));
  var bloom = smoothstep(0.7, 0.0, length(uv));
  var cut = 3.0 * sin((uv.y + uniforms.time * 0.2 * (battery + 0.02)) * 100.0) + clamp(uv.y * 14.0 + 1.0, -6.0, 6.0);
  cut = clamp(cut, 0.0, 1.0);
  return clamp(val * cut, 0.0, 1.0) + bloom * 0.6;
}

fn grid(
  uv: vec2<f32>,
  battery: f32,
) -> f32 {
  var val = smoothstep(0.3, 0.29, length(uv));
 	var bloom = smoothstep(0.7, 0.0, length(uv));
  var cut = 3.0 * sin((uv.y + iTime * 0.2 * (battery + 0.02)) * 100.0) + clamp(uv.y * 14.0 + 1.0, -6.0, 6.0);
  cut = clamp(cut, 0.0, 1.0);
  return clamp(val * cut, 0.0, 1.0) + bloom * 0.6;
}

fn dot2(
  vec: vec2<f32>,
) -> f32 {
  return dot(vec, vec);
}

fn sdTrapezoid( 
  p: vec2<f32>,
  r1: f32,
  r2: f32,
  he: f32
) {
  var k1 = vec2<f32>(r2,he);
  var k2 = vec2<f32>(r2-r1,2.0*he);
  p.x = abs(p.x);
  var ca = vec2<f32>(p.x-min(p.x,(p.y<0.0)?r1:r2), abs(p.y)-he);
  var cb = p - k1 + k2*clamp( dot(k1-p,k2)/dot2(k2), 0.0, 1.0 );
  var s = (cb.x<0.0 && ca.y<0.0) ? -1.0 : 1.0;
  return s*sqrt( min(dot2(ca),dot2(cb)) );
}

fn sdLine(
  p: vec2<f32>,
  a: vec2<f32>,
  b: vec2<f32>, 
) -> f32 {
  var pa: vec2<f32> = p-a, ba = b-a;
  var h: f32 = clamp( dot(pa,ba)/dot(ba,ba), 0.0, 1.0 );
  return length( pa - ba*h );
}

fn sdBox( 
  p: vec2<f32>,
  b: vec2<f32>,
) -> f32 {
  var d: vec2<f32> = abs(p)-b;
  return length(max(d,vec2(0))) + min(max(d.x,d.y),0.0);
}

fn opSmoothUnion(
  d1: f32, 
  d2: f32, 
  k: f32
) -> f32 {
	var h: f32 = clamp(0.5 + 0.5 * (d2 - d1) /k,0.0,1.0);
  return mix(d2, d1 , h) - k * h * ( 1.0 - h);
}

fn sdCloud(
  p: vec2<f32>, 
  a1: vec2<f32>, 
  b1: vec2<f32>, 
  a2: vec2<f32>, 
  b2: vec2<f32>, 
  w: f32,
) -> f32 {
	//float lineVal1 = smoothstep(w - 0.0001, w, sdLine(p, a1, b1));
  var lineVal1: f32 = sdLine(p, a1, b1);
  var lineVal2: f32 = sdLine(p, a2, b2);
  var ww: vec2<f32> = vec2(w*1.5, 0.0);
  var left: vec2<f32> = max(a1 + ww, a2 + ww);
  var right: vec2<f32> = min(b1 - ww, b2 - ww);
  var boxCenter: vec2<f32> = (left + right) * 0.5;
  //float boxW = right.x - left.x;
  var boxH: f32 = abs(a2.y - a1.y) * 0.5;
  //float boxVal = sdBox(p - boxCenter, vec2(boxW, boxH)) + w;
  var boxVal: f32 = sdBox(p - boxCenter, vec2(0.04, boxH)) + w;
  
  var uniVal1: f32 = opSmoothUnion(lineVal1, boxVal, 0.05);
  var uniVal2: f32 = opSmoothUnion(lineVal2, boxVal, 0.05);
  
  return min(uniVal1, uniVal2);
}

@fragment
fn fragmentMain(input: VertexBaseInput) -> @location(0) vec4<f32> {
  vec2 uv = (2.0 * fragCoord.xy - iResolution.xy)/iResolution.y;
  float battery = 1.0;
  //if (iMouse.x > 1.0 && iMouse.y > 1.0) battery = iMouse.y / iResolution.y;
  //else battery = 0.8;
  // Grid
  var fog: f32 = smoothstep(0.1, -0.02, abs(uv.y + 0.2));
  var col: vec3<f32> = vec3(0.0, 0.1, 0.2);
  if (uv.y < -0.2) {
    uv.y = 3.0 / (abs(uv.y + 0.2) + 0.05);
    uv.x *= uv.y * 1.0;
    var gridVal: f32 = grid(uv, battery);
    col = mix(col, vec3(1.0, 0.5, 1.0), gridVal);
  } else {
    var fujiD: f32 = min(uv.y * 4.5 - 0.5, 1.0);
    uv.y -= battery * 1.1 - 0.51;
    
    var sunUV: vec2<f32> = uv;
    var fujiUV: vec2<f32> = uv;
    
    // Sun
    sunUV += vec2(0.75, 0.2);
    //uv.y -= 1.1 - 0.51;
    col = vec3(1.0, 0.2, 1.0);
    var sunVal: f32 = sun(sunUV, battery);
    
    col = mix(col, vec3(1.0, 0.4, 0.1), sunUV.y * 2.0 + 0.2);
    col = mix(vec3(0.0, 0.0, 0.0), col, sunVal);
    
    // fuji
    var fujiVal: f32 = sdTrapezoid( uv  + vec2(-0.75+sunUV.y * 0.0, 0.5), 1.75 + pow(uv.y * uv.y, 2.1), 0.2, 0.5);
    var waveVal: f32 = uv.y + sin(uv.x * 20.0 + iTime * 2.0) * 0.05 + 0.2;
    var wave_width: f32 = smoothstep(0.0,0.01,(waveVal));
    
    // fuji color
    col = mix( col, mix(vec3(0.0, 0.0, 0.25), vec3(1.0, 0.0, 0.5), fujiD), step(fujiVal, 0.0));
    // fuji top snow
    col = mix( col, vec3(1.0, 0.5, 1.0), wave_width * step(fujiVal, 0.0));
    // fuji outline
    col = mix( col, vec3(1.0, 0.5, 1.0), 1.0-smoothstep(0.0,0.01,abs(fujiVal)) );
    
    // horizon color
    col += mix( col, mix(vec3(1.0, 0.12, 0.8), vec3(0.0, 0.0, 0.2), clamp(uv.y * 3.5 + 3.0, 0.0, 1.0)), step(0.0, fujiVal) );
    
    // cloud
    var cloudUV: vec2<f32> = uv;
    cloudUV.x = mod(cloudUV.x + iTime * 0.1, 4.0) - 2.0;
    var cloudTime: f32 = iTime * 0.5;
    var cloudY: f32 = -0.5;
    var cloudVal1: f32 = sdCloud(cloudUV, 
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
    col = mix(col, vec3(0.0, 0.0, 0.2), 1.0 - smoothstep(0.075 - 0.0001, 0.075, cloudVal));
    col += vec3(1.0, 1.0, 1.0)*(1.0 - smoothstep(0.0,0.01,abs(cloudVal - 0.075)));
  }

  col += fog * fog * fog;
  col = mix(vec3(col.r, col.r, col.r) * 0.5, col, battery * 0.7);

  return vec4<f32>(col, 1.0)
}