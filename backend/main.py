from fastapi import FastAPI
import pandas as pd
import re
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load CSVs
patients_df = pd.read_csv("patients.csv")
appointments_df = pd.read_csv("appointments.csv")

patients = patients_df.to_dict(orient="records")
appointments = appointments_df.dropna(subset=["appointment_id"]).to_dict(orient="records")


# --- Helper functions ---
def is_chronic_condition(col):
    chronic_keywords = [
        "diabetes", "heart_disease", "hypertension", "cancer", "kidney_disease",
        "liver_disease", "arthritis", "osteoporosis", "thyroid_disorder", "joint_pain",
        "hormonal_imbalance", "lung_disease", "headaches", "asthma", "epilepsy",
        "vitamins_deficit"
    ]
    return any(k in col.lower() for k in chronic_keywords)


def is_lifestyle_factor(col):
    lifestyle_keywords = [
        "smoker", "alcohol_consumption", "stress_level", "obesity",
        "previous_fractures"
    ]
    return any(k in col.lower() for k in lifestyle_keywords)


def get_field_value(value):
    """
    Convert field value to numeric score:
    - 0 -> 0.0a
    - 1 -> 0.5 (mild/present)
    - 2 -> 1.0 (severe/strongly present)
    - "true", "yes" -> 1.0
    - "false", "none" -> 0.0
    - other -> 0.0
    """
    val_str = str(value).lower().strip()
    
    # Handle numeric values
    try:
        num_val = int(float(val_str))
        if num_val == 0:
            return 0.0
        elif num_val == 1:
            return 0.5
        elif num_val == 2:
            return 1.0
        else:
            return 0.0
    except (ValueError, TypeError):
        pass
    
    # Handle boolean/string values
    if val_str in ["true", "yes"]:
        return 1.0
    elif val_str in ["false", "none", ""]:
        return 0.0
    
    return 0.0


def has_condition(value):
    """
    Check if a field indicates a condition is present (non-zero).
    Returns True for 1, 2, "true", "yes", False for 0, "false", "none".
    """
    val_str = str(value).lower().strip()
    
    try:
        num_val = int(float(val_str))
        return num_val > 0
    except (ValueError, TypeError):
        return val_str in ["true", "yes"]


def compute_score(patient, appointment):
    """
    Comprehensive weighted scoring considering:
    - base_score from appointment
    - age factor
    - chronic conditions
    - lifestyle factors
    - BMI
    - blood pressure
    """
    score = float(appointment.get("base_score", 0.5))

    # Recommended conditions from appointment
    recommended_raw = str(appointment.get("recommended_for", "")).replace(",", " ")
    recommended_set = set(re.findall(r"\w+", recommended_raw.lower()))

    # Age factor: older patients get slightly higher weight for preventive care
    age_factor = min(patient.get("age", 0) / 100, 1.0)

    # Chronic condition factor - weighted by severity (0=0, 1=0.5, 2=1.0)
    # Sum all matching condition scores and normalize by max possible (all conditions = 2)
    chronic_cols = [c for c in patient.keys() if is_chronic_condition(c)]
    matching_chronic = [c for c in chronic_cols if c.lower() in recommended_set]
    chronic_score = sum(
        get_field_value(patient[c]) for c in matching_chronic
    )
    # Normalize: divide by max possible score (all matching conditions with value 2)
    max_chronic_score = len(matching_chronic) * 1.0 if matching_chronic else 1.0
    chronic_ratio = min(chronic_score / max_chronic_score, 1.0) if max_chronic_score > 0 else 0.0

    # Lifestyle factor - weighted by severity (0=0, 1=0.5, 2=1.0)
    # Sum all matching condition scores and normalize by max possible (all conditions = 2)
    lifestyle_cols = [c for c in patient.keys() if is_lifestyle_factor(c)]
    matching_lifestyle = [c for c in lifestyle_cols if c.lower() in recommended_set]
    lifestyle_score = sum(
        get_field_value(patient[c]) for c in matching_lifestyle
    )
    # Normalize: divide by max possible score (all matching conditions with value 2)
    max_lifestyle_score = len(matching_lifestyle) * 1.0 if matching_lifestyle else 1.0
    lifestyle_ratio = min(lifestyle_score / max_lifestyle_score, 1.0) if max_lifestyle_score > 0 else 0.0

    # BMI factor: higher BMI increases relevance for certain appointments
    bmi = float(patient.get("BMI", 25))
    bmi_factor = min(max((bmi - 22) / 10, 0), 1)  # normalize roughly between 0–1

    # Blood pressure factor
    # Medical thresholds: Normal: <120, Elevated: 120-129, High Stage 1: 130-139, High Stage 2: >=140
    bp = float(patient.get("blood_pressure", 120))
    if bp >= 140:
        bp_factor = 1.0  # High Stage 2 - maximum urgency
    elif bp >= 130:
        bp_factor = 0.7 + (bp - 130) / 10 * 0.3  # High Stage 1: 0.7 to 1.0
    elif bp >= 120:
        bp_factor = (bp - 120) / 10 * 0.7  # Elevated: 0.0 to 0.7
    else:
        bp_factor = 0.0  # Normal - no factor

    # Activity level factor (lower activity increases certain appointment relevance)
    activity = int(patient.get("activity_level", 3))  # assuming scale 1-5
    activity_factor = (6 - activity) / 5  # higher if activity is low

    # Cholesterol factor: higher cholesterol increases relevance for all appointments
    # Medical thresholds: Normal: <200, Borderline High: 200-239, High: >=240
    cholesterol = float(patient.get("cholesterol", 200))
    if cholesterol >= 240:
        cholesterol_factor = 1.0  # High - maximum urgency
    elif cholesterol >= 200:
        cholesterol_factor = 0.5 + (cholesterol - 200) / 40 * 0.5  # Borderline: 0.5 to 1.0
    else:
        cholesterol_factor = 0.0  # Normal - no factor

    # Sex factor: check if appointment is gender-specific and matches patient sex
    # This is a binary factor (0 or 1) for gender-specific conditions
    sex = str(patient.get("sex", "")).upper()
    sex_factor = 0.0
    if "cancer" in recommended_set and sex == "F":
        # Breast cancer screening is more relevant for females
        if "breast" in recommended_raw.lower():
            sex_factor = 1.0

    # Weighted scoring
    score += float(appointment.get("weight_age", 0.2)) * age_factor
    score += float(appointment.get("weight_chronic", 0.3)) * chronic_ratio
    score += float(appointment.get("weight_lifestyle", 0.3)) * lifestyle_ratio
    score += 0.05 * bmi_factor
    score += 0.05 * bp_factor
    score += 0.05 * activity_factor
    score += 0.05 * cholesterol_factor
    score += 0.03 * sex_factor  # Smaller weight for gender-specific factors

    return score


@app.get("/patients")
def get_patients():
    return patients


@app.get("/recommendations/{patient_id}")
def get_recommendations(patient_id: int):
    patient = next((p for p in patients if str(p["patient_id"]) == str(patient_id)), None)
    if not patient:
        return []

    # Detect cold start (no major data)
    has_data = any(
        has_condition(patient[c])
        for c in patient.keys() if is_chronic_condition(c) or is_lifestyle_factor(c)
    )
    if not has_data:
        cold_start_recs = [a for a in appointments if "cold_start" in str(a["recommended_for"]).lower()]
        return [
             {
            "appointment_id": a["appointment_id"],
            "doctor_name": a["doctor_name"],
            "specialty": a["specialty"],
            "clinic": a["clinic"],
            "duration": a["duration_minutes"],
            "price": a["price"],
            "score": 0.0,
            "recommended_for": a.get("recommended_for", ""),
            }
            for a in cold_start_recs[:5]
        ]

    # Compute score for all appointments
    scored = [(a, compute_score(patient, a)) for a in appointments]
    
    final = []
    used_specialties = set()

    for a, s in sorted(scored, key=lambda x: x[1], reverse=True):
        if a["specialty"] not in used_specialties:
            final.append((a, s))
            used_specialties.add(a["specialty"])
        if len(final) == 5:
            break

    # Return all relevant appointment fields
    return [
        {
            "appointment_id": a["appointment_id"],
            "doctor_name": a["doctor_name"],
            "specialty": a["specialty"],
            "clinic": a["clinic"],
            "duration": a["duration_minutes"],
            "price": a["price"],
            "score": round(s, 3),
            "recommended_for": a.get("recommended_for", ""),
        }
        for a, s in final
    ]
