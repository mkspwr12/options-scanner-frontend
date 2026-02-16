'use client';

import React, { useState, useCallback, useMemo } from 'react';
import type { ProviderConfig } from '../../types/data-provider';
import { createDefaultHealth } from '../../types/data-provider';
import { ProviderProvider, useProviderContext } from './ProviderContext';
import ProviderCard from './ProviderCard';
import ProviderFormModal from './ProviderFormModal';
import FailoverBanner from './FailoverBanner';
import styles from '../../styles/providers.module.css';

// ─── Inner Component (consumes context) ─────────────────────────────────────

function ProviderSettingsInner() {
  const {
    providers,
    healthMap,
    activeProviderId,
    isFailoverActive,
    addProvider,
    removeProvider,
    updateProvider,
    setActiveProvider,
    testConnection,
    reorderProviders,
    resetFailover,
  } = useProviderContext();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ProviderConfig | undefined>(undefined);

  // Sort by priority for display
  const sorted = useMemo(
    () => [...providers].sort((a, b) => a.priority - b.priority),
    [providers],
  );

  // Failover names
  const activeProvider = providers.find((p) => p.id === activeProviderId);
  const primaryProvider = [...providers]
    .filter((p) => p.enabled)
    .sort((a, b) => a.priority - b.priority)[0];

  const handleAdd = useCallback(() => {
    setEditingConfig(undefined);
    setIsModalOpen(true);
  }, []);

  const handleEdit = useCallback((config: ProviderConfig) => {
    setEditingConfig(config);
    setIsModalOpen(true);
  }, []);

  const handleSave = useCallback(
    (config: ProviderConfig) => {
      if (editingConfig) {
        updateProvider(config.id, config);
      } else {
        addProvider(config);
      }
    },
    [editingConfig, updateProvider, addProvider],
  );

  const handleToggle = useCallback(
    (id: string, enabled: boolean) => {
      updateProvider(id, { enabled });
    },
    [updateProvider],
  );

  const handleMoveUp = useCallback(
    (id: string) => {
      const idx = sorted.findIndex((p) => p.id === id);
      if (idx <= 0) return;
      const reordered = [...sorted];
      // Swap priorities
      const temp = reordered[idx].priority;
      reordered[idx] = { ...reordered[idx], priority: reordered[idx - 1].priority };
      reordered[idx - 1] = { ...reordered[idx - 1], priority: temp };
      reorderProviders(reordered);
    },
    [sorted, reorderProviders],
  );

  const handleMoveDown = useCallback(
    (id: string) => {
      const idx = sorted.findIndex((p) => p.id === id);
      if (idx < 0 || idx >= sorted.length - 1) return;
      const reordered = [...sorted];
      const temp = reordered[idx].priority;
      reordered[idx] = { ...reordered[idx], priority: reordered[idx + 1].priority };
      reordered[idx + 1] = { ...reordered[idx + 1], priority: temp };
      reorderProviders(reordered);
    },
    [sorted, reorderProviders],
  );

  return (
    <section className={styles.section}>
      {/* Header */}
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Data Providers</h2>
        <button className={styles.addButton} onClick={handleAdd}>
          + Add Provider
        </button>
      </div>

      {/* Failover Banner */}
      <FailoverBanner
        isActive={isFailoverActive}
        fromName={primaryProvider?.name}
        toName={activeProvider?.name}
        onReset={resetFailover}
      />

      {/* Provider Cards */}
      <div className={styles.cardList}>
        {sorted.map((cfg) => (
          <ProviderCard
            key={cfg.id}
            config={cfg}
            health={healthMap[cfg.id] ?? createDefaultHealth(cfg.id)}
            isActive={cfg.id === activeProviderId}
            isOnly={providers.length <= 1}
            onToggle={handleToggle}
            onEdit={handleEdit}
            onRemove={removeProvider}
            onTest={testConnection}
            onSetActive={setActiveProvider}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
          />
        ))}
      </div>

      {/* Modal */}
      <ProviderFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        initialConfig={editingConfig}
      />
    </section>
  );
}

// ─── Outer Wrapper (provides context) ───────────────────────────────────────

export default function ProviderSettingsSection() {
  return (
    <ProviderProvider>
      <ProviderSettingsInner />
    </ProviderProvider>
  );
}
