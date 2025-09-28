"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell, Users, Send, ArrowLeft, CheckCircle, Clock, AlertCircle, Eye, X, Sparkles, FileText
} from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";

import KnowledgeGraph from "@/components/KnowledgeGraph";

// Cedar hooks (still used for state/context publishing)
import { useRegisterState, useCedarStore } from "cedar-os";

// EMR helper (kept for finding relevant refs)
import { findEmrEvidence } from "@/cedar/agents/emrExplain";

// NEW: OpenAI explain helper
import { explainInsightWithLLM } from "@/lib/explainInsight";

const typeColors: Record<string, string> = {
  Symptom: "#007BFF",
  Condition: "#D9534F",
  Trigger: "#F0AD4E",
  Cause: "#F0AD4E",
  Medication: "#5CB85C"
};

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

type ReportPayload = {
  reportId: string;
  patientId: string;
  patientName: string;
  createdAt: string;
  transcript?: string;
  insights_report?: any;
  next_steps?: string[];
  emr_tab?: any;
  annotated_graph?: any;
};

function makeId(): string {
  if (typeof window !== "undefined" && window.crypto && "randomUUID" in window.crypto) {
    return (window.crypto as any).randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Drawer UI */
function EvidenceDrawer({
  open,
  onClose,
  selectedText,
  emrHits,
  onAskCedar,
  cedarBusy,
  cedarAnswer,
  cedarAvailable,
}: {
  open: boolean;
  onClose: () => void;
  selectedText: string;
  emrHits: { path: string; value: string }[];
  onAskCedar: () => void;
  cedarBusy: boolean;
  cedarAnswer: string | null;
  cedarAvailable: boolean;
}) {
  if (!open) return null;

  // Keep paragraph formatting for the answer
  const paragraphAnswer =
    (cedarAnswer || "")
      .replace(/^\s*[-•]\s*/gm, "")
      .replace(/\n{2,}/g, "\n")
      .replace(/\n/g, " ")
      .replace(/\s\s+/g, " ")
      .trim();

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-full sm:w-[440px] bg-white shadow-2xl flex flex-col">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500">Evidence for</div>
            <div className="text-sm font-semibold text-gray-900 line-clamp-2">{selectedText}</div>
          </div>
          <button onClick={onClose} className="p-2 rounded hover:bg-gray-100" aria-label="Close">
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        <div className="p-4 space-y-5 overflow-y-auto">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-600">Ask for a quick rationale</div>
            <button
              onClick={onAskCedar}
              disabled={!cedarAvailable || cedarBusy}
              className={`inline-flex items-center justify-center px-2.5 py-1.5 rounded text-xs ${cedarAvailable ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-200 text-gray-500 cursor-not-allowed"
                }`}
              title={cedarAvailable ? "Ask Copilot" : "AI not initialized"}
            >
              <Sparkles className="h-4 w-4" />
            </button>
          </div>

          {cedarAnswer && (
            <div className="rounded border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
              {paragraphAnswer}
            </div>
          )}

          <div>
            <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-2 font-semibold">EMR References</div>
            {emrHits.length === 0 ? (
              <div className="text-sm text-gray-700">No obvious EMR references.</div>
            ) : (
              <ul className="space-y-2">
                {emrHits.map((e, i) => (
                  <li
                    key={i}
                    className="text-sm bg-white border border-gray-200 rounded-lg p-3 flex items-start gap-3"
                  >
                    <div className="h-5 w-5 mt-0.5 flex-shrink-0 rounded bg-amber-100 text-amber-700 flex items-center justify-center">
                      <FileText className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-mono text-gray-700 truncate">{e.path}</div>
                      <div className="mt-1 text-gray-900">{e.value}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

/** ---------- MAIN PAGE ---------- */
export default function DoctorDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const processedCompleted = useRef<Set<string>>(new Set());

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
      id: "2", // Michael completes intake in your demo
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

  // patientId -> reportId
  const [reportMap, setReportMap] = useState<Record<string, string>>({});

  // Report modal state
  const [openReport, setOpenReport] = useState<ReportPayload | null>(null);
  const [tab, setTab] = useState<"summary" | "emr" | "graph">("summary");

  // Drawer + AI state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [emrHits, setEmrHits] = useState<{ path: string; value: string }[]>([]);
  const [cedarAnswer, setCedarAnswer] = useState<string | null>(null);
  const [cedarBusy, setCedarBusy] = useState(false);

  // Cedar store (kept for context publishing, optional)
  const cedarStore: any = useCedarStore();
  const cedarAvailable = true; // Button enabled (OpenAI route used under the hood)

  // Publish selected text & emr slice (Cedar context)
  useRegisterState({ key: "selectedText", value: selectedText, description: "Doctor-selected EMR insight text" });
  const emrSlice = useMemo(() => openReport?.emr_tab || {}, [openReport]);
  useRegisterState({ key: "emrData", value: emrSlice, description: "Report EMR data for context" });

  const completedParam = searchParams.get("intake");
  const completedPatientId = searchParams.get("patientId");
  const reportIdFromQuery = searchParams.get("reportId");

  // Load reports from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const map: Record<string, { reportId: string; createdAt: number }> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) || "";
      if (!key.startsWith("report:")) continue;
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const data = JSON.parse(raw) as ReportPayload;
        if (!data.patientId || !data.reportId) continue;
        const ts = Date.parse(data.createdAt || "") || 0;
        if (!map[data.patientId] || ts > map[data.patientId].createdAt) {
          map[data.patientId] = { reportId: data.reportId, createdAt: ts };
        }
      } catch { }
    }
    if (Object.keys(map).length > 0) {
      setReportMap(Object.fromEntries(Object.entries(map).map(([pid, v]) => [pid, v.reportId])));
    }
  }, []);

  // Handle redirect after intake completion
  useEffect(() => {
    if (completedParam === "completed" && completedPatientId && !processedCompleted.current.has(completedPatientId)) {
      const p = patients.find((x) => x.id === completedPatientId);
      if (p) {
        processedCompleted.current.add(completedPatientId);

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
            id: makeId(),
            message: `${p.name} completed pre-appointment intake`,
            timestamp: new Date().toISOString(),
            type: "completed",
            patientId: p.id,
          },
          ...prev,
        ]);
      }
    }
  }, [completedParam, completedPatientId, reportIdFromQuery, patients]);

  const sendIntakeRequest = async (patientId: string) => {
    try {
      const patient = patients.find((p) => p.id === patientId);
      await new Promise((r) => setTimeout(r, 600));
      setPatients((prev) =>
        prev.map((p) => (p.id === patientId ? { ...p, status: "pending" } : p))
      );

      if (patient) {
        setNotifications((prev) => [
          {
            id: makeId(),
            message: `Intake request sent to ${patient.name}`,
            timestamp: new Date().toISOString(),
            type: "sent",
            patientId,
          },
          ...prev,
        ]);
        router.push(`/patient?pid=${encodeURIComponent(patient.id)}&name=${encodeURIComponent(patient.name)}`);
      } else {
        router.push(`/patient?pid=${encodeURIComponent(patientId)}`);
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

  function loadReport(reportId: string): ReportPayload | null {
    try {
      const raw = localStorage.getItem(`report:${reportId}`);
      return raw ? (JSON.parse(raw) as ReportPayload) : null;
    } catch {
      return null;
    }
  }

  function openExplainFor(text: string) {
    if (!openReport) return;
    setSelectedText(text);
    setCedarAnswer(null);
    setEmrHits(findEmrEvidence(openReport.emr_tab, text));
    setDrawerOpen(true);
  }

  async function onAskCedar() {
    if (!openReport) return;
    setCedarBusy(true);
    try {
      const { answer } = await explainInsightWithLLM(selectedText, emrHits);
      setCedarAnswer(answer);
    } catch {
      setCedarAnswer("Sorry—couldn’t generate an explanation right now.");
    } finally {
      setCedarBusy(false);
    }
  }

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
                const reportId = reportMap[patient.id];
                return (
                  <div
                    key={patient.id}
                    className={`p-6 hover:bg-gray-50 transition-colors ${isHighlighted ? "bg-green-50" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center flex-wrap gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900">{patient.name}</h3>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(patient.status)}
                            <span className="text-sm text-gray-700">{getStatusText(patient.status)}</span>
                          </div>

                          {patient.status === "completed" && reportId && (
                            <button
                              onClick={() => {
                                const rep = loadReport(reportId);
                                if (rep) {
                                  setOpenReport(rep);
                                  setTab("summary");
                                } else {
                                  alert("Report not found. Please try again.");
                                }
                              }}
                              className="inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
                              aria-label={`View report for ${patient.name}`}
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              View Report
                            </button>
                          )}

                          {patient.status === "completed" && !reportId && (
                            <button
                              type="button"
                              disabled
                              className="inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-medium bg-gray-200 text-gray-500 cursor-not-allowed"
                              aria-disabled
                              title="Report not available yet"
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              View Report
                            </button>
                          )}

                          {isHighlighted && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Intake completed
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-700 space-y-1">
                          <p><span className="font-semibold">Age:</span> {patient.age}</p>
                          <p><span className="font-semibold">Appointment:</span> {new Date(patient.appointmentDate).toLocaleString()}</p>
                          {patient.chiefComplaint && (
                            <p className="text-blue-700">
                              <span className="font-semibold">Chief Complaint:</span> {patient.chiefComplaint}
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
                            className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                          >
                            <Send className="h-4 w-4 mr-1" />
                            Send Intake
                          </button>
                        )}
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
                        <p className="text-xs text-gray-500">{new Date(n.timestamp).toLocaleString()}</p>
                        <div
                          className={`inline-block px-2 py-1 rounded-full text-xs mt-2 ${n.type === "completed"
                            ? "bg-green-100 text-green-800"
                            : "bg-blue-100 text-blue-800"
                            }`}
                        >
                          {n.type === "completed" ? "Completed" : "Sent"}
                        </div>
                      </div>

                      {n.type === "completed" && patient?.status === "completed" && reportId && (
                        <button
                          onClick={() => {
                            const rep = loadReport(reportId);
                            if (rep) {
                              setOpenReport(rep);
                              setTab("summary");
                            } else {
                              alert("Report not found. Please try again.");
                            }
                          }}
                          className="inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          View Report
                        </button>
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

      {/* Report Modal */}
      {openReport && (
        <>
          <div className="fixed inset-0 z-40 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setOpenReport(null)} />
            <div className="relative z-50 w-full max-w-4xl bg-white rounded-2xl shadow-2xl">
              <div className="flex items-center justify-between px-6 py-5 border-b">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 tracking-tight">
                    Report — {openReport.patientName || "Patient"}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Created {new Date(openReport.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => setOpenReport(null)}
                  className="p-2 rounded-lg hover:bg-gray-100"
                  aria-label="Close"
                >
                  <X className="h-5 w-5 text-gray-600" />
                </button>
              </div>

              {/* Tabs */}
              <div className="px-6 pt-3 flex items-center gap-2">
                <button
                  onClick={() => setTab("summary")}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold ${tab === "summary" ? "bg-blue-600 text-white" : "text-gray-800 hover:bg-gray-100"
                    }`}
                >
                  Summary
                </button>
                <button
                  onClick={() => setTab("emr")}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold ${tab === "emr" ? "bg-blue-600 text-white" : "text-gray-800 hover:bg-gray-100"
                    }`}
                >
                  EMR Insights
                </button>
                <button
                  onClick={() => setTab("graph")}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold ${tab === "graph" ? "bg-blue-600 text-white" : "text-gray-800 hover:bg-gray-100"
                    }`}
                >
                  Graph
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6 max-h-[72vh] overflow-y-auto">
                {tab === "summary" && (
                  <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="px-6 py-4 border-b border-gray-100">
                      <h3 className="text-base font-bold text-gray-900">Visit Focus</h3>
                      <p className="text-xs text-gray-600 mt-1">
                        Fast, scannable overview of today’s visit (AI-assisted).
                      </p>
                    </div>
                    <div className="p-6 space-y-5 text-sm text-gray-900">
                      {(() => {
                        const sum = openReport.insights_report || {};
                        const vf = sum.visit_focus || {};
                        const assoc = (vf.associated || {}) as { positives?: string[]; negatives?: string[] };

                        return (
                          <>
                            <div>
                              <span className="font-semibold">Chief Complaint:</span>{" "}
                              <span className="text-gray-800">{vf.chief_complaint || "Not stated"}</span>
                            </div>

                            {sum.concise_summary && (
                              <div className="rounded-lg bg-gray-100 border border-gray-200 p-4">
                                <div className="text-[12px] uppercase tracking-wide text-gray-600 font-semibold mb-1">
                                  Concise Summary
                                </div>
                                <div className="text-gray-900">{sum.concise_summary}</div>
                              </div>
                            )}

                            <div>
                              <span className="font-semibold">Onset / Duration / Severity:</span>{" "}
                              <span className="text-gray-800">{vf.onset_duration_severity || "Not stated"}</span>
                            </div>

                            {(assoc.positives?.length || assoc.negatives?.length) && (
                              <div className="grid sm:grid-cols-2 gap-6">
                                <div>
                                  <div className="text-[12px] uppercase tracking-wide text-gray-600 font-semibold mb-1">Associated ( + )</div>
                                  <ul className="list-disc pl-5 space-y-1 text-gray-900">
                                    {(assoc.positives || []).map((s, i) => (
                                      <li key={i}>{s}</li>
                                    ))}
                                  </ul>
                                </div>
                                <div>
                                  <div className="text-[12px] uppercase tracking-wide text-gray-600 font-semibold mb-1">Associated ( − )</div>
                                  <ul className="list-disc pl-5 space-y-1 text-gray-900">
                                    {(assoc.negatives || []).map((s, i) => (
                                      <li key={i}>{s}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            )}

                            {Array.isArray(sum.quick_checks) && sum.quick_checks.length > 0 && (
                              <div>
                                <div className="text-[12px] uppercase tracking-wide text-gray-600 font-semibold mb-1">Today’s Quick Checks</div>
                                <ul className="list-disc pl-5 space-y-1 text-gray-900">
                                  {sum.quick_checks.map((s: string, i: number) => (
                                    <li key={i}>{s}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {Array.isArray(sum.next_best_actions) && sum.next_best_actions.length > 0 && (
                              <div>
                                <div className="text-[12px] uppercase tracking-wide text-gray-600 font-semibold mb-1">Next Best Actions</div>
                                <ul className="list-disc pl-5 space-y-1 text-gray-900">
                                  {sum.next_best_actions.map((s: string, i: number) => (
                                    <li key={i}>{s}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {tab === "emr" && (
                  <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="px-6 py-4 border-b border-gray-100">
                      <h3 className="text-base font-bold text-gray-900">EMR Insights</h3>
                      <p className="text-xs text-gray-600 mt-1">
                        AI-powered insights based on the patient’s EMR and conversation.
                      </p>
                    </div>
                    <div className="p-6 space-y-6 text-sm text-gray-900">
                      {(() => {
                        const emr = openReport.emr_tab || {};
                        const rh = emr.relevant_history || {};

                        const iconOnlyAsk = (text: string, i: number) => (
                          <li key={i} className="flex items-start justify-between gap-3">
                            <span className="pr-2">{text}</span>
                            <button
                              className="inline-flex items-center justify-center w-7 h-7 rounded bg-blue-50 text-blue-700 hover:bg-blue-100"
                              onClick={() => openExplainFor(text)}
                              title="Ask Copilot"
                              aria-label="Ask Copilot"
                            >
                              <Sparkles className="h-4 w-4" />
                            </button>
                          </li>
                        );

                        return (
                          <>
                            {emr.risk_flags?.length > 0 && (
                              <div>
                                <div className="text-[12px] uppercase tracking-wide text-gray-600 font-semibold mb-1">Risk Flags</div>
                                <ul className="list-disc pl-5 space-y-2">
                                  {emr.risk_flags.map(iconOnlyAsk)}
                                </ul>
                              </div>
                            )}

                            {emr.trend_insights?.length > 0 && (
                              <div>
                                <div className="text-[12px] uppercase tracking-wide text-gray-600 font-semibold mb-1">Trend Insights</div>
                                <ul className="list-disc pl-5 space-y-2">
                                  {emr.trend_insights.map(iconOnlyAsk)}
                                </ul>
                              </div>
                            )}

                            {emr.care_gaps?.length > 0 && (
                              <div>
                                <div className="text-[12px] uppercase tracking-wide text-gray-600 font-semibold mb-1">Care Gaps</div>
                                <ul className="list-disc pl-5 space-y-2">
                                  {emr.care_gaps.map(iconOnlyAsk)}
                                </ul>
                              </div>
                            )}

                            {(rh.conditions?.length || rh.meds?.length || rh.allergies_alerts?.length) && (
                              <div className="grid sm:grid-cols-3 gap-4 pt-2">
                                <div>
                                  <div className="text-[12px] uppercase tracking-wide text-gray-600 font-semibold mb-1">Conditions</div>
                                  <ul className="list-disc pl-5 space-y-1">
                                    {(rh.conditions || []).map((c: any, i: number) => {
                                      const t = `${c.name} — ${c.status}`;
                                      return <li key={i}>{t}</li>;
                                    })}
                                  </ul>
                                </div>
                                <div>
                                  <div className="text-[12px] uppercase tracking-wide text-gray-600 font-semibold mb-1">Meds (relevant)</div>
                                  <ul className="list-disc pl-5 space-y-1">
                                    {(rh.meds || []).map((m: any, i: number) => {
                                      const t = `${m.name} — ${m.purpose}`;
                                      return <li key={i}>{t}</li>;
                                    })}
                                  </ul>
                                </div>
                                <div>
                                  <div className="text-[12px] uppercase tracking-wide text-gray-600 font-semibold mb-1">Allergies / Alerts</div>
                                  <ul className="list-disc pl-5 space-y-1">
                                    {(rh.allergies_alerts || []).map((a: string, i: number) => (
                                      <li key={i}>{a}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {tab === "graph" && (
                  <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="px-5 py-4 border-b border-gray-100">
                      <h3 className="text-sm font-semibold text-gray-900">Annotated Graph</h3>
                    </div>
                    <div className="p-5 h-[500px]"> {/* fixed height for Cytoscape */}
                      {openReport.annotated_graph ? (
                        <>
                          {/* Legend */}
                          <div className="mb-4 flex gap-4 flex-wrap">
                            {Object.entries(typeColors).map(([type, color]) => (
                              <div key={type} className="flex items-center gap-2">
                                <span
                                  className="w-4 h-4 rounded-full"
                                  style={{ backgroundColor: color }}
                                />
                                <span className="text-sm capitalize"
                                  style={{ color: "#000000" }}>{type}</span>
                              </div>
                            ))}
                          </div>
                          {/* Graph */}
                          <KnowledgeGraph
                            nodes={openReport.annotated_graph.nodes || []}
                            edges={openReport.annotated_graph.edges || []}
                          />
                        </>
                      ) : (
                        <p className="text-sm text-gray-500">No graph provided.</p>
                      )}
                    </div>
                  </div>
                )}

                <details className="mt-1">
                  <summary className="text-sm font-semibold text-gray-800 cursor-pointer">
                    Show Conversation Transcript
                  </summary>
                  <pre className="mt-3 text-sm bg-white border border-gray-200 p-4 rounded-lg overflow-auto max-h-56 text-gray-900">
                    {openReport.transcript || "No transcript captured."}
                  </pre>
                </details>
              </div>
            </div>
          </div>

          {/* Evidence drawer */}
          <EvidenceDrawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            selectedText={selectedText}
            emrHits={emrHits}
            onAskCedar={onAskCedar}
            cedarBusy={cedarBusy}
            cedarAnswer={cedarAnswer}
            cedarAvailable={cedarAvailable}
          />
        </>
      )}
    </div>
  );
}
