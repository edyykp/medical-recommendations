import { useState, useEffect } from "react";
import "./App.css";
import { type UserProfile, type Recommendation } from "./types";

function App() {
  const [patients, setPatients] = useState<UserProfile[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<UserProfile | null>(
    null
  );
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  // Fetch patients list
  useEffect(() => {
    fetch("http://localhost:8000/patients")
      .then((res) => res.json())
      .then((data) => {
        setPatients(data);
        if (data.length > 0) setSelectedPatient(data[0]);
      })
      .catch((err) => console.error("Error loading patients:", err));
  }, []);

  // Fetch recommendations for selected patient
  useEffect(() => {
    if (!selectedPatient) return;
    fetch(`http://localhost:8000/recommendations/${selectedPatient.patient_id}`)
      .then((res) => res.json())
      .then((data) => setRecommendations(data.map((rec: any) => (
          {
            doctor: rec.doctor_name,
            specialty: rec.specialty,
            price: `${rec.price} RON`,
            duration: `${rec.duration} minutes`,
          }
      )))
    )
      .catch((err) => console.error("Error loading recommendations:", err));
  }, [selectedPatient]);

  // Fields to exclude from conditions
  const excludedFields = [
    "patient_id",
    "sex",
    "activity_level",
    "BMI",
    "blood_pressure",
    "age",
  ];

  const conditionFields = selectedPatient
    ? Object.entries(selectedPatient).filter(
        ([key]) => !excludedFields.includes(key)
      )
    : [];

  return (
    <div className="app-container">
      <h2>Medical Appointment Recommender</h2>

      {/* Patient Selector */}
      <div className="patient-selector">
        <label>Select Patient:</label>
        <select
          value={selectedPatient?.patient_id || ""}
          onChange={(e) => {
            const patient = patients.find(
              (p) => p.patient_id === Number(e.target.value)
            );
            setSelectedPatient(patient || null);
          }}
        >
          {patients.map((p) => (
            <option key={p.patient_id} value={p.patient_id}>
              Patient {p.patient_id} — Age {p.age}, {p.sex}
            </option>
          ))}
        </select>
      </div>

      {/* Two-column layout */}
      <div className="columns-container">
        {/* Left column: patient summary */}
        {selectedPatient && (
          <div className="left-column">
            <h3>Patient Summary</h3>
            <p>
              <strong>Age:</strong> {selectedPatient.age} |{" "}
              <strong>Sex:</strong> {selectedPatient.sex} |{" "}
              <strong>Activity level:</strong> {selectedPatient.activity_level}{" "}
              | <strong>BMI:</strong> {selectedPatient.BMI}
            </p>
            <div className="conditions-grid">
              {conditionFields.map(([key, value]) => (
                <div key={key} className="condition-item">
                  <strong>{key.replace(/_/g, " ")}:</strong>{" "}
                  <span>
                    {typeof value === "boolean"
                      ? value
                        ? "Yes"
                        : "No"
                      : value?.toString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Right column: recommendations */}
        <div className="right-column">
          <h3>Recommended Appointments</h3>
          {recommendations.length > 0 ? (
            <div className="recommendations-grid">
              {recommendations.map((rec, index) => {
                return (
                  <div key={index} className="card">
                    {Object.entries(rec).map(([key, value]) => (
                      <p key={key}>
                        <strong>{key.replace(/_/g, " ")}:</strong>{" "}
                        <span>
                         {value}
                        </span>
                      </p>
                    ))}
                  </div>
                );
              })}
            </div>
          ) : (
            <p>No recommendations yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
