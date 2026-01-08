import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";

function Questionnaire() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        age: "",
        sex: "M",
        diabetes: "0",
        heart_disease: "0",
        cancer: "none",
        hypertension: false,
        obesity: false,
        kidney_disease: "0",
        liver_disease: "0",
        osteoporosis: false,
        arthritis: false,
        joint_pain: false,
        previous_fractures: false,
        stress_level: "0",
        thyroid_disorder: "none",
        hormonal_imbalance: false,
        vitamins_deficit: "none",
        lung_disease: "0",
        alcohol_consumption: "0",
        headaches: false,
        asthma: false,
        epilepsy: false,
        blood_pressure: "",
        smoker: "0",
        cholesterol: "",
        BMI: "",
        activity_level: "3",
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitMessage, setSubmitMessage] = useState("");
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validateField = (name: string, value: any): string => {
        if (name === "age") {
            const age = parseInt(value);
            if (isNaN(age) || age < 0 || age > 120) {
                return "Age must be between 0 and 120";
            }
        } else if (name === "BMI") {
            const bmi = parseFloat(value);
            if (isNaN(bmi) || bmi < 10 || bmi > 50) {
                return "BMI should be between 10 and 50";
            }
        } else if (name === "blood_pressure") {
            const bp = parseFloat(value);
            if (isNaN(bp) || bp < 50 || bp > 250) {
                return "Blood pressure should be between 50-250 mmHg";
            }
        } else if (name === "cholesterol") {
            const chol = parseFloat(value);
            if (isNaN(chol) || chol < 100 || chol > 400) {
                return "Cholesterol should be between 100-400 mg/dL";
            }
        }
        return "";
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const newValue = type === "checkbox" ? (e.target as HTMLInputElement).checked : value;

        setFormData((prev) => ({
            ...prev,
            [name]: newValue,
        }));

        // Validate field
        const error = validateField(name, newValue);
        setErrors((prev) => {
            const newErrors = { ...prev };
            if (error) {
                newErrors[name] = error;
            } else {
                delete newErrors[name];
            }
            return newErrors;
        });
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        // Validate required fields
        if (!formData.age) newErrors.age = "Age is required";
        if (!formData.blood_pressure) newErrors.blood_pressure = "Blood pressure is required";
        if (!formData.cholesterol) newErrors.cholesterol = "Cholesterol is required";
        if (!formData.BMI) newErrors.BMI = "BMI is required";

        // Validate all fields
        Object.keys(formData).forEach((key) => {
            const error = validateField(key, formData[key as keyof typeof formData]);
            if (error) newErrors[key] = error;
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            setSubmitMessage("Please fix the errors in the form");
            return;
        }

        setIsSubmitting(true);
        setSubmitMessage("");

        try {
            // Convert form data to proper types
            const patientData = {
                age: parseInt(formData.age),
                sex: formData.sex,
                diabetes: parseInt(formData.diabetes),
                heart_disease: parseInt(formData.heart_disease),
                cancer: formData.cancer,
                hypertension: formData.hypertension,
                obesity: formData.obesity,
                kidney_disease: parseInt(formData.kidney_disease),
                liver_disease: parseInt(formData.liver_disease),
                osteoporosis: formData.osteoporosis,
                arthritis: formData.arthritis,
                joint_pain: formData.joint_pain,
                previous_fractures: formData.previous_fractures,
                stress_level: parseInt(formData.stress_level),
                thyroid_disorder: formData.thyroid_disorder,
                hormonal_imbalance: formData.hormonal_imbalance,
                vitamins_deficit: formData.vitamins_deficit,
                lung_disease: parseInt(formData.lung_disease),
                alcohol_consumption: parseInt(formData.alcohol_consumption),
                headaches: formData.headaches,
                asthma: formData.asthma,
                epilepsy: formData.epilepsy,
                blood_pressure: parseFloat(formData.blood_pressure),
                smoker: parseInt(formData.smoker),
                cholesterol: parseFloat(formData.cholesterol),
                BMI: parseFloat(formData.BMI),
                activity_level: parseInt(formData.activity_level),
            };

            const { api } = await import("./api");
            const result = await api.addPatient(patientData);
            setSubmitMessage(`Patient ${result.patient_id} added successfully! Redirecting...`);
            setTimeout(() => {
                navigate("/", { state: { newPatientId: result.patient_id } });
            }, 2000);
        } catch (error) {
            setSubmitMessage(`Error: ${error instanceof Error ? error.message : "Failed to submit"}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const calculateProgress = (): number => {
        const required = ['age', 'sex', 'blood_pressure', 'cholesterol', 'BMI', 'activity_level'];
        const filled = required.filter(field => {
            const value = formData[field as keyof typeof formData];
            return value !== "" && value !== null && value !== undefined;
        }).length;
        return Math.round((filled / required.length) * 100);
    };

    return (
        <div className="app-container">
            <h2>New Patient Questionnaire</h2>
            <button onClick={() => navigate("/")} className="back-button">
                ← Back to Dashboard
            </button>

            <div className="progress-bar-container">
                <div className="progress-bar">
                    <div
                        className="progress-fill"
                        style={{ width: `${calculateProgress()}%` }}
                    ></div>
                </div>
                <span className="progress-text">{calculateProgress()}% Complete</span>
            </div>

            <form onSubmit={handleSubmit} className="questionnaire-form">
                {/* Basic Information */}
                <div className="form-section">
                    <h3>Basic Information</h3>
                    <div className="form-row">
                        <label>
                            Age: *
                            <input
                                type="number"
                                name="age"
                                value={formData.age}
                                onChange={handleChange}
                                required
                                min="0"
                                max="120"
                                className={errors.age ? "error-input" : ""}
                            />
                            {errors.age && <span className="error-text">{errors.age}</span>}
                        </label>
                        <label>
                            Sex: *
                            <select name="sex" value={formData.sex} onChange={handleChange} required>
                                <option value="M">Male</option>
                                <option value="F">Female</option>
                            </select>
                        </label>
                    </div>
                </div>

                {/* Health Metrics */}
                <div className="form-section">
                    <h3>Health Metrics</h3>
                    <div className="form-row">
                        <label>
                            Blood Pressure (mmHg): *
                            <input
                                type="number"
                                name="blood_pressure"
                                value={formData.blood_pressure}
                                onChange={handleChange}
                                required
                                step="0.1"
                                min="0"
                                className={errors.blood_pressure ? "error-input" : ""}
                            />
                            {errors.blood_pressure && <span className="error-text">{errors.blood_pressure}</span>}
                        </label>
                        <label>
                            Cholesterol (mg/dL): *
                            <input
                                type="number"
                                name="cholesterol"
                                value={formData.cholesterol}
                                onChange={handleChange}
                                required
                                step="0.1"
                                min="0"
                                className={errors.cholesterol ? "error-input" : ""}
                            />
                            {errors.cholesterol && <span className="error-text">{errors.cholesterol}</span>}
                        </label>
                        <label>
                            BMI: *
                            <input
                                type="number"
                                name="BMI"
                                value={formData.BMI}
                                onChange={handleChange}
                                required
                                step="0.1"
                                min="0"
                                className={errors.BMI ? "error-input" : ""}
                            />
                            {errors.BMI && <span className="error-text">{errors.BMI}</span>}
                        </label>
                        <label>
                            Activity Level (1-5): *
                            <select
                                name="activity_level"
                                value={formData.activity_level}
                                onChange={handleChange}
                                required
                            >
                                <option value="1">1 - Very Low</option>
                                <option value="2">2 - Low</option>
                                <option value="3">3 - Moderate</option>
                                <option value="4">4 - High</option>
                                <option value="5">5 - Very High</option>
                            </select>
                        </label>
                    </div>
                </div>

                {/* Chronic Conditions */}
                <div className="form-section">
                    <h3>Chronic Conditions</h3>
                    <div className="form-row">
                        <label>
                            Diabetes (0=None, 1=Mild, 2=Severe):
                            <select name="diabetes" value={formData.diabetes} onChange={handleChange}>
                                <option value="0">0 - None</option>
                                <option value="1">1 - Mild</option>
                                <option value="2">2 - Severe</option>
                            </select>
                        </label>
                        <label>
                            Heart Disease (0=None, 1=Mild, 2=Severe):
                            <select
                                name="heart_disease"
                                value={formData.heart_disease}
                                onChange={handleChange}
                            >
                                <option value="0">0 - None</option>
                                <option value="1">1 - Mild</option>
                                <option value="2">2 - Severe</option>
                            </select>
                        </label>
                        <label>
                            Kidney Disease (0=None, 1=Mild, 2=Severe):
                            <select
                                name="kidney_disease"
                                value={formData.kidney_disease}
                                onChange={handleChange}
                            >
                                <option value="0">0 - None</option>
                                <option value="1">1 - Mild</option>
                                <option value="2">2 - Severe</option>
                            </select>
                        </label>
                        <label>
                            Liver Disease (0=None, 1=Mild, 2=Severe):
                            <select
                                name="liver_disease"
                                value={formData.liver_disease}
                                onChange={handleChange}
                            >
                                <option value="0">0 - None</option>
                                <option value="1">1 - Mild</option>
                                <option value="2">2 - Severe</option>
                            </select>
                        </label>
                        <label>
                            Lung Disease (0=None, 1=Mild, 2=Severe):
                            <select
                                name="lung_disease"
                                value={formData.lung_disease}
                                onChange={handleChange}
                            >
                                <option value="0">0 - None</option>
                                <option value="1">1 - Mild</option>
                                <option value="2">2 - Severe</option>
                            </select>
                        </label>
                        <label>
                            Cancer:
                            <input
                                type="text"
                                name="cancer"
                                value={formData.cancer}
                                onChange={handleChange}
                                placeholder="none or type"
                            />
                        </label>
                    </div>
                </div>

                {/* Boolean Conditions */}
                <div className="form-section">
                    <h3>Other Conditions</h3>
                    <div className="form-checkboxes">
                        <label>
                            <input
                                type="checkbox"
                                name="hypertension"
                                checked={formData.hypertension}
                                onChange={handleChange}
                            />
                            Hypertension
                        </label>
                        <label>
                            <input
                                type="checkbox"
                                name="obesity"
                                checked={formData.obesity}
                                onChange={handleChange}
                            />
                            Obesity
                        </label>
                        <label>
                            <input
                                type="checkbox"
                                name="osteoporosis"
                                checked={formData.osteoporosis}
                                onChange={handleChange}
                            />
                            Osteoporosis
                        </label>
                        <label>
                            <input
                                type="checkbox"
                                name="arthritis"
                                checked={formData.arthritis}
                                onChange={handleChange}
                            />
                            Arthritis
                        </label>
                        <label>
                            <input
                                type="checkbox"
                                name="joint_pain"
                                checked={formData.joint_pain}
                                onChange={handleChange}
                            />
                            Joint Pain
                        </label>
                        <label>
                            <input
                                type="checkbox"
                                name="previous_fractures"
                                checked={formData.previous_fractures}
                                onChange={handleChange}
                            />
                            Previous Fractures
                        </label>
                        <label>
                            <input
                                type="checkbox"
                                name="hormonal_imbalance"
                                checked={formData.hormonal_imbalance}
                                onChange={handleChange}
                            />
                            Hormonal Imbalance
                        </label>
                        <label>
                            <input
                                type="checkbox"
                                name="headaches"
                                checked={formData.headaches}
                                onChange={handleChange}
                            />
                            Headaches
                        </label>
                        <label>
                            <input
                                type="checkbox"
                                name="asthma"
                                checked={formData.asthma}
                                onChange={handleChange}
                            />
                            Asthma
                        </label>
                        <label>
                            <input
                                type="checkbox"
                                name="epilepsy"
                                checked={formData.epilepsy}
                                onChange={handleChange}
                            />
                            Epilepsy
                        </label>
                    </div>
                </div>

                {/* Lifestyle Factors */}
                <div className="form-section">
                    <h3>Lifestyle Factors</h3>
                    <div className="form-row">
                        <label>
                            Stress Level (0=None, 1=Low, 2=High):
                            <select
                                name="stress_level"
                                value={formData.stress_level}
                                onChange={handleChange}
                            >
                                <option value="0">0 - None</option>
                                <option value="1">1 - Low</option>
                                <option value="2">2 - High</option>
                            </select>
                        </label>
                        <label>
                            Smoker (0=None, 1=Occasional, 2=Regular):
                            <select name="smoker" value={formData.smoker} onChange={handleChange}>
                                <option value="0">0 - None</option>
                                <option value="1">1 - Occasional</option>
                                <option value="2">2 - Regular</option>
                            </select>
                        </label>
                        <label>
                            Alcohol Consumption (0=None, 1=Occasional, 2=Regular):
                            <select
                                name="alcohol_consumption"
                                value={formData.alcohol_consumption}
                                onChange={handleChange}
                            >
                                <option value="0">0 - None</option>
                                <option value="1">1 - Occasional</option>
                                <option value="2">2 - Regular</option>
                            </select>
                        </label>
                    </div>
                </div>

                {/* Additional Information */}
                <div className="form-section">
                    <h3>Additional Information</h3>
                    <div className="form-row">
                        <label>
                            Thyroid Disorder:
                            <input
                                type="text"
                                name="thyroid_disorder"
                                value={formData.thyroid_disorder}
                                onChange={handleChange}
                                placeholder="none, hypothyroidism, hyperthyroidism"
                            />
                        </label>
                        <label>
                            Vitamins Deficit:
                            <input
                                type="text"
                                name="vitamins_deficit"
                                value={formData.vitamins_deficit}
                                onChange={handleChange}
                                placeholder="none, D, B12, etc."
                            />
                        </label>
                    </div>
                </div>

                {submitMessage && (
                    <div className={`submit-message ${submitMessage.includes("Error") ? "error" : "success"}`}>
                        {submitMessage}
                    </div>
                )}

                <button type="submit" disabled={isSubmitting} className="submit-button">
                    {isSubmitting ? "Submitting..." : "Submit Patient Information"}
                </button>
            </form>
        </div>
    );
}

export default Questionnaire;
