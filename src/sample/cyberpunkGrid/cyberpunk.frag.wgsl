
struct VertexOutput {
  @builtin(position) Position: vec4<f32>,
  @location(0) v_uv: vec2<f32>
}

struct Uniforms {
  resolution: vec2<f32>,
  time: f32,
  debugStep: f32,
}

fn sun(
  uv: vec2<f32>, 
  battery: f32,
  time: f32
) -> f32 {
  var val = smoothstep(0.3, 0.29, length(uv));
  var bloom = smoothstep(0.7, 0.0, length(uv));
  var cut = 3.0 * sin((uv.y + time * 0.2 * (battery + 0.02)) * 100.0) + clamp(uv.y * 14.0 + 1.0, -6.0, 6.0);
  cut = clamp(cut, 0.0, 1.0);
  return clamp(val * cut, 0.0, 1.0) + bloom * 0.6;
}

fn grid(
  uv: vec2<f32>,
  battery: f32,
  time: f32,
) -> f32 {
  var val = smoothstep(0.3, 0.29, length(uv));
 	var bloom = smoothstep(0.7, 0.0, length(uv));
  var cut = 3.0 * sin((uv.y + time * 0.2 * (battery + 0.02)) * 100.0) + clamp(uv.y * 14.0 + 1.0, -6.0, 6.0);
  cut = clamp(cut, 0.0, 1.0);
  return clamp(val * cut, 0.0, 1.0) + bloom * 0.6;
}

fn dot2(
  vec: vec2<f32>,
) -> f32 {
  return dot(vec, vec);
}

fn sdTrapezoid( 
  p: vec2f,
  halfWidthLeft: f32,
  halfWidthRight: f32,
  halfHeight: f32
) -> f32 {
  //Bottom right of trapezoid (top right in webgpu?)
  var k1 = vec2<f32>(halfWidthRight,halfHeight); 
  //Move from bottom right to top right
  var k2 = vec2<f32>(halfWidthRight-halfWidthLeft,2.0*halfHeight);
  var pX = abs(p.x);
  var selectedHalfWidth = select(halfWidthRight, halfWidthLeft, p.y < 0.0);
  var ca = vec2<f32>(pX-min(pX, selectedHalfWidth), abs(p.y)-halfHeight);
  var cb = p - k1 + k2*clamp( dot(k1-p,k2)/dot2(k2), 0.0, 1.0 );
  var s = select(1.0, -1.0, (cb.x<0.0 && ca.y<0.0));
  return s*sqrt( min(dot2(ca),dot2(cb)) );
}

fn sdLine(
  p: vec2<f32>,
  a: vec2<f32>,
  b: vec2<f32>, 
) -> f32 {
  var pa: vec2<f32> = p-a;
  var ba: vec2<f32> = b-a;
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


@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
  var uv: vec2<f32> = (2.0 *
    input.Position.xy - uniforms.resolution.xy
  )/uniforms.resolution.y;
  var battery: f32 = 1.0;
  var fog: f32 = smoothstep(0.1, -0.02, abs(uv.y + 0.2));
  var color: vec3<f32> = vec3(0.0, 0.1, 0.2);
  if (uv.y < -0.2) {
    uv.y = 3.0 / (abs(uv.y + 0.2) + 0.05);
    uv.x *= uv.y * 1.0;
    var gridVal = grid(uv, battery, uniforms.time);
    color = mix(color, vec3(1.0, 0.5, 1.0), gridVal);
  }

  color += fog * fog * fog;
  color = mix(vec3f(color.r, color.r, color.r) * 0.5, color, battery * 0.7);

  return vec4<f32>(color, 1.0);
}