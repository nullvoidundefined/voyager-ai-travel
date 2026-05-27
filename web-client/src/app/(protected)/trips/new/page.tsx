'use client';

import { useEffect, useRef, useState } from 'react';

import { post } from '@/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import styles from './newTrip.module.scss';

interface Trip {
  id: string;
}

export default function NewTripPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const creating = useRef(false);

  useEffect(() => {
    if (creating.current) {
      return;
    }
    creating.current = true;
    let aborted = false;

    post<{ trip: Trip }>('/trips', { destination: 'New trip' })
      .then(({ trip }) => {
        if (!aborted) {
          router.replace(`/trips/${trip.id}`);
        }
      })
      .catch(() => {
        if (!aborted) {
          setError('Failed to start a new trip. Please try again.');
          creating.current = false;
        }
      });

    return () => {
      aborted = true;
    };
  }, [router]);

  if (error) {
    return (
      <div className={styles.page}>
        <Link href='/trips' className={styles.back}>
          &larr; Back to trips
        </Link>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.spinnerWrap}>
        <div className={styles.spinner} />
        <p>Setting up your trip...</p>
      </div>
    </div>
  );
}
