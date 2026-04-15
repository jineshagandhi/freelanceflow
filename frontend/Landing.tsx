import React from "react";
import { useNavigate } from "react-router";
import { Zap, Shield, BarChart2, Lock, ArrowRight, CheckCircle } from "lucide-react";

export function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg">
            <Zap size={18} fill="currentColor" />
          </div>
          <span className="text-xl font-bold tracking-tight text-gray-900">FreelanceFlow</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/auth?mode=login")} className="text-sm font-semibold text-gray-600 hover:text-gray-900">Sign In</button>
          <button onClick={() => navigate("/auth?mode=signup")} className="px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-all">Join Now</button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <span className="px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold uppercase tracking-widest mb-6 inline-block">
            Powered by Java Analytics Engine
          </span>
          <h1 className="text-5xl md:text-6xl font-black text-gray-900 mb-8 leading-[1.1]">
            Smart Freelancing for <span className="text-indigo-600">Modern Teams.</span>
          </h1>
          <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            Experience the first project management portal using rule-based Java logic to calculate client reliability and predict project risks.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={() => navigate("/auth?role=freelancer")}
              className="w-full sm:w-auto px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2"
            >
              Start Freelancing <ArrowRight size={18} />
            </button>
            <button 
              onClick={() => navigate("/auth?role=client")}
              className="w-full sm:w-auto px-8 py-4 bg-white text-gray-900 border-2 border-gray-100 rounded-2xl font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
            >
              Hire Talent
            </button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { 
                icon: BarChart2, 
                title: "Reliability Scoring", 
                desc: "Our Java backend analyzes payment history to generate 0-100 reliability scores for every client.",
                color: "text-indigo-600 bg-indigo-100"
              },
              { 
                icon: Shield, 
                title: "Risk Prediction", 
                desc: "Advanced rule-based logic identifies high-risk projects before you even place a bid.",
                color: "text-emerald-600 bg-emerald-100"
              },
              { 
                icon: Lock, 
                title: "Secure Portals", 
                desc: "Enterprise-grade authentication ensures freelancers and clients have separate, secure workspaces.",
                color: "text-amber-600 bg-amber-100"
              }
            ].map((f, i) => (
              <div key={i} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                <div className={`w-12 h-12 rounded-2xl ${f.color} flex items-center justify-center mb-6`}>
                  <f.icon size={24} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}