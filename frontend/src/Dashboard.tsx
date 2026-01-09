import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./App.css";
import { type UserProfile, type Recommendation } from "./types";
import { api } from "./api";

function Dashboard() {
    const navigate = useNavigate();
    const location = useLocation();
    const [patients, setPatients] = useState<UserProfile[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<UserProfile | null>(
        null
    );
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [loadingPatients, setLoadingPatients] = useState(true);
    const [loadingRecommendations, setLoadingRecommendations] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<'score' | 'price'>('score');

    // Fetch patients list
    const fetchPatients = async () => {
        setLoadingPatients(true);
        setError(null);
        try {
            const data = await api.getPatients();
            setPatients(data);
            if (data.length > 0) {
                // If we just added a patient, select the newest one
                const newPatientId = location.state?.newPatientId;
                if (newPatientId) {
                    const newPatient = data.find((p: UserProfile) => p.patient_id === newPatientId);
                    setSelectedPatient(newPatient || data[0]);
                } else {
                    setSelectedPatient(data[0]);
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load patients");
            console.error("Error loading patients:", err);
        } finally {
            setLoadingPatients(false);
        }
    };

    useEffect(() => {
        fetchPatients();
    }, [location.state]);

    // Fetch recommendations for selected patient
    useEffect(() => {
        if (!selectedPatient) return;

        setLoadingRecommendations(true);
        setError(null);
        api.getRecommendations(selectedPatient.patient_id)
            .then((data) => {
                const mapped = data.map((rec: any) => ({
                    doctor: rec.doctor_name,
                    specialty: rec.specialty,
                    price: `${rec.price} RON`,
                    duration: `${rec.duration} minutes`,
                    score: rec.score,
                    clinic: rec.clinic,
                    recommended_for: rec.recommended_for,
                }));
                setRecommendations(mapped);
            })
            .catch((err) => {
                setError(err instanceof Error ? err.message : "Failed to load recommendations");
                console.error("Error loading recommendations:", err);
            })
            .finally(() => {
                setLoadingRecommendations(false);
            });
    }, [selectedPatient]);

    // Sort recommendations
    const sortedRecommendations = [...recommendations].sort((a, b) => {
        if (sortBy === 'score') {
            return (b.score || 0) - (a.score || 0);
        } else {
            const priceA = parseFloat(a.price.replace(/[^0-9.]/g, ''));
            const priceB = parseFloat(b.price.replace(/[^0-9.]/g, ''));
            return priceA - priceB;
        }
    });

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

            {error && !loadingPatients && (
                <div className="error-banner">
                    {error}
                    <button onClick={fetchPatients} className="retry-button">Retry</button>
                </div>
            )}

            {/* Patient Selector */}
            <div className="patient-selector">
                <label>Select Patient:</label>
                {loadingPatients ? (
                    <div className="loading">Loading patients...</div>
                ) : (
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
                )}
                <button onClick={() => navigate("/questionnaire")} className="add-patient-button">
                    + Add New Patient
                </button>
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
                    <div className="recommendations-header">
                        <h3>Recommended Appointments</h3>
                        {recommendations.length > 0 && (
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as 'score' | 'price')}
                                className="sort-select"
                            >
                                <option value="score">Sort by Score</option>
                                <option value="price">Sort by Price</option>
                            </select>
                        )}
                    </div>
                    {loadingRecommendations ? (
                        <div className="loading">Loading recommendations...</div>
                    ) : error ? (
                        <div className="error-message">{error}</div>
                    ) : sortedRecommendations.length > 0 ? (
                        <div className="recommendations-grid">
                            {sortedRecommendations.map((rec, index) => (
                                <div key={index} className="recommendation-card">
                                    <div className="card-header">
                                        <h4>{rec.specialty}</h4>
                                        {rec.score !== undefined && (
                                            <span className="score-badge">
                                                Score: {rec.score.toFixed(2)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="card-body">
                                        <p><strong>Doctor:</strong> {rec.doctor}</p>
                                        {rec.clinic && <p><strong>Clinic:</strong> {rec.clinic}</p>}
                                        <p><strong>Price:</strong> {rec.price}</p>
                                        <p><strong>Duration:</strong> {rec.duration}</p>
                                        {rec.recommended_for && (
                                            <p className="recommended-for">
                                                <strong>Recommended for:</strong> {rec.recommended_for}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p>No recommendations available</p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
