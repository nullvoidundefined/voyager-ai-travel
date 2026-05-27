import styles from './CostCounter.module.scss';

interface CostCounterProps {
  totalTokens: number;
  totalCostUsd: string;
}

export function CostCounter({ totalTokens, totalCostUsd }: CostCounterProps) {
  return (
    <div className={styles.counter} aria-label='API usage for this trip'>
      <span className={styles.stat}>{totalTokens.toLocaleString()} tokens</span>
      <span className={styles.separator} aria-hidden='true'>
        |
      </span>
      <span className={styles.stat}>${totalCostUsd}</span>
    </div>
  );
}
