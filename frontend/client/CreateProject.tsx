import React, { useState } from "react";
import { useNavigate } from "react-router";
import {
  FileText, Package, Calendar, Code, DollarSign,
  MessageSquare, ChevronRight, ChevronLeft, CheckCircle,
  Loader, AlertCircle, Plus, X
} from "lucide-react";
import { useApp } from "../AppContext";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FormData {
  title:               string;
  summary:             string;
  objectives:          string;
  scope:               string;
  deliverables:        string[];
  startDate:           string;
  endDate:             string;
  milestones:          string[];
  skills:              string[];
  experienceLevel:     string;
  budget:              string;
  paymentType:         string;
  location:            string;
  availability:        string;
  communicationMethod: string;
  additionalNotes:     string;
}

type SubmitState = "idle" | "loading" | "success" | "error";

// ── Step config ───────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Core Details",   icon: FileText,      description: "Title, summary & objectives"        },
  { id: 2, label: "Scope & Assets", icon: Package,       description: "Deliverables & project scope"       },
  { id: 3, label: "Timeline",       icon: Calendar,      description: "Dates & milestones"                 },
  { id: 4, label: "Tech & Skills",  icon: Code,          description: "Required skills & experience"       },
  { id: 5, label: "Financials",     icon: DollarSign,    description: "Budget & payment structure"         },
  { id: 6, label: "Communication",  icon: MessageSquare, description: "Availability & contact preferences" },
];

const EMPTY_FORM: FormData = {
  title: "", summary: "", objectives: "",
  scope: "", deliverables: [],
  startDate: "", endDate: "", milestones: [],
  skills: [], experienceLevel: "Intermediate",
  budget: "", paymentType: "Fixed Price", location: "",
  availability: "", communicationMethod: "Email", additionalNotes: "",
};

// ── Shared styles ─────────────────────────────────────────────────────────────

const inputCls = "w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white transition-all";
const labelCls = "block text-sm font-semibold text-gray-700 mb-1.5";
const hintCls  = "text-xs text-gray-400 mt-1";

// ── Tag input ─────────────────────────────────────────────────────────────────

function TagInput({ label, hint, values, onChange, placeholder }: {
  label: string; hint?: string; values: string[];
  onChange: (v: string[]) => void; placeholder: string;
}) {
  const [input, setInput] = useState("");

  const add = () => {
    const val = input.trim();
    if (val && !values.includes(val)) onChange([...values, val]);
    setInput("");
  };

  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          className={inputCls + " flex-1"}
        />
        <button type="button" onClick={add}
          className="px-4 py-3 bg-emerald-600 text-white rounded-xl text-sm hover:bg-emerald-700 transition-colors">
          <Plus size={16} />
        </button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {values.map(v => (
            <span key={v} className="flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1 rounded-full text-xs font-medium">
              {v}
              <button type="button" onClick={() => onChange(values.filter(x => x !== v))}
                className="hover:text-red-500 transition-colors ml-0.5">
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
      {hint && <p className={hintCls}>{hint}</p>}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function ClientCreateProject() {
  const { user } = useApp();
  const navigate = useNavigate();

  const [step, setStep]               = useState(1);
  const [form, setForm]               = useState<FormData>(EMPTY_FORM);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [errorMsg, setErrorMsg]       = useState("");

  const set = (field: keyof FormData, value: any) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const validateStep = (): string | null => {
    if (step === 1) {
      if (!form.title.trim())   return "Project title is required.";
      if (!form.summary.trim()) return "Project summary is required.";
    }
    if (step === 5) {
      if (!form.budget || isNaN(Number(form.budget)) || Number(form.budget) <= 0)
        return "Please enter a valid budget.";
    }
    return null;
  };

  const handleNext = () => {
    const err = validateStep();
    if (err) { setErrorMsg(err); return; }
    setErrorMsg("");
    setStep(s => Math.min(s + 1, STEPS.length));
  };

  const handleBack = () => { setErrorMsg(""); setStep(s => Math.max(s - 1, 1)); };

  const handleSubmit = async () => {
    const err = validateStep();
    if (err) { setErrorMsg(err); return; }
    setSubmitState("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/client/create-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId:            user?.id,
          title:               form.title,
          description:         form.summary,
          objectives:          form.objectives,
          scope:               form.scope,
          deliverables:        form.deliverables,
          skills:              form.skills,
          experienceLevel:     form.experienceLevel,
          budget:              Number(form.budget),
          paymentType:         form.paymentType,
          location:            form.location,
          startDate:           form.startDate,
          endDate:             form.endDate,
          milestones:          form.milestones.map(m => ({ title: m, completed: false })),
          availability:        form.availability,
          communicationMethod: form.communicationMethod,
          additionalNotes:     form.additionalNotes,
        }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      setSubmitState("success");
      setTimeout(() => navigate("/client/projects"), 2000);
    } catch (err: any) {
      setErrorMsg(err.message ?? "Something went wrong.");
      setSubmitState("error");
    }
  };

  // ── Success ───────────────────────────────────────────────────────────────

  if (submitState === "success") {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[500px] gap-4">
        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center">
          <CheckCircle size={40} className="text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Project Posted!</h2>
        <p className="text-gray-500 text-sm">Your project is now live in the Marketplace.</p>
        <p className="text-gray-400 text-xs">Redirecting to My Projects...</p>
      </div>
    );
  }

  const currentStep = STEPS[step - 1];
  const StepIcon    = currentStep.icon;
  const progress    = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="p-6 max-w-3xl">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl font-bold text-gray-900">Post a New Project</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Complete all {STEPS.length} steps to submit your project to the marketplace.
        </p>
      </div>

      {/* Step tabs */}
      <div className="mb-6 overflow-x-auto pb-1">
        <div className="flex gap-1.5 min-w-max">
          {STEPS.map(s => {
            const Icon        = s.icon;
            const isActive    = s.id === step;
            const isCompleted = s.id < step;
            return (
              <button key={s.id}
                onClick={() => isCompleted && setStep(s.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  isActive    ? "bg-emerald-600 text-white shadow-sm" :
                  isCompleted ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer" :
                                "bg-gray-100 text-gray-400 cursor-default"
                }`}
              >
                {isCompleted ? <CheckCircle size={13} /> : <Icon size={13} />}
                {s.label}
              </button>
            );
          })}
        </div>
        <div className="mt-3 h-1 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Form card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">

        {/* Step header */}
        <div className="flex items-center gap-3 mb-6 pb-5 border-b border-gray-50">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0">
            <StepIcon size={20} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider">
              Step {step} of {STEPS.length}
            </p>
            <h2 className="text-base font-bold text-gray-900">{currentStep.label}</h2>
            <p className="text-xs text-gray-400">{currentStep.description}</p>
          </div>
        </div>

        {/* Step 1 — Core Details */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <label className={labelCls}>Project Title <span className="text-red-400">*</span></label>
              <input value={form.title} onChange={e => set("title", e.target.value)}
                placeholder="e.g. E-commerce Website Redesign" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Project Summary <span className="text-red-400">*</span></label>
              <textarea value={form.summary} onChange={e => set("summary", e.target.value)}
                rows={3} placeholder="Briefly describe what you need done in 2–4 sentences..."
                className={inputCls + " resize-none"} />
              <p className={hintCls}>This is what freelancers see first in the Marketplace.</p>
            </div>
            <div>
              <label className={labelCls}>Objectives & Goals</label>
              <textarea value={form.objectives} onChange={e => set("objectives", e.target.value)}
                rows={3} placeholder="What specific outcomes are you aiming for? Include measurable goals if possible..."
                className={inputCls + " resize-none"} />
            </div>
          </div>
        )}

        {/* Step 2 — Scope & Assets */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <label className={labelCls}>Project Scope</label>
              <textarea value={form.scope} onChange={e => set("scope", e.target.value)}
                rows={4} placeholder="Describe the full scope of work. What is included? What is out of scope?"
                className={inputCls + " resize-none"} />
            </div>
            <TagInput label="Deliverables"
              hint='Press Enter or + to add. e.g. "Figma mockups", "REST API", "Documentation"'
              values={form.deliverables} onChange={v => set("deliverables", v)}
              placeholder="Add a deliverable..." />
          </div>
        )}

        {/* Step 3 — Timeline */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Start Date</label>
                <input type="date" value={form.startDate}
                  onChange={e => set("startDate", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Deadline</label>
                <input type="date" value={form.endDate}
                  onChange={e => set("endDate", e.target.value)} className={inputCls} />
              </div>
            </div>
            <TagInput label="Key Milestones"
              hint='e.g. "Week 1: Wireframes complete", "Week 3: Backend API ready"'
              values={form.milestones} onChange={v => set("milestones", v)}
              placeholder="Add a milestone..." />
          </div>
        )}

        {/* Step 4 — Tech & Skills */}
        {step === 4 && (
          <div className="space-y-5">
            <TagInput label="Required Skills"
              hint='e.g. "React", "Java", "MongoDB", "Figma"'
              values={form.skills} onChange={v => set("skills", v)}
              placeholder="Add a skill..." />
            <div>
              <label className={labelCls}>Experience Level Required</label>
              <div className="grid grid-cols-3 gap-3 mt-1">
                {["Junior", "Intermediate", "Senior"].map(level => (
                  <button key={level} type="button" onClick={() => set("experienceLevel", level)}
                    className={`py-3 rounded-xl border text-sm font-semibold transition-all ${
                      form.experienceLevel === level
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white text-gray-600 border-gray-200 hover:border-emerald-300"
                    }`}>
                    {level}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 5 — Financials */}
        {step === 5 && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Budget (USD) <span className="text-red-400">*</span></label>
                <input type="number" min="0" value={form.budget}
                  onChange={e => set("budget", e.target.value)}
                  placeholder="e.g. 2500" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Location / Remote</label>
                <input value={form.location} onChange={e => set("location", e.target.value)}
                  placeholder="e.g. Remote, New York" className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Payment Structure</label>
              <div className="grid grid-cols-3 gap-3 mt-1">
                {["Fixed Price", "Hourly Rate", "Milestone-based"].map(type => (
                  <button key={type} type="button" onClick={() => set("paymentType", type)}
                    className={`py-3 rounded-xl border text-xs font-semibold transition-all ${
                      form.paymentType === type
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white text-gray-600 border-gray-200 hover:border-emerald-300"
                    }`}>
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 6 — Communication */}
        {step === 6 && (
          <div className="space-y-5">
            <div>
              <label className={labelCls}>Your Availability</label>
              <input value={form.availability} onChange={e => set("availability", e.target.value)}
                placeholder="e.g. Weekdays 9am–5pm EST, available for weekly check-ins"
                className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Preferred Communication Method</label>
              <div className="grid grid-cols-3 gap-3 mt-1">
                {["Email", "Slack", "Video Call"].map(method => (
                  <button key={method} type="button" onClick={() => set("communicationMethod", method)}
                    className={`py-3 rounded-xl border text-sm font-semibold transition-all ${
                      form.communicationMethod === method
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white text-gray-600 border-gray-200 hover:border-emerald-300"
                    }`}>
                    {method}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelCls}>Additional Notes</label>
              <textarea value={form.additionalNotes}
                onChange={e => set("additionalNotes", e.target.value)}
                rows={3} placeholder="Anything else freelancers should know before bidding..."
                className={inputCls + " resize-none"} />
            </div>
          </div>
        )}

        {/* Error */}
        {errorMsg && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-100 text-red-700 rounded-xl p-3 text-sm mt-5">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <p>{errorMsg}</p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8 pt-5 border-t border-gray-50">
          <button type="button" onClick={handleBack} disabled={step === 1}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            <ChevronLeft size={16} /> Back
          </button>

          {step < STEPS.length ? (
            <button type="button" onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors">
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <button type="button" onClick={handleSubmit} disabled={submitState === "loading"}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
              {submitState === "loading"
                ? <><Loader size={15} className="animate-spin" /> Posting...</>
                : <><CheckCircle size={15} /> Post Project</>
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
