'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import styles from '../../styles/providers.module.css';

// ─── Props ──────────────────────────────────────────────────────────────────

interface ConnectionTestButtonProps {
  providerId: string;
  onTest: (id: string) => Promise<boolean>;
}

type TestState = 'idle' | 'testing' | 'success' | 'failure';

// ─── Component ──────────────────────────────────────────────────────────────

export default function ConnectionTestButton({
  providerId,
  onTest,
}: ConnectionTestButtonProps) {
  const [testState, setTestState] = useState<TestState>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleTest = useCallback(async () => {
    setTestState('testing');
    try {
      const ok = await onTest(providerId);
      setTestState(ok ? 'success' : 'failure');
    } catch {
      setTestState('failure');
    }
    // Auto-reset after 3 seconds
    timerRef.current = setTimeout(() => setTestState('idle'), 3_000);
  }, [providerId, onTest]);

  const label: Record<TestState, string> = {
    idle: 'Test',
    testing: '⏳',
    success: '✅',
    failure: '❌',
  };

  return (
    <button
      className={styles.actionButton}
      onClick={handleTest}
      disabled={testState === 'testing'}
      title="Test connection"
    >
      {label[testState]}
    </button>
  );
}
