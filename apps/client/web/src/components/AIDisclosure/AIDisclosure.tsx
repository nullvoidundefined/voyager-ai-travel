import styles from './AIDisclosure.module.scss';

export function AIDisclosure() {
  return (
    <p role='note' className={styles.disclosure}>
      You are chatting with an AI agent. Verify flight prices and booking
      details before purchasing.
    </p>
  );
}
