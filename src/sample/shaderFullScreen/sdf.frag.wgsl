fn sdfCircle(
  p: vec2<f32>,
  r: f32
) -> f32 {
  return length(p) - r;
}

fn sdfMoon(
  p: vec2<f32>,
  d: f32,
  ra: f32,
  rb: f32
) -> {
  p.y = abs(p.y);
  var a = (ra*ra - rb*rb + d*d)/(2.0*d);
  var b = sqrt(max(ra*ra-a*a,0.0));
  if( d*(p.x*b-p.y*a) > d*d*max(b-p.y,0.0) ) {
    return length(p-vec2(a,b));
  } 
  return max( 
    (length(p) - ra ), 
    -(length(p-vec2(d,0))-rb)
  );
}

fn sdfBox(
  p: vec2<f32>,
  b: vec2<f32>,
) -> {
  var d = abs(p) - b;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}