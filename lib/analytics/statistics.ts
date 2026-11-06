export interface DistributionStats {
  count: number;
  mean: number | null;
  median: number | null;
  std: number | null;
  min: number | null;
  max: number | null;
  q25: number | null;
  q75: number | null;
}

export function computeDescriptiveStatistics(numbers: number[]): DistributionStats {
  const clean = numbers.filter((n) => typeof n === "number" && !isNaN(n));
  if (clean.length === 0) {
    return {
      count: 0,
      mean: null,
      median: null,
      std: null,
      min: null,
      max: null,
      q25: null,
      q75: null,
    };
  }

  clean.sort((a, b) => a - b);
  const count = clean.length;
  const sum = clean.reduce((acc, curr) => acc + curr, 0);
  const mean = Math.round((sum / count) * 100) / 100;

  const median =
    count % 2 === 0
      ? (clean[count / 2 - 1] + clean[count / 2]) / 2
      : clean[Math.floor(count / 2)];

  const min = clean[0];
  const max = clean[count - 1];

  // Variance & Standard Deviation
  const variance =
    clean.reduce((acc, curr) => acc + Math.pow(curr - mean, 2), 0) /
    (count > 1 ? count - 1 : 1);
  const std = Math.round(Math.sqrt(variance) * 100) / 100;

  const getPercentile = (p: number) => {
    const idx = (count - 1) * p;
    const lower = Math.floor(idx);
    const fraction = idx - lower;
    if (lower + 1 < count) {
      return clean[lower] + fraction * (clean[lower + 1] - clean[lower]);
    }
    return clean[lower];
  };

  return {
    count,
    mean,
    median: Math.round(median * 100) / 100,
    std,
    min,
    max,
    q25: Math.round(getPercentile(0.25) * 100) / 100,
    q75: Math.round(getPercentile(0.75) * 100) / 100,
  };
}

export const calculateSummaryStats = computeDescriptiveStatistics;

