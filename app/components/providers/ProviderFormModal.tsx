'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { ProviderConfig, ProviderType } from '../../types/data-provider';
import styles from '../../styles/providers.module.css';

// ─── Props ──────────────────────────────────────────────────────────────────

interface ProviderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: ProviderConfig) => void;
  initialConfig?: ProviderConfig; // undefined = "Add" mode
}

const PROVIDER_TYPES: { value: ProviderType; label: string }[] = [
  { value: 'yahoo', label: 'Yahoo Finance' },
  { value: 'polygon', label: 'Polygon.io' },
  { value: 'tradier', label: 'Tradier' },
  { value: 'custom', label: 'Custom' },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function ProviderFormModal({
  isOpen,
  onClose,
  onSave,
  initialConfig,
}: ProviderFormModalProps) {
  const isEdit = Boolean(initialConfig);
  const nameRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [type, setType] = useState<ProviderType>('yahoo');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [rateLimitPerMinute, setRateLimitPerMinute] = useState(100);
  const [timeoutMs, setTimeoutMs] = useState(10_000);
  const [error, setError] = useState<string | null>(null);

  // Reset form when opened
  useEffect(() => {
    if (!isOpen) return;
    if (initialConfig) {
      setName(initialConfig.name);
      setType(initialConfig.type);
      setApiKey(initialConfig.apiKey ?? '');
      setBaseUrl(initialConfig.baseUrl ?? '');
      setRateLimitPerMinute(initialConfig.rateLimitPerMinute);
      setTimeoutMs(initialConfig.timeoutMs);
    } else {
      setName('');
      setType('yahoo');
      setApiKey('');
      setBaseUrl('');
      setRateLimitPerMinute(100);
      setTimeoutMs(10_000);
    }
    setError(null);
    // Focus name input
    requestAnimationFrame(() => nameRef.current?.focus());
  }, [isOpen, initialConfig]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      const trimmedName = name.trim();
      if (!trimmedName) {
        setError('Provider name is required.');
        return;
      }
      if (trimmedName.length > 50) {
        setError('Name must be 50 characters or less.');
        return;
      }
      if (rateLimitPerMinute < 1) {
        setError('Rate limit must be at least 1.');
        return;
      }
      if (timeoutMs < 1000) {
        setError('Timeout must be at least 1000ms.');
        return;
      }

      const config: ProviderConfig = {
        id: initialConfig?.id ?? `${type}-${Date.now()}`,
        type,
        name: trimmedName,
        apiKey: apiKey.trim() || undefined,
        baseUrl: baseUrl.trim() || undefined,
        enabled: initialConfig?.enabled ?? true,
        priority: initialConfig?.priority ?? 99,
        rateLimitPerMinute,
        timeoutMs,
      };

      onSave(config);
      onClose();
    },
    [name, type, apiKey, baseUrl, rateLimitPerMinute, timeoutMs, initialConfig, onSave, onClose],
  );

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.modalTitle}>
          {isEdit ? 'Edit Provider' : 'Add Provider'}
        </h3>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Name */}
          <label className={styles.formField}>
            <span className={styles.formLabel}>Name</span>
            <input
              ref={nameRef}
              className={styles.formInput}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Provider"
              maxLength={50}
            />
          </label>

          {/* Type */}
          <label className={styles.formField}>
            <span className={styles.formLabel}>Type</span>
            <select
              className={styles.formInput}
              value={type}
              onChange={(e) => setType(e.target.value as ProviderType)}
              disabled={isEdit}
            >
              {PROVIDER_TYPES.map((pt) => (
                <option key={pt.value} value={pt.value}>
                  {pt.label}
                </option>
              ))}
            </select>
          </label>

          {/* API Key */}
          <label className={styles.formField}>
            <span className={styles.formLabel}>API Key (optional)</span>
            <input
              className={styles.formInput}
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="••••••••"
              autoComplete="off"
            />
          </label>

          {/* Base URL */}
          <label className={styles.formField}>
            <span className={styles.formLabel}>Base URL (optional)</span>
            <input
              className={styles.formInput}
              type="url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.example.com"
            />
          </label>

          {/* Rate Limit */}
          <label className={styles.formField}>
            <span className={styles.formLabel}>Rate Limit (req/min)</span>
            <input
              className={styles.formInput}
              type="number"
              min={1}
              max={10000}
              value={rateLimitPerMinute}
              onChange={(e) => setRateLimitPerMinute(Number(e.target.value))}
            />
          </label>

          {/* Timeout */}
          <label className={styles.formField}>
            <span className={styles.formLabel}>Timeout (ms)</span>
            <input
              className={styles.formInput}
              type="number"
              min={1000}
              max={120000}
              step={1000}
              value={timeoutMs}
              onChange={(e) => setTimeoutMs(Number(e.target.value))}
            />
          </label>

          {/* Error */}
          {error && <p className={styles.formError}>{error}</p>}

          {/* Buttons */}
          <div className={styles.formButtons}>
            <button type="button" className={styles.cancelButton} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={styles.saveButton}>
              {isEdit ? 'Save Changes' : 'Add Provider'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
