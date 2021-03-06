export default function getRandomNumber(
  max: number,
  exceptions: number[] = []
) {
  if (max === exceptions.length) return -1;

  let num = Math.floor(Math.random() * max);

  if (exceptions.length > 0) {
    while (exceptions.includes(num)) {
      num = Math.floor(Math.random() * max);
    }
  }

  return num;
}
