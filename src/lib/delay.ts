function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function simulateReadDelay(): Promise<void> {
  const ms = randomBetween(1000, 3000);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function simulateWriteDelay(): Promise<void> {
  const ms = randomBetween(3000, 5000);
  return new Promise((resolve) => setTimeout(resolve, ms));
}
