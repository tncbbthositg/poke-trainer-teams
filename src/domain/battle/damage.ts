export type TrainerBattleDamageInput = {
  movePower: number;
  attackerAttack: number;
  defenderDefense: number;
  attackerIsShadow?: boolean;
  defenderIsShadow?: boolean;
  stab?: number;
  effectiveness?: number;
  attackStage?: number;
  defenseStage?: number;
  chargedAttackQuality?: number;
  otherApplicableModifiers?: number;
  shielded?: boolean;
};

export const TRAINER_BATTLE_DAMAGE_MULTIPLIER = 1.3;
export const SHADOW_ATTACK_MULTIPLIER = 1.2;
export const SHADOW_DEFENSE_MULTIPLIER = 5 / 6;

export function calculateTrainerBattleDamage({
  movePower,
  attackerAttack,
  defenderDefense,
  attackerIsShadow = false,
  defenderIsShadow = false,
  stab = 1,
  effectiveness = 1,
  attackStage = 0,
  defenseStage = 0,
  chargedAttackQuality = 1,
  otherApplicableModifiers = 1,
  shielded = false,
}: TrainerBattleDamageInput): number {
  if (shielded) {
    return 1;
  }

  const effectiveAttack =
    attackerAttack *
    stageMultiplier(attackStage) *
    (attackerIsShadow ? SHADOW_ATTACK_MULTIPLIER : 1);
  const effectiveDefense =
    defenderDefense *
    stageMultiplier(defenseStage) *
    (defenderIsShadow ? SHADOW_DEFENSE_MULTIPLIER : 1);

  return Math.max(
    1,
    Math.floor(
      0.5 *
        movePower *
        (effectiveAttack / effectiveDefense) *
        TRAINER_BATTLE_DAMAGE_MULTIPLIER *
        stab *
        effectiveness *
        chargedAttackQuality *
        otherApplicableModifiers,
    ) + 1,
  );
}

export function stageMultiplier(stage: number): number {
  const value = Math.max(-4, Math.min(4, stage));

  return value >= 0 ? (4 + value) / 4 : 4 / (4 - value);
}
