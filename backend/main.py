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
        "hormone_imbalance", "lung_disease", "headaches", "asthma", "epilepsy"
    ]
    return any(k in col.lower() for k in chronic_keywords)


def is_lifestyle_factor(col):
    lifestyle_keywords = [
        "smoker", "alcohol_consumption", "activity_level", "stress_level", "obesity",
        "previous_fractures"
    ]
    return any(k in col.lower() for k in lifestyle_keywords)


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

    # Chronic condition factor
    chronic_cols = [c for c in patient.keys() if is_chronic_condition(c)]
    chronic_matches = sum(
        1 for c in chronic_cols if str(patient[c]).lower() in ["1", "2", "true", "yes"] and c.lower() in recommended_set
    )
    chronic_ratio = min(chronic_matches, 1)

    # Lifestyle factor
    lifestyle_cols = [c for c in patient.keys() if is_lifestyle_factor(c)]
    lifestyle_matches = sum(
        1 for c in lifestyle_cols if str(patient[c]).lower() in ["1", "2", "true", "yes"] and c.lower() in recommended_set
    )
    lifestyle_ratio = min(lifestyle_matches, 1)

    # BMI factor: higher BMI increases relevance for certain appointments
    bmi = float(patient.get("BMI", 25))
    bmi_factor = min(max((bmi - 22) / 10, 0), 1)  # normalize roughly between 0–1

    # Blood pressure factor
    bp = float(patient.get("blood_pressure", 120))
    bp_factor = min(max((bp - 120) / 40, 0), 1)

    # Activity level factor (lower activity increases certain appointment relevance)
    activity = int(patient.get("activity_level", 3))  # assuming scale 1-5
    activity_factor = (6 - activity) / 5  # higher if activity is low

    # Weighted scoring
    score += float(appointment.get("weight_age", 0.2)) * age_factor
    score += float(appointment.get("weight_chronic", 0.3)) * chronic_ratio
    score += float(appointment.get("weight_lifestyle", 0.3)) * lifestyle_ratio
    score += 0.05 * bmi_factor
    score += 0.05 * bp_factor
    score += 0.05 * activity_factor

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
        str(patient[c]).lower() in ["1", "2", "true", "yes"]
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
