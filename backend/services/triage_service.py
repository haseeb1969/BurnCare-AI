import math
from typing import List, Any

def calculate_benefit(mortality_risk: float) -> float:
    """
    Calculates a 'Benefit Score' representing the 'Delta Survival'.
    Heuristic: P(Survive|Ward) = P(Survive|ICU)^3.
    """
    p_survive_icu = 1.0 - (mortality_risk / 100.0)
    
    # Model: Ward reduces survival probability non-linearly.
    p_survive_ward = math.pow(p_survive_icu, 3)
    
    # Benefit = Gain in Survival Probability
    benefit = p_survive_icu - p_survive_ward
    
    return max(0.0, benefit * 100.0)

def run_allocation(patients: List[Any], total_beds: int, apply_changes: bool = True) -> List[Any]:
    """
    Runs the allocation algorithm on a list of patient models.
    Calculates benefit scores and returns allocation entries.
    If `apply_changes` is True, updates the `location` on patient models in place.
    """
    active_patients = [p for p in patients if p.status == "Active"]
    
    entries = []
    for p in active_patients:
        # Use current risk if available, else baseline
        risk = p.currentMortalityRisk if p.currentMortalityRisk is not None else (p.mortalityRiskPercent or 0.0)
        benefit = calculate_benefit(risk)
        p.benefit_score = benefit
        
        entries.append({
            "patient": p,
            "benefit_score": benefit,
            "override": p.triage_override,
            "allocation": "Ward"
        })
        
    # 1. Separate into Overrides and Pool
    needed_icu = [e for e in entries if e["override"] == "ForceICU"]
    forcing_ward = [e for e in entries if e["override"] == "ForceWard"]
    pool = [e for e in entries if e["override"] is None or e["override"] == ""]
    
    # 2. Assign Forces
    for e in needed_icu:
        e["allocation"] = "ICU"
    for e in forcing_ward:
        e["allocation"] = "Ward"
        
    # 3. Calculate Remaining Beds
    beds_left = total_beds - len(needed_icu)
    
    # 4. Greedy Allocation for Pool
    pool.sort(key=lambda x: x["benefit_score"], reverse=True)
    
    for e in pool:
        if beds_left > 0:
            e["allocation"] = "ICU"
            beds_left -= 1
        else:
            e["allocation"] = "Ward"
            
    # 5. Update patient models (only if requested)
    for e in entries:
        if apply_changes:
            e["patient"].location = e["allocation"]
        else:
            # annotate recommended allocation without applying
            try:
                e["patient"].recommended_allocation = e["allocation"]
            except Exception:
                pass

    return entries
