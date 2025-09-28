import Link from "next/link";
import { Stethoscope, Users, Mic } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <Stethoscope className="h-16 w-16 text-blue-600" />
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">PreVizAI</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            AI-powered pre-appointment patient intake system. Streamline healthcare
            communication between patients and doctors.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
          <Link href="/doctor" className="group">
            <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-blue-200">
              <div className="flex flex-col items-center text-center">
                <div className="bg-blue-100 p-4 rounded-full mb-4 group-hover:bg-blue-200 transition-colors">
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-3">
                  Doctor Dashboard
                </h2>
                <p className="text-gray-600 mb-4">
                  Review patient intake reports, send pre-appointment tasks, and
                  manage notifications.
                </p>
                <span className="text-blue-600 font-medium group-hover:text-blue-700">
                  Access Dashboard →
                </span>
              </div>
            </div>
          </Link>

          <Link href="/patient" className="group">
            <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-green-200">
              <div className="flex flex-col items-center text-center">
                <div className="bg-green-100 p-4 rounded-full mb-4 group-hover:bg-green-200 transition-colors">
                  <Mic className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-3">
                  Patient Intake
                </h2>
                <p className="text-gray-600 mb-4">
                  Complete your pre-appointment intake using voice-powered AI
                  conversation.
                </p>
                <span className="text-green-600 font-medium group-hover:text-green-700">
                  Start Intake →
                </span>
              </div>
            </div>
          </Link>
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-500 text-sm">
            Powered by Cedar OS and OpenAI for HackGT
          </p>
        </div>
      </div>
    </div>
  );
}
