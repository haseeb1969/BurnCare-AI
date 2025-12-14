import { PatientRecord, TriageEntry, ManualOverride, AllocationStatus } from '../types';

export const triageService = {
    /**
     * Calculates a "Benefit Score" representing the "Delta Survival" (Survival Benefit of ICU vs Ward).
     * Heuristic: P(Survive|Ward) = P(Survive|ICU)^2.
     * This creates a bell curve that prioritizes "Salvageable" (Mid-risk) patients
     * over "Too Healthy" (Low Benefit) and "Futile" (Low Survival anyway).
     */
    calculateBenefit: (mortalityRisk: number): number => {
        // Mortality is 0-100.
        const pSurviveICU = 1 - (mortalityRisk / 100);

        // Model: Ward reduces survival probability non-linearly.
        // Sicker patients drop faster.
        const pSurviveWard = Math.pow(pSurviveICU, 3); // Using ^3 to accentuate the need for ICU in mid-high risk.

        // Benefit = Gain in Survival Probability
        const benefit = pSurviveICU - pSurviveWard;

        return Math.max(0, benefit * 100);
    },

    runAllocation: (
        patients: PatientRecord[],
        totalBeds: number,
        overrides: Record<string, ManualOverride>
    ): TriageEntry[] => {

        // 1. Map to Triage Entries
        let entries: TriageEntry[] = patients
            .filter(p => p.status === 'Active') // Only triage active patients
            .map(p => {
                // Priority: Live > Baseline
                const isLive = typeof p.currentMortalityRisk === 'number';
                const risk = isLive ? (p.currentMortalityRisk as number) : (p.mortalityRiskPercent ?? 0);

                const benefit = triageService.calculateBenefit(risk);
                return {
                    patientId: p.id,
                    patientName: p.name,
                    mortalityRisk: risk,
                    survivalProb: 100 - risk,
                    benefitScore: benefit,
                    allocation: 'Ward' as AllocationStatus, // Default
                    override: overrides[p.id] || null,
                    status: p.status,
                    riskSource: isLive ? 'Live' : 'Baseline'
                };
            });

        // 2. Separate into Overrides and Pool
        const neededICU = entries.filter(e => e.override === 'ForceICU');
        const forcingWard = entries.filter(e => e.override === 'ForceWard');
        const pool = entries.filter(e => e.override === null);

        // 3. Assign Forces
        neededICU.forEach(e => e.allocation = 'ICU');
        forcingWard.forEach(e => e.allocation = 'Ward');

        // 4. Calculate Remaining Beds
        let bedsLeft = totalBeds - neededICU.length;

        // 5. Greedy Allocation for Pool based on Benefit Score
        // Sort by Benefit Descending
        pool.sort((a, b) => b.benefitScore - a.benefitScore);

        pool.forEach(e => {
            if (bedsLeft > 0) {
                e.allocation = 'ICU';
                bedsLeft--;
            } else {
                e.allocation = 'Ward';
            }
        });

        // 6. Combine and Result
        // (We modified objects in place, but let's re-merge to be safe/clean list)
        return [...neededICU, ...forcingWard, ...pool].sort((a, b) => b.benefitScore - a.benefitScore);
    }
};
