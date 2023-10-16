export const renderBalls2D = (
  context: CanvasRenderingContext2D,
  ballData: Float32Array,
  radius: number
) => {
  //Saves entire state of canvas
  context.save();
  context.fillRect(0, 0, 5, 5);
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  //4 color, 2 position, 2 velocity
  for (let a = 0; a < ballData.length; a += 8) {
    const color = { r: ballData[0], g: ballData[1], b: ballData[2] };
    const position = { x: ballData[4], y: ballData[5] };
    const velocity = { x: ballData[6], y: ballData[7] };
    let c = Math.atan(
      velocity.x / (velocity.x === 0 ? Number.EPSILON : velocity.x)
    );
    velocity.x < 0 && (c += Math.PI);
    const P = position.x + Math.cos(c) * Math.sqrt(2) * radius;
    const m = position.y + Math.sin(c) * Math.sqrt(2) * radius;
    context.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
    context.beginPath(),
      context.arc(position.x, position.y, radius, 0, 2 * Math.PI, !0),
      context.moveTo(P, m),
      context.arc(
        position.x,
        position.y,
        radius,
        c - Math.PI / 4,
        c + Math.PI / 4,
        !0
      ),
      context.lineTo(P, m),
      context.closePath(),
      context.fill();
  }
  context.restore();
};
