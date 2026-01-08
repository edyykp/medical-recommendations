export type Recommendation = {
  doctor: string;
  specialty: string;
  price: string;
  duration: string;
};

export type UserProfile = {
  patient_id: number;
  age: number;
  sex: string;
  diabetes: number;
  heart_disease: number;
  cancer: string;
  hypertension: boolean;
  obesity: boolean;
  kidney_disease: number;
  liver_disease: number;
  osteoporosis: boolean;
  arthritis: boolean;
  joint_pain: boolean;
  previous_fractures: boolean;
  stress_level: string;
  thyroid_disorder: string;
  hormonal_imbalance: boolean;
  vitamins_deficit: string;
  lung_disease: number;
  alcohol_consumption: number;
  headaches: boolean;
  asthma: boolean;
  epilepsy: boolean;
  blood_pressure: number;
  smoker: number;
  cholesterol: number;
  BMI: number;
  activity_level: number;
  [key: string]: string | number | boolean;
};

export enum PreferredTime {
  Morning = "Morning",
  Afternoon = "Afternoon",
  Evening = "Evening",
}

export enum ActivityLevel {
  Low = "Low",
  Moderate = "Moderate",
  High = "High",
}