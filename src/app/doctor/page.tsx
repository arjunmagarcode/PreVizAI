"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import React, { useEffect, useState } from "react";
import {
  Bell, Send, ArrowLeft, CheckCircle, Clock, Eye, User
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

type NotificationType = "completed" | "sent" | "scheduled";

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
    {
    id: "2",
    message: "Intake form sent to Michael Chen", 
    timestamp: "2025-09-27T13:15:00",
    type: "sent",
    patientId: "2",
    },
    {
    id: "3",
    message: "Emily Rodriguez appointment scheduled",
    timestamp: "2025-09-27T11:45:00", 
    type: "scheduled",
    patientId: "3",
    },
  ]);

  const [reportMap, setReportMap] = useState<Record<string, string>>({"1": "sarah-johnson-report-001"});
  const [toast, setToast] = useState<{ show: boolean; text: string } | null>(null);

  const completedParam = searchParams.get("intake");
  const completedPatientId = searchParams.get("patientId");
  const reportIdFromQuery = searchParams.get("reportId");

  useEffect(() => {
    if (completedParam === "completed" && completedPatientId) {
      const p = patients.find((x) => x.id === completedPatientId);
      if (p) {
        if (p.status !== "completed") {
          setPatients((prev) =>
            prev.map((pt) =>
              pt.id === p.id
                ? { ...pt, status: "completed", lastIntake: new Date().toISOString() }
                : pt
            )
          );
        }

        if (reportIdFromQuery) {
          setReportMap((prev) => ({ ...prev, [p.id]: reportIdFromQuery }));
        }

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

        setToast({ show: true, text: `Intake complete for ${p.name}` });

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

  const highlightId = completedParam === "completed" ? completedPatientId : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                <ArrowLeft className="w-5 h-5" />
                <span>Back</span>
              </Link>
              <h1 className="text-2xl font-bold text-black">Doctor Dashboard</h1>
            </div>
            <div className="flex items-center gap-4 relative">
              <div className="relative">
                <Bell className="w-6 h-6 text-gray-600" />
                {notifications.length > 0 && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-xs text-white font-bold">{notifications.length}</span>
                  </div>
                )}
              </div>

              {toast?.show && (
                <div className="absolute right-0 top-10 z-20 bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-gray-800">{toast.text}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upcoming Appointments */}
          <div className="lg:col-span-2">
            <Card className="p-6 bg-white shadow-lg border-0">
              <div className="flex items-center gap-3 mb-6">
                <User className="w-6 h-6 text-blue-500" />
                <h2 className="text-xl font-bold text-black">Upcoming Appointments</h2>
              </div>

              <div className="space-y-6">
                {patients.map((patient) => {
                  const isHighlighted = highlightId && patient.id === highlightId;
                  const reportId = reportMap[patient.id];
                  
                  return (
                    <div
                      key={patient.id}
                      className={`flex items-start justify-between p-4 rounded-lg transition-colors ${
                        isHighlighted ? "bg-green-50 border-l-4 border-green-500" : "bg-gray-50"
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-black">{patient.name}</h3>
                          
                          {patient.status === "completed" && (
                            <Badge 
                              variant="secondary" 
                              style={{
                                backgroundColor: '#dcfce7', 
                                color: '#15803d',
                                border: '1px solid #bbf7d0'
                              }}
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Intake Complete
                            </Badge>
                          )}

                          {patient.status === "pending" && (
                            <Badge 
                              variant="secondary" 
                              style={{
                                backgroundColor: '#fef3c7', 
                                color: '#d97706',
                                border: '1px solid #fde68a'
                              }}
                            >
                              <Clock className="w-3 h-3 mr-1" />
                              Intake Sent
                            </Badge>
                          )}

                          {patient.status === "needs_intake" && (
                            <Badge 
                              variant="secondary" 
                              style={{
                                backgroundColor: '#fecaca', 
                                color: '#dc2626',
                                border: '1px solid #fca5a5'
                              }}
                            >
                              <Clock className="w-3 h-3 mr-1" />
                              Needs Intake
                            </Badge>
                          )}
                          
                          {isHighlighted && (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Just completed
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-1">Age: {patient.age}</p>
                        <p className="text-sm text-gray-600 mb-1">
                          Appointment: {new Date(patient.appointmentDate).toLocaleString()}
                        </p>
                        
                        {patient.chiefComplaint ? (
                          <p className="text-sm text-blue-600">
                            Chief Complaint: {patient.chiefComplaint}
                          </p>
                        ) : (
                          <p className="text-sm text-gray-600">
                            {patient.status === "needs_intake" 
                              ? "Intake not yet completed"
                              : patient.status === "pending"
                              ? "Intake form sent, awaiting completion"
                              : "Intake completed"
                            }
                          </p>
                        )}
                        
                        {patient.lastIntake && (
                          <p className="text-xs text-gray-500 mt-1">
                            Last Intake: {new Date(patient.lastIntake).toLocaleString()}
                          </p>
                        )}
                      </div>

                      <div className="flex space-x-2">
                        {patient.status === "completed" && reportId ? (
                          <Link href={`/doctor/report/${encodeURIComponent(reportId)}`}>
                            <Button className="bg-green-500 hover:bg-green-600 text-white">
                              <Eye className="w-4 h-4 mr-2" />
                              View Report
                            </Button>
                          </Link>
                        ) : patient.status === "needs_intake" ? (
                          <Button
                            onClick={() => sendIntakeRequest(patient.id)}
                            variant="outline"
                            className="border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white bg-transparent"
                          >
                            <Send className="w-4 h-4 mr-2" />
                            Send Intake
                          </Button>
                        ) : patient.status === "pending" ? (
                          <Button variant="ghost" className="text-gray-500" disabled>
                            Pending Response
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-1">
            <Card className="p-6 bg-white shadow-lg border-0">
              <div className="flex items-center gap-3 mb-6">
                <Bell className="w-6 h-6 text-blue-500" />
                <h2 className="text-xl font-bold text-black">Recent Activity</h2>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {notifications.map((n) => {
                  const patient = patients.find((p) => p.id === n.patientId);
                  const reportId = reportMap[n.patientId];
                  
                  return (
                    <div
                      key={n.id}
                      className={`p-3 rounded-lg border-l-4 ${
                        n.type === "completed"
                          ? "bg-green-50 border-green-500"
                          : n.type === "scheduled" 
                          ? "bg-yellow-50 border-yellow-500"
                          : "bg-blue-50 border-blue-500"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-black">{n.message}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(n.timestamp).toLocaleString()}
                          </p>
                          <Badge
                            className={`mt-2 text-xs hover:bg-current ${
                              n.type === "completed"
                                ? "bg-green-100 text-green-700"
                                : n.message.includes("appointment scheduled")
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {n.type === "completed" ? "Completed" : n.type === "scheduled" ? "Scheduled" : "Sent"}

                          </Badge>
                        </div>

                        {n.type === "completed" && patient?.status === "completed" && reportId && (
                          <Link
                            href={`/doctor/report/${encodeURIComponent(reportId)}`}
                            className="inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-medium bg-green-600 text-white hover:bg-green-700 transition-colors ml-2"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            View
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
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}