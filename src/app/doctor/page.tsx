"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Bell, Users, Send, ArrowLeft, CheckCircle, Clock, AlertCircle, Eye
} from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";

interface Patient {
  id: string;
  name: string;
  age: number;
  appointmentDate: string;
  status: "pending" | "completed" | "needs_intake";
  lastIntake?: string;
  chiefComplaint?: string;
}

type NotificationType = "completed" | "sent";

interface Notification {
  id: string;
  message: string;
  timestamp: string;
  type: NotificationType;
  patientId: string;
}

export default function DoctorDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [patients, setPatients] = useState<Patient[]>([
    {
      id: "1",
      name: "Sarah Johnson",
      age: 34,
      appointmentDate: "2025-09-28T10:00:00",
      status: "completed",
      lastIntake: "2025-09-27T14:30:00",
      chiefComplaint: "Persistent headaches and dizziness",
    },
    {
      id: "2",
      name: "Michael Chen",
      age: 45,
      appointmentDate: "2025-09-28T14:00:00",
      status: "needs_intake",
    },
    {
      id: "3",
      name: "Emily Rodriguez",
      age: 28,
      appointmentDate: "2025-09-29T09:00:00",
      status: "pending",
    },
  ]);

  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      message: "Sarah Johnson completed pre-appointment intake",
      timestamp: "2025-09-27T14:30:00",
      type: "completed",
      patientId: "1",
    },
  ]);

  // Map patientId -> reportId(s)
  const [reportMap, setReportMap] = useState<Record<string, string>>({});

  // Simple toast UI
  const [toast, setToast] = useState<{ show: boolean; text: string } | null>(null);

  // Read params when redirected after intake completion
  const completedParam = searchParams.get("intake"); // "completed" or null
  const completedPatientId = searchParams.get("patientId");
  const reportIdFromQuery = searchParams.get("reportId");

  useEffect(() => {
    if (completedParam === "completed" && completedPatientId) {
      const p = patients.find((x) => x.id === completedPatientId);
      if (p) {
        // Ensure patient is marked completed
        if (p.status !== "completed") {
          setPatients((prev) =>
            prev.map((pt) =>
              pt.id === p.id
                ? { ...pt, status: "completed", lastIntake: new Date().toISOString() }
                : pt
            )
          );
        }

        // If a reportId was provided, store it
        if (reportIdFromQuery) {
          setReportMap((prev) => ({ ...prev, [p.id]: reportIdFromQuery }));
        }

        // Add a notification
        setNotifications((prev) => [
          {
            id: Date.now().toString(),
            message: `${p.name} completed pre-appointment intake`,
            timestamp: new Date().toISOString(),
            type: "completed",
            patientId: p.id,
          },
          ...prev,
        ]);

        // Show toast
        setToast({ show: true, text: `Intake complete for ${p.name}` });

        // Clean the URL after a few seconds (avoids re-trigger on refresh)
        const t = setTimeout(() => {
          setToast(null);
          router.replace(window.location.pathname);
        }, 3500);
        return () => clearTimeout(t);
      }
    }
  }, [completedParam, completedPatientId, reportIdFromQuery, patients, router]);

  const sendIntakeRequest = async (patientId: string) => {
    try {
      await new Promise((r) => setTimeout(r, 600));
      setPatients((prev) =>
        prev.map((p) => (p.id === patientId ? { ...p, status: "pending" } : p))
      );

      const patient = patients.find((p) => p.id === patientId);
      if (patient) {
        setNotifications((prev) => [
          {
            id: Date.now().toString(),
            message: `Intake request sent to ${patient.name}`,
            timestamp: new Date().toISOString(),
            type: "sent",
            patientId,
          },
          ...prev,
        ]);
      }
    } catch {
      alert("Failed to send intake request. Please try again.");
    }
  };

  const getStatusIcon = (status: Patient["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "pending":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case "needs_intake":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: Patient["status"]) => {
    switch (status) {
      case "completed":
        return "Intake Complete";
      case "pending":
        return "Intake Sent";
      case "needs_intake":
        return "Needs Intake";
      default:
        return "Unknown";
    }
  };

  const highlightId = completedParam === "completed" ? completedPatientId : null;

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
          <div className="flex items-center space-x-4 relative">
            <div className="relative">
              <Bell className="h-6 w-6 text-gray-600" />
              {notifications.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </div>

            {/* Toast */}
            {toast?.show && (
              <div className="absolute right-0 top-10 z-20 bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-2 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm text-gray-800">{toast.text}</span>
              </div>
            )}
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
              {patients.map((patient) => {
                const isHighlighted = highlightId && patient.id === highlightId;
                const reportId = reportMap[patient.id]; // if present, show "View Report"
                return (
                  <div
                    key={patient.id}
                    className={`p-6 hover:bg-gray-50 transition-colors ${isHighlighted ? "bg-green-50" : ""
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center flex-wrap gap-3 mb-2">
                          <h3 className="font-medium text-gray-900">{patient.name}</h3>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(patient.status)}
                            <span className="text-sm text-gray-600">
                              {getStatusText(patient.status)}
                            </span>
                          </div>

                          {/* Show “View Report” when intake is completed AND we have a reportId */}
                          {patient.status === "completed" && reportId && (
                            <Link
                              href={`/doctor/report/${encodeURIComponent(reportId)}`}
                              className="inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
                              aria-label={`View report for ${patient.name}`}
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              View Report
                            </Link>
                          )}

                          {/* Small “Intake complete” pill for freshly completed patient */}
                          {isHighlighted && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Intake completed
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>Age: {patient.age}</p>
                          <p>Appointment: {new Date(patient.appointmentDate).toLocaleString()}</p>
                          {patient.chiefComplaint && (
                            <p className="text-blue-600">
                              Chief Complaint: {patient.chiefComplaint}
                            </p>
                          )}
                          {patient.lastIntake && (
                            <p className="text-gray-500 text-xs">
                              Last Intake: {new Date(patient.lastIntake).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        {patient.status === "needs_intake" && (
                          <button
                            onClick={() => sendIntakeRequest(patient.id)}
                            className="flex items-center px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                          >
                            <Send className="h-4 w-4 mr-1" />
                            Send Intake
                          </button>
                        )}
                        {/* No generate button here anymore */}
                      </div>
                    </div>
                  </div>
                );
              })}
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
              {notifications.map((n) => {
                const patient = patients.find((p) => p.id === n.patientId);
                const reportId = reportMap[n.patientId];
                return (
                  <div key={n.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-900 mb-1">{n.message}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(n.timestamp).toLocaleString()}
                        </p>
                        <div
                          className={`inline-block px-2 py-1 rounded-full text-xs mt-2 ${n.type === "completed"
                              ? "bg-green-100 text-green-800"
                              : "bg-blue-100 text-blue-800"
                            }`}
                        >
                          {n.type === "completed" ? "Completed" : "Sent"}
                        </div>
                      </div>

                      {/* Quick action when completed AND we know the reportId */}
                      {n.type === "completed" && patient?.status === "completed" && reportId && (
                        <Link
                          href={`/doctor/report/${encodeURIComponent(reportId)}`}
                          className="inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          View Report
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
              {notifications.length === 0 && (
                <div className="p-4 text-center text-gray-500">No recent activity</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
