'use client';

import { Fragment, type ReactNode } from 'react';

import styles from './SelectableCardGroup.module.scss';

interface SelectableCardGroupProps {
  items: Array<{
    id: string;
    label: string;
    data?: Record<string, unknown>;
    node: (selected: boolean, onClick: () => void) => ReactNode;
  }>;
  onConfirm: (
    selectedLabel: string,
    selectedData: Record<string, unknown>,
  ) => void;
  disabled?: boolean;
  confirmedId?: string | null;
}

export function SelectableCardGroup({
  items,
  onConfirm,
  disabled = false,
  confirmedId,
}: SelectableCardGroupProps) {
  const isConfirmed = confirmedId != null;
  const confirmedLabel = isConfirmed
    ? items.find((i) => i.id === confirmedId)?.label
    : null;

  const handleClick = (id: string) => {
    if (isConfirmed || disabled) return;
    const item = items.find((i) => i.id === id);
    if (item) {
      onConfirm(item.label, item.data ?? {});
    }
  };

  return (
    <div className={styles.group}>
      <div className={styles.scrollContainer}>
        {items.map((item) => (
          <Fragment key={item.id}>
            {item.node(item.id === confirmedId, () => handleClick(item.id))}
          </Fragment>
        ))}
      </div>

      {isConfirmed && confirmedLabel && (
        <span className={styles.confirmed}>&#10003; {confirmedLabel}</span>
      )}
    </div>
  );
}
