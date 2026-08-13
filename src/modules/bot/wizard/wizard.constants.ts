export const WIZARD_TTL_MS = 30 * 60 * 1000;
/** Minutes-remaining checkpoints that each fire exactly one proactive warning (US08). */
export const WIZARD_WARNING_THRESHOLDS_MIN: readonly number[] = [20, 15, 10];
export const WIZARD_SWEEP_INTERVAL_MS = 60 * 1000;
/** Free-text collected_fields values (observações/rendimento/tempo de preparo) have no DTO — cap length here instead. */
export const MAX_COLLECTED_FIELD_LENGTH = 500;
