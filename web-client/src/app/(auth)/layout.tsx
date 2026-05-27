import { Suspense } from 'react';

import styles from './auth.module.scss';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense>
      <div className={styles.authLayout}>{children}</div>
    </Suspense>
  );
}
