import * as tf from '@tensorflow/tfjs';

export const createProbabilityArray = (arr: number[]) => {
  const N = tf.zerosLike([27, 27]);

  const sum = arr.reduce((acc, curr) => {
    return acc + curr;
  });

  const tempProbs = arr.map((val) => {
    return val / sum;
  });

  const probs = tf.tensor1d(tempProbs);

  const s = tf.multinomial(probs, 1, 2147483647);
  console.log(arr);
  console.log(probs);
  s.array().then((array) => {
    const item = array[0];
    console.log(item);
  });
}
