"use client";

import React from "react";
import { Mic, MicOff, AlertCircle } from "lucide-react";

interface VoicePermissionHelperProps {
  permissionStatus: string;
  onRequestPermission: () => void;
}

export function VoicePermissionHelper({
  permissionStatus,
  onRequestPermission
}: VoicePermissionHelperProps) {
  if (permissionStatus === "granted") {
    return null; // Don't show if permission is granted
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
      <div className="flex items-start space-x-3">
        <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-yellow-800 mb-2">
            Microphone Access Required
          </h3>
          <p className="text-sm text-yellow-700 mb-3">
            {permissionStatus === "denied"
              ? "Microphone access has been denied. Please enable it in your browser settings to use voice features."
              : "This application needs access to your microphone to record your voice for the intake conversation."
            }
          </p>
          {permissionStatus === "prompt" && (
            <button
              onClick={onRequestPermission}
              className="flex items-center px-3 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors text-sm"
            >
              <Mic className="h-4 w-4 mr-2" />
              Enable Microphone
            </button>
          )}
          {permissionStatus === "denied" && (
            <div className="text-xs text-yellow-600">
              <p className="mb-1">To enable microphone access:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Click the lock/info icon in your address bar</li>
                <li>Set microphone permission to "Allow"</li>
                <li>Refresh this page</li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
