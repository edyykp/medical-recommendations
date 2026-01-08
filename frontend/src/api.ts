const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const api = {
    getPatients: async () => {
        const response = await fetch(`${API_URL}/patients`);
        if (!response.ok) throw new Error("Failed to fetch patients");
        return response.json();
    },

    addPatient: async (patientData: any) => {
        const response = await fetch(`${API_URL}/patients`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patientData),
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: "Failed to add patient" }));
            throw new Error(error.detail || "Failed to add patient");
        }
        return response.json();
    },

    getRecommendations: async (patientId: number) => {
        const response = await fetch(`${API_URL}/recommendations/${patientId}`);
        if (!response.ok) throw new Error("Failed to fetch recommendations");
        return response.json();
    },
};
