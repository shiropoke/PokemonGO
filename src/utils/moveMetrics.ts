export function calculateDps(power: number, durationMs: number): number | null {
  if (!Number.isFinite(power) || !Number.isFinite(durationMs) || durationMs <= 0) {
    return null;
  }
  return power / (durationMs / 1000);
}

export function calculateEps(energyDelta: number, durationMs: number): number | null {
  if (!Number.isFinite(energyDelta) || !Number.isFinite(durationMs) || durationMs <= 0) {
    return null;
  }
  return energyDelta / (durationMs / 1000);
}

export function gameMasterDurationToTurns(durationTurns: number): number | null {
  if (!Number.isInteger(durationTurns) || durationTurns < 0) return null;
  return durationTurns + 1;
}

export function calculatePerTurn(value: number, turns: number): number | null {
  if (!Number.isFinite(value) || !Number.isFinite(turns) || turns <= 0) return null;
  return value / turns;
}

export function calculateDpe(power: number, energyDelta: number): number | null {
  if (!Number.isFinite(power) || !Number.isFinite(energyDelta) || energyDelta === 0) {
    return null;
  }
  return power / Math.abs(energyDelta);
}
