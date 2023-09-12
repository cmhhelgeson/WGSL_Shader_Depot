struct MatUniforms {
  projMat: mat4x4f,
  viewMat: mat4x4f,
}

struct F32Uniforms {
  focal: vec2<f32>,
  viewport: vec2<f32>,
}

//vec3s and vec4fs should stay alligned due to padding around vec3s
struct VertexInput {
  @location(0) color: vec4<f32>,
  @location(1) quaternion: vec4<f32>,
  @location(2) scale: vec4<f32>,
  @location(3) center: vec4<f32>,
}

struct VertexOutput {
  @builtin(position) Position: vec4<f32>,
  @location(0) color: vec4<f32>,
  @location(1) conic: vec3<f32>,
  @location(2) center: vec2<f32>,
  @location(3) cPos: vec2<f32>,
}

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
    var camspace: vec4<f32> = view * vec4<f32>(input.center, 1.0);
    var pos2d: vec4<f32> = projection * mat4(1,0,0,0,0,-1,0,0,0,0,1,0,0,0,0,1) * camspace;

    var cov2d: vec3<f32> = compute_cov2d(center, scale, quat);
    var det: f32 = cov2d.x * cov2d.z - cov2d.y * cov2d.y;
    var conic: vec3<f32> = vec3(cov2d.z, cov2d.y, cov2d.x) / det;
    var mid: f32 = 0.5 * (cov2d.x + cov2d.z);
    var lambda1: f32 = mid + sqrt(max(0.1, mid * mid - det));
    var lambda2: f32 = mid - sqrt(max(0.1, mid * mid - det));
    var v1: vec2<f32> = 7.0 * sqrt(lambda1) * normalize(vec2<f32>(cov2d.y, lambda1 - cov2d.x));
    var v2: vec2<f32> = 7.0 * sqrt(lambda2) * normalize(vec2<f32>(-(lambda1 - cov2d.x),cov2d.y));

    var output: VertexOutput;

    output.color = color;
    output.conic = conic;
    output.center = vec2(pos2d) / pos2d.w;

    output.cPos = vec2(output.center + position.x * (position.y < 0.0 ? v1 : v2) / viewport);
    output.Position = vec4(output.cPos, pos2d.z / pos2d.w, 1);
    return output;
}


@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
  vec2 d = (vCenter - 2.0 * (gl_FragCoord.xy/viewport - vec2(0.5, 0.5))) * viewport * 0.5;
	var power: f32 = -0.5 * (
    input.conic.x * d.x * d.x + 
    input.conic.z * d.y * d.y
  ) - input.conic.y * d.x * d.y;
	if (power > 0.0) discard;
	var alpha: f32 = min(0.99, input.color.a * exp(power));
	if(alpha < 0.02) discard;

	return vec4<f32>(alpha * input.color.rgb, alpha);
}