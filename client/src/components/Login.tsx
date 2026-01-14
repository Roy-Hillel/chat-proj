import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Mail, AlertCircle, Clapperboard, Popcorn } from "lucide-react";

export function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email);
    } catch (err: any) {
      setError(err.message || "Oops... Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full mx-4">
        {/* Cinema marquee-style card */}
        <div className="bg-white rounded-xl shadow-lg p-8 border-t-4 border-amber-500">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="p-4 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl shadow-lg">
                <Clapperboard className="w-10 h-10 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 p-1.5 bg-red-500 rounded-full shadow-md">
                <Popcorn className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
            Welcome to MovieMate
          </h2>
          <p className="text-sm text-gray-500 text-center mb-8">
            Your personal movie companion
          </p>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email Address
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                required
                className="focus:ring-amber-500 focus:border-amber-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-lg h-11 border"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 transition-all"
          >
            {loading ? "Signing in..." : "Start Watching 🎬"}
          </button>
        </form>
        </div>
        
        {/* Film strip decoration at bottom */}
        <div className="flex justify-center mt-6 opacity-20">
          <div className="flex gap-1">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="w-2 h-3 bg-gray-400 rounded-sm"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
