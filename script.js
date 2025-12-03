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
    sleep: { less_than_six: 100, six_to_seven: 50, optimal: 0 },
    stress: { low: 0, moderate: 75, high: 150 }, 
    medical: { 
        none_apply: 0,
        hypothyroid: 150, 
        pcos: 100, 
        insulin_resistance: 80, 
        appetite_meds: 120 
    },
    water: { low: 75, adequate: 25, ideal: 0 }, 
    foodQuality: { high_protein: 1.03, balanced: 1.0, high_processed: 0.97 }
};

// --- HEIGHT CONVERSION UTILITY ---
function getMetricHeight() {
    const unit = document.getElementById('heightUnit').value;
    
    if (unit === 'cm') {
        const cm = parseFloat(document.getElementById('height_cm').value);
        return isNaN(cm) ? 0 : cm;
    } else {
        const ft = parseFloat(document.getElementById('height_ft').value);
        const inches = parseFloat(document.getElementById('height_in').value);

        if (isNaN(ft) || isNaN(inches)) return 0;

        // Convert feet/inches to total inches, then to centimeters
        const totalInches = (ft * 12) + inches;
        const cm = totalInches * 2.54;
        return cm;
    }
}

// --- CORE CALCULATIONS ---

/**
 * Calculates Resting Burn (BMR) using the Mifflin-St Jeor formula (metric) 
 * and formats the output string.
 */
function calculateRestingBurn() {
    const gender = document.getElementById('gender').value;
    const age = parseFloat(document.getElementById('age').value);
    const weight = parseFloat(document.getElementById('weight').value);
    const height_cm = getMetricHeight(); // Get height in CM
    const bmrOutput = document.getElementById('restingBurnOutput');

    if (isNaN(age) || isNaN(weight) || weight <= 0 || age < 15 || height_cm < 100) {
        bmrOutput.innerHTML = 'Enter metrics above to calculate BMR.';
        return 0;
    }

    // Mifflin-St Jeor Formula: 10 * W + 6.25 * H - 5 * A + S
    let restingBurn = (10 * weight) + (6.25 * height_cm) - (5 * age);
    restingBurn += (gender === 'male' ? 5 : -161);
    
    const roundedBurn = Math.round(restingBurn);
    
    // Formatting BMR output
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
        alert('Please enter valid Age, Weight, and Height metrics.');
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
    
    // Check key factors and generate advice
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


// --- INITIALIZATION and UI LOGIC ---

function updateHeightInputs() {
    const unit = document.getElementById('heightUnit').value;
    const metricDiv = document.getElementById('height-metric-input');
    const imperialDiv = document.getElementById('height-imperial-input');
    const label = document.getElementById('heightLabel');

    if (unit === 'cm') {
        metricDiv.style.display = 'block';
        imperialDiv.style.display = 'none';
        label.textContent = 'Height (cm)';
    } else {
        metricDiv.style.display = 'none';
        imperialDiv.style.display = 'block';
        label.textContent = 'Height (ft/in)';
    }

    // Trigger recalculation (if results are showing) when unit is changed
    if (calculateRestingBurn() > 0 && document.getElementById('resultDisplay').style.display === 'block') {
        calculateDeficit();
    }
}

window.onload = function() {
    const bmrInputs = ['gender', 'age', 'weight', 'height_cm', 'height_ft', 'height_in', 'heightUnit'];
    const allInputs = document.querySelectorAll('.container input, .container select');
    
    // Initialize the height input display
    document.getElementById('heightUnit').addEventListener('change', updateHeightInputs);
    updateHeightInputs(); // Run once on load to set initial state

    // Event listeners for BMR and Height changes
    bmrInputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            // Use 'input' for number fields to react instantly
            element.addEventListener('input', calculateRestingBurn);
            element.addEventListener('change', calculateRestingBurn);
        }
    });

    // Attach event listeners to all inputs for full calculation
    allInputs.forEach(input => {
        input.addEventListener('change', () => {
            if (calculateRestingBurn() > 0 && document.getElementById('resultDisplay').style.display === 'block') {
                calculateDeficit();
            }
        });
        // Add input listener for number fields (Age, Weight, Heights)
        if (input.type === 'number') {
             input.addEventListener('input', () => {
                if (calculateRestingBurn() > 0 && document.getElementById('resultDisplay').style.display === 'block') {
                    calculateDeficit();
                }
            });
        }
    });
};