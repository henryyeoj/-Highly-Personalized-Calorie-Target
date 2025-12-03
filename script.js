// --- SIMPLE ADJUSTMENT FACTORS ---

// Multipliers for Daily Burn (Resting Burn + Activity)
const ACTIVITY_FACTORS = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725
};

// Target Calorie Adjustments based on Goal (Net Kcal)
const GOAL_DEFICITS = {
    maintenance: 0,
    moderate_loss: 500,
    aggressive_loss: 750,
    moderate_gain: -250 // Negative value means surplus
};

// Calorie adjustments for difficult lifestyle factors (positive value = increase target/reduce deficit)
const LIFESTYLE_ADJUSTMENTS = {
    // Linear (Direct Kcal adjust to final target)
    sleep: { less_than_six: 100, six_to_seven: 50, optimal: 0 },
    stress: { low: 0, moderate: 75, high: 150 }, 
    medical: { 
        none_apply: 0,
        hypothyroid: 150, 
        pcos: 100, 
        insulin_resistance: 80, 
        appetite_meds: 120 
    },
    // Water factor (Low water increases false hunger -> harder to maintain deficit)
    water: { low: 75, adequate: 25, ideal: 0 }, 
    
    // Multiplier (Applied to TDEE, simulates TEF change)
    foodQuality: { high_protein: 1.03, balanced: 1.0, high_processed: 0.97 }
};

// --- CORE CALCULATIONS ---

/**
 * Calculates Resting Burn (BMR) using the Mifflin-St Jeor formula (metric) 
 * and formats the output string.
 */
function calculateRestingBurn() {
    const gender = document.getElementById('gender').value;
    const age = parseFloat(document.getElementById('age').value);
    const weight = parseFloat(document.getElementById('weight').value);
    const height = parseFloat(document.getElementById('height').value);
    const bmrOutput = document.getElementById('restingBurnOutput');

    if (isNaN(age) || isNaN(weight) || isNaN(height) || weight <= 0 || height <= 0 || age < 15) {
        bmrOutput.innerHTML = 'Enter metrics above to calculate BMR.';
        return 0;
    }

    // Mifflin-St Jeor Formula: 10 * W + 6.25 * H - 5 * A + S
    let restingBurn = (10 * weight) + (6.25 * height) - (5 * age);
    restingBurn += (gender === 'male' ? 5 : -161);
    
    const roundedBurn = Math.round(restingBurn);
    
    // Formatting BMR output: BMR = 1,605 Calories/day
    bmrOutput.innerHTML = `<strong>BMR = ${roundedBurn.toLocaleString()} Calories/day</strong>`;
    
    return roundedBurn;
}

/**
 * Calculates Total Daily Burn (TDEE) based on Resting Burn, activity, and food quality.
 */
function calculateTotalDailyBurn(restingBurn) {
    const activityLevel = document.getElementById('activityLevel').value;
    const activityMultiplier = ACTIVITY_FACTORS[activityLevel] || 1.2;
    const foodQualityKey = document.getElementById('foodQuality').value;
    const foodMultiplier = LIFESTYLE_ADJUSTMENTS.foodQuality[foodQualityKey] || 1.0;
    
    // TDEE = (Resting Burn * Activity Multiplier) * Food Quality Multiplier
    return Math.round(restingBurn * activityMultiplier * foodMultiplier);
}

/**
 * Calculates the total linear lifestyle adjustment in calories.
 */
function calculateLifestyleAdjustments() {
    let totalAdjustmentKcal = 0;
    
    // 1. Sleep, Stress, Water
    totalAdjustmentKcal += LIFESTYLE_ADJUSTMENTS.sleep[document.getElementById('sleepQuality').value] || 0;
    totalAdjustmentKcal += LIFESTYLE_ADJUSTMENTS.stress[document.getElementById('stressLevel').value] || 0;
    totalAdjustmentKcal += LIFESTYLE_ADJUSTMENTS.water[document.getElementById('waterIntake').value] || 0;

    // 2. Medical Conditions (Summed, ignoring "none_apply")
    const medicalSelect = document.getElementById('medicalConditions');
    let medicalAdj = 0;
    
    Array.from(medicalSelect.options).filter(option => option.selected && option.value !== 'none_apply').forEach(option => {
        medicalAdj += LIFESTYLE_ADJUSTMENTS.medical[option.value] || 0;
    });
    
    totalAdjustmentKcal += medicalAdj;

    return totalAdjustmentKcal;
}

/**
 * Main function to calculate the calorie target and display the results.
 */
function calculateDeficit() {
    const restingBurn = calculateRestingBurn(); 
    
    // --- Validation ---
    if (restingBurn === 0) {
        alert('Please enter your Age, Weight, and Height.');
        return;
    }

    const targetGoal = document.getElementById('targetGoal').value;
    const goalDeficit = GOAL_DEFICITS[targetGoal];
    
    // --- Step 1: Calculate Total Daily Burn (TDEE) ---
    const totalDailyBurn = calculateTotalDailyBurn(restingBurn);
    
    // --- Step 2: Calculate Base Target (TDEE - Goal) ---
    const baseTargetCalories = totalDailyBurn - goalDeficit;
    
    // --- Step 3: Apply Linear Lifestyle Adjustments (Sleep, Stress, Medical, Water) ---
    const lifestyleAdjustment = calculateLifestyleAdjustments();
    const finalTargetCalories = baseTargetCalories + lifestyleAdjustment;

    // --- Display Results ---
    const tdeeResult = document.getElementById('totalDailyEnergyExpenditure');
    const baseCaloriesResult = document.getElementById('baseCaloriesResult');
    const adjustedCaloriesResult = document.getElementById('adjustedCaloriesResult');
    const adjustmentSummary = document.getElementById('adjustmentSummary');
    const weeksResult = document.getElementById('weeksResult');
    const tipsList = document.getElementById('tipsList');
    const resultDisplay = document.getElementById('resultDisplay');

    tdeeResult.innerHTML = `Your **Total Daily Burn** is about: <strong>${totalDailyBurn.toLocaleString()} kcal</strong>`;
    
    let baseTargetLabel = goalDeficit >= 0 ? `Burn - ${goalDeficit} kcal` : `Burn + ${Math.abs(goalDeficit)} kcal`;
    baseCaloriesResult.innerHTML = `Goal Target (Base: ${baseTargetLabel}): <strong>${Math.round(baseTargetCalories).toLocaleString()} kcal</strong>`;
    
    // Summary of Adjustments
    const sign = lifestyleAdjustment >= 0 ? '+' : '';
    adjustmentSummary.innerHTML = `
        Lifestyle Adjustment: <span style="color: ${lifestyleAdjustment > 0 ? '#e74c3c' : '#2ecc71'}; font-weight: bold;">
        ${sign}${lifestyleAdjustment} kcal/day</span>
    `;

    // Final Result
    adjustedCaloriesResult.innerHTML = `<strong>${Math.round(finalTargetCalories).toLocaleString()} kcal</strong>`;
    
    // Estimated Time Calculation (Using the simplest 500 kcal deficit base)
    const dailyDeficit = totalDailyBurn - finalTargetCalories + lifestyleAdjustment;
    
    if (targetGoal.includes('loss')) {
        const goalWeightLossLbs = 5;
        const totalCalorieDeficitNeeded = goalWeightLossLbs * 3500;
        
        if (dailyDeficit > 0) {
            const daysToGoal = totalCalorieDeficitNeeded / dailyDeficit;
            weeksResult.textContent = `Achieving this target aims for a 5lb loss in approximately ${(daysToGoal / 7).toFixed(1)} weeks.`;
        } else {
            weeksResult.textContent = 'You are currently aiming for maintenance or gain.';
        }
    } else if (targetGoal.includes('gain')) {
        weeksResult.textContent = `Targeting a surplus of ${Math.round(Math.abs(dailyDeficit)).toLocaleString()} kcal/day to support gaining weight.`;
    } else {
        weeksResult.textContent = 'This target aims to keep your weight stable (maintenance).';
    }
    
    // Update Tips
    tipsList.innerHTML = generateTips(lifestyleAdjustment);
    
    resultDisplay.style.display = 'block';
}

/**
 * Generates personalized tips based on the adjustments made.
 */
function generateTips(totalAdjustment) {
    let tips = [];
    
    // Lifestyle Tips based on adjustments
    if (LIFESTYLE_ADJUSTMENTS.sleep[document.getElementById('sleepQuality').value] > 0) {
        tips.push(`**Improve Sleep**: Poor sleep (less than 7 hours) makes you hungrier. Aim for 7-9 hours.`);
    }
    if (LIFESTYLE_ADJUSTMENTS.stress[document.getElementById('stressLevel').value] > 0) {
        tips.push(`**Manage Stress**: High stress can cause your body to hold onto weight. Find time to relax.`);
    }
    if (LIFESTYLE_ADJUSTMENTS.water[document.getElementById('waterIntake').value] > 0) {
        tips.push(`**Drink Water**: Low water intake can cause your body to mistake thirst for hunger. Increase your fluid intake.`);
    }
    if (LIFESTYLE_ADJUSTMENTS.foodQuality[document.getElementById('foodQuality').value] < 1.0) {
        tips.push(`**Eat Better**: Prioritize protein and whole foods to boost the calories your body burns during digestion.`);
    }
    
    // Check if any medical condition was selected and is NOT 'none_apply'
    const medicalSelect = document.getElementById('medicalConditions');
    const hasMedicalAdjustments = Array.from(medicalSelect.options).some(option => option.selected && option.value !== 'none_apply');

    if (hasMedicalAdjustments) {
        tips.push(`**Doctor Check**: Because of your **Medical Conditions**, weight change may be slower. Consult a doctor or dietitian.`);
    }

    if (totalAdjustment === 0) {
        tips.push("**Great Start!** Your lifestyle factors are currently supporting your goal. Keep it up!");
    } else if (totalAdjustment > 0) {
        tips.push(`**Monitor Closely**: Your lifestyle factors added ${totalAdjustment} kcal to your target. Focus on fixing sleep, stress, and water intake.`);
    }
    
    return tips.map(tip => `<li>${tip}</li>`).join('');
}


// --- INITIALIZATION ---
window.onload = function() {
    const bmrInputs = ['gender', 'age', 'weight', 'height'];
    const allInputs = document.querySelectorAll('.container input, .container select');
    
    // Attach event listeners to BMR inputs to automatically calculate Resting Burn
    bmrInputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', calculateRestingBurn);
            element.addEventListener('input', calculateRestingBurn);
        }
    });

    // Attach event listeners to all inputs for full calculation
    allInputs.forEach(input => {
        input.addEventListener('change', () => {
            // Only trigger full calculation if Resting Burn is calculated
            if (calculateRestingBurn() > 0 && document.getElementById('resultDisplay').style.display === 'block') {
                calculateDeficit();
            }
        });
        // Add input listener for number fields (Age, Weight, Height)
        if (input.type === 'number') {
             input.addEventListener('input', () => {
                if (calculateRestingBurn() > 0 && document.getElementById('resultDisplay').style.display === 'block') {
                    calculateDeficit();
                }
            });
        }
    });
};