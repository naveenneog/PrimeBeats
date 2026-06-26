/**
 * Tiny shared flag indicating the car (Android Auto) is the active playback
 * source. Lives outside the stores so `playerStore` and `carStore` can both read
 * it without an import cycle.
 */
export const carSource = { active: false };
