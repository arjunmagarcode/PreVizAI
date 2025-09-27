export const EMR = {
  "patient_id": "98765",
  "demographics": {
    "name": "John Smith",
    "dob": "1985-04-12",
    "gender": "Male",
    "contact": {
      "phone": "555-123-4567",
      "email": "john.smith@example.com",
      "address": "123 Main St, Austin, TX"
    }
  },
  "conditions": [
    {
      "name": "Chronic Migraine",
      "diagnosed": "2017-05-10",
      "status": "chronic"
    },
    {
      "name": "Hypertension",
      "diagnosed": "2015-08-22",
      "status": "chronic"
    },
    {
      "name": "Gastroesophageal Reflux Disease (GERD)",
      "diagnosed": "2019-11-15",
      "status": "managed"
    },
    {
      "name": "Seasonal Allergies",
      "diagnosed": "2010-04-01",
      "status": "episodic"
    },
    {
      "name": "Eye Strain",
      "diagnosed": "2021-03-05",
      "status": "episodic"
    }
  ],
  "medications": [
    {
      "name": "Ibuprofen",
      "dose": "200mg",
      "frequency": "as needed",
      "active": true,
      "indication": "headache pain relief"
    },
    {
      "name": "Lisinopril",
      "dose": "10mg",
      "frequency": "daily",
      "active": true,
      "indication": "hypertension"
    },
    {
      "name": "Omeprazole",
      "dose": "20mg",
      "frequency": "daily",
      "active": true,
      "indication": "GERD"
    },
    {
      "name": "Cetirizine",
      "dose": "10mg",
      "frequency": "as needed",
      "active": true,
      "indication": "seasonal allergies"
    }
  ],
  "labs": [
    {
      "test": "Blood Pressure",
      "value": "142/88",
      "unit": "mmHg",
      "date": "2025-09-10",
      "trend": "slightly elevated"
    },
    {
      "test": "CBC",
      "value": "Normal",
      "date": "2025-08-20"
    },
    {
      "test": "Metabolic Panel",
      "value": "Slightly elevated liver enzymes",
      "date": "2024-12-15"
    }
  ],
  "allergies": [
    {
      "substance": "Penicillin",
      "reaction": "Rash"
    },
    {
      "substance": "NSAIDs (high doses)",
      "reaction": "Stomach upset"
    }
  ],
  "alerts": [
    "History of chronic migraine",
    "Monitor blood pressure regularly",
    "Sensitive to bright light and strong odors (headache triggers)"
  ],
  "encounters": [
    {
      "date": "2025-09-20",
      "reason": "Persistent headache and morning nausea",
      "notes": "Patient reports headaches worsened by meal skipping, bright screens, strong smells. Vision changes noted with headache. Patient uses ibuprofen with partial relief."
    },
    {
      "date": "2025-06-15",
      "reason": "Routine hypertension check",
      "notes": "BP slightly elevated. Lisinopril continued. Advised lifestyle modifications."
    },
    {
      "date": "2024-11-12",
      "reason": "GERD management",
      "notes": "Patient reports reflux symptoms when skipping breakfast. Omeprazole prescribed."
    },
    {
      "date": "2023-09-05",
      "reason": "Migraine flare-up",
      "notes": "Patient experienced cluster migraine after exposure to strong perfumes. Advised OTC pain relievers and hydration."
    },
    {
      "date": "2022-04-18",
      "reason": "Seasonal allergies",
      "notes": "Patient reports sneezing and watery eyes during spring. Cetirizine recommended as needed."
    }
  ],
  "lifestyle": {
    "diet": "Occasional meal skipping; advised regular meals to manage headaches",
    "screen_time": "High; spends 8+ hours daily on computer",
    "exercise": "Moderate; 3-4 times/week",
    "sleep": "6-7 hours/night",
    "stress": "Moderate; reports increased tension during work deadlines"
  }
}