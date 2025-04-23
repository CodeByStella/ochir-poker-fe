export function formatNumber(value: number) {
  if (typeof value !== 'number') return value;
  if (value >= 1000) {
    return (value / 1000).toFixed(0) + 'k';
  }
  return value.toString();
}