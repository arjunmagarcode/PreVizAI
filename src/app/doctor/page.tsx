"use client";

import React, { useState, useEffect } from "react";
import { Bell, Users, FileText, Send, Eye, ArrowLeft, CheckCircle, Clock, AlertCircle } from "lucide-react";
import Link from "next/link";

interface Patient {
  id: string;
  name: string;
  age: number;
  appointmentDate: string;
  status: 'pending' | 'completed' | 'needs_intake';
  lastIntake?: string;
  chiefComplaint?: string;
}

interface IntakeReport {
  chiefComplaint: string;
  symptoms: string[];
  duration: string;
  severity: string;
  triggers: string[];
  relievingFactors: string[];
  associatedSymptoms: string[];
  medicalHistory: string[];
  currentMedications: string[];
  allergies: string[];
  redFlags: string[];
  functionalImpact: string;
  patientConcerns: string[];
  notes: string;
  recommendedFollowUp: string;
}

export default function DoctorDashboard() {
  const [patients, setPatients] = useState<Patient[]>([
    {
      id: "1",
      name: "Sarah Johnson",
      age: 34,
      appointmentDate: "2025-09-28T10:00:00",
      status: "completed",
      lastIntake: "2025-09-27T14:30:00",
      chiefComplaint: "Persistent headaches and dizziness"
    },
    {
      id: "2",
      name: "Michael Chen",
      age: 45,
      appointmentDate: "2025-09-28T14:00:00",
      status: "needs_intake"
    },
    {
      id: "3",
      name: "Emily Rodriguez",
      age: 28,
      appointmentDate: "2025-09-29T09:00:00",
      status: "pending"
    }
  ]);

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientReport, setPatientReport] = useState<IntakeReport | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: "1",
      message: "Sarah Johnson completed pre-appointment intake",
      timestamp: "2025-09-27T14:30:00",
      type: "completed",
      patientId: "1"
    }
  ]);

  const sendIntakeRequest = async (patientId: string) => {
    try {
      // Simulate sending intake request
      await new Promise(resolve => setTimeout(resolve, 1000));

      setPatients(prev => prev.map(p =>
        p.id === patientId
          ? { ...p, status: 'pending' }
          : p
      ));

      // Add notification
      const patient = patients.find(p => p.id === patientId);
      if (patient) {
        setNotifications(prev => [...prev, {
          id: Date.now().toString(),
          message: `Intake request sent to ${patient.name}`,
          timestamp: new Date().toISOString(),
          type: "sent",
          patientId
        }]);
      }
    } catch (error) {
      console.error("Failed to send intake request:", error);
      alert("Failed to send intake request. Please try again.");
    }
  };

  const generateReport = async (patient: Patient) => {
    setIsGeneratingReport(true);
    try {
      // Simulate conversation data - in real app this would come from database
      const mockConversation = [
        { role: "assistant", content: "Hello! I'm here to help with your pre-appointment intake. Could you please tell me about your main health concern today?" },
        { role: "user", content: "I've been having really bad headaches for about two weeks now, and sometimes I feel dizzy when I stand up." },
        { role: "assistant", content: "I'm sorry to hear about your headaches and dizziness. Can you tell me more about when these headaches typically occur? Are they worse at any particular time of day?" },
        { role: "user", content: "They're definitely worse in the morning when I wake up, and they seem to get worse when I'm at work staring at my computer screen." },
        { role: "assistant", content: "That's helpful information. On a scale of 1-10, how would you rate the severity of these headaches? And have you noticed any other symptoms along with the headaches and dizziness?" },
        { role: "user", content: "I'd say they're about a 7 out of 10. I've also been feeling really tired lately, and sometimes I feel nauseous when the headache is really bad." }
      ];

      const response = await fetch('/api/generate-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation: mockConversation,
          patientInfo: {
            name: patient.name,
            age: patient.age,
            appointmentDate: patient.appointmentDate
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      const data = await response.json();

      if (data.success) {
        setPatientReport(data.report);
        setSelectedPatient(patient);
      } else {
        throw new Error(data.error || 'Failed to generate report');
      }
    } catch (error) {
      console.error("Failed to generate report:", error);
      alert("Failed to generate report. Please try again.");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const getStatusIcon = (status: Patient['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'needs_intake':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: Patient['status']) => {
    switch (status) {
      case 'completed':
        return 'Intake Complete';
      case 'pending':
        return 'Intake Sent';
      case 'needs_intake':
        return 'Needs Intake';
      default:
        return 'Unknown';
    }
  };

  if (selectedPatient && patientReport) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  setSelectedPatient(null);
                  setPatientReport(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <h1 className="text-xl font-semibold text-gray-900">
                Intake Report - {selectedPatient.name}
              </h1>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto p-6">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Chief Complaint</h2>
                <p className="text-gray-700 bg-blue-50 p-4 rounded-lg mb-6">
                  {patientReport.chiefComplaint}
                </p>

                <h3 className="font-semibold text-gray-900 mb-2">Symptoms</h3>
                <ul className="list-disc list-inside text-gray-700 mb-4">
                  {patientReport.symptoms?.map((symptom, idx) => (
                    <li key={idx}>{symptom}</li>
                  ))}
                </ul>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Duration</h3>
                    <p className="text-gray-700">{patientReport.duration}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Severity</h3>
                    <p className="text-gray-700">{patientReport.severity}</p>
                  </div>
                </div>

                {patientReport.redFlags && patientReport.redFlags.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <h3 className="font-semibold text-red-900 mb-2 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Red Flags
                    </h3>
                    <ul className="list-disc list-inside text-red-700">
                      {patientReport.redFlags.map((flag, idx) => (
                        <li key={idx}>{flag}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Medical History</h3>
                <ul className="list-disc list-inside text-gray-700 mb-4">
                  {patientReport.medicalHistory?.map((history, idx) => (
                    <li key={idx}>{history}</li>
                  ))}
                </ul>

                <h3 className="font-semibold text-gray-900 mb-2">Current Medications</h3>
                <ul className="list-disc list-inside text-gray-700 mb-4">
                  {patientReport.currentMedications?.map((medication, idx) => (
                    <li key={idx}>{medication}</li>
                  ))}
                </ul>

                <h3 className="font-semibold text-gray-900 mb-2">Allergies</h3>
                <ul className="list-disc list-inside text-gray-700 mb-4">
                  {patientReport.allergies?.map((allergy, idx) => (
                    <li key={idx}>{allergy}</li>
                  ))}
                </ul>

                <h3 className="font-semibold text-gray-900 mb-2">Functional Impact</h3>
                <p className="text-gray-700 mb-4">{patientReport.functionalImpact}</p>

                <h3 className="font-semibold text-gray-900 mb-2">Additional Notes</h3>
                <p className="text-gray-700 bg-gray-50 p-4 rounded-lg mb-4">
                  {patientReport.notes}
                </p>

                <h3 className="font-semibold text-gray-900 mb-2">Recommended Follow-up</h3>
                <p className="text-gray-700 bg-green-50 p-4 rounded-lg">
                  {patientReport.recommendedFollowUp}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-gray-500 hover:text-gray-700">
              <ArrowLeft className="h-6 w-6" />
            </Link>
            <h1 className="text-xl font-semibold text-gray-900">Doctor Dashboard</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Bell className="h-6 w-6 text-gray-600" />
              {notifications.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Patient List */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-lg">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Upcoming Appointments
              </h2>
            </div>
            <div className="divide-y">
              {patients.map((patient) => (
                <div key={patient.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-medium text-gray-900">{patient.name}</h3>
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(patient.status)}
                          <span className="text-sm text-gray-600">
                            {getStatusText(patient.status)}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        <p>Age: {patient.age}</p>
                        <p>Appointment: {new Date(patient.appointmentDate).toLocaleString()}</p>
                        {patient.chiefComplaint && (
                          <p className="text-blue-600">Chief Complaint: {patient.chiefComplaint}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      {patient.status === 'needs_intake' && (
                        <button
                          onClick={() => sendIntakeRequest(patient.id)}
                          className="flex items-center px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                        >
                          <Send className="h-4 w-4 mr-1" />
                          Send Intake
                        </button>
                      )}
                      {patient.status === 'completed' && (
                        <button
                          onClick={() => generateReport(patient)}
                          disabled={isGeneratingReport}
                          className="flex items-center px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm disabled:opacity-50"
                        >
                          {isGeneratingReport ? (
                            <div className="animate-spin h-4 w-4 mr-1 border-2 border-white border-t-transparent rounded-full" />
                          ) : (
                            <Eye className="h-4 w-4 mr-1" />
                          )}
                          {isGeneratingReport ? 'Generating...' : 'View Report'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notifications Panel */}
          <div className="bg-white rounded-xl shadow-lg">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Bell className="h-5 w-5 mr-2" />
                Recent Activity
              </h2>
            </div>
            <div className="divide-y max-h-96 overflow-y-auto">
              {notifications.map((notification) => (
                <div key={notification.id} className="p-4">
                  <p className="text-sm text-gray-900 mb-1">{notification.message}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(notification.timestamp).toLocaleString()}
                  </p>
                  <div className={`inline-block px-2 py-1 rounded-full text-xs mt-2 ${notification.type === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-blue-100 text-blue-800'
                    }`}>
                    {notification.type === 'completed' ? 'Completed' : 'Sent'}
                  </div>
                </div>
              ))}
              {notifications.length === 0 && (
                <div className="p-4 text-center text-gray-500">
                  No recent activity
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
