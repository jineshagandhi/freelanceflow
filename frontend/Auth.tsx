import React, { useState } from "react";
import { useNavigate } from "react-router";
import { Zap, Eye, EyeOff, ArrowLeft, ChevronLeft, Plus, X } from "lucide-react";
import { useApp, OrgRole } from "./AppContext";

type Role = "freelancer" | "client";
type Mode = "login" | "signup";

const inputCls = "w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm bg-white";
const labelCls = "block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2";

function TagInput({ values, onChange, placeholder }: {
  values: string[]; onChange: (v: string[]) => void; placeholder: string;
}) {
  const [input, setInput] = useState("");
  const add = () => {
    const v = input.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setInput("");
  };
  return (
    <div>
      <div className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder} className={inputCls + " flex-1"} />
        <button type="button" onClick={add}
          className="px-3 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors">
          <Plus size={15} />
        </button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {values.map(v => (
            <span key={v} className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full text-xs font-medium">
              {v}
              <button type="button" onClick={() => onChange(values.filter(x => x !== v))} className="hover:text-red-500 ml-0.5">
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function Auth() {
  const navigate = useNavigate();
  const { login } = useApp();

  const [tab,      setTab]      = useState<Role>("freelancer");
  const [mode,     setMode]     = useState<Mode>("login");
  const [step,     setStep]     = useState(1);
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });

  const [flForm, setFlForm] = useState({
    name: "", email: "", password: "",
    profession: "", education: "", location: "", contactInfo: "",
    skills: [] as string[],
  });

  const [clForm, setClForm] = useState({
    name: "", businessName: "", location: "",
    contactInfo: "", email: "", password: "",
    orgRole:        "team_leader" as OrgRole,
    teamLeaderName: "",   // only needed for project_manager
  });

  const switchTab  = (t: Role) => { setTab(t);  setStep(1); setErrorMsg(""); };
  const switchMode = (m: Mode) => { setMode(m); setStep(1); setErrorMsg(""); };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setErrorMsg("");
    try {
      const res  = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginForm.email, password: loginForm.password, role: tab }),
      });
      const data = await res.json();
      if (res.ok) {
        login(tab, data.email, data.name, data.id, data.orgRole ?? null, data.teamLeaderName ?? "");
        navigate(tab === "freelancer" ? "/freelancer/dashboard" : "/client/dashboard");
      } else {
        setErrorMsg(typeof data === "string" ? data : "Invalid email or password.");
      }
    } catch { setErrorMsg("Could not reach the server. Is Spring Boot running?"); }
    finally  { setLoading(false); }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tab === "freelancer" && step === 1) { setStep(2); return; }

    // Validate: project managers must enter a team leader name
    if (tab === "client" && clForm.orgRole === "project_manager" && !clForm.teamLeaderName.trim()) {
      setErrorMsg("Please enter your Team Leader's name to join their team.");
      return;
    }

    setLoading(true); setErrorMsg("");
    try {
      const payload = tab === "freelancer"
        ? { ...flForm, role: "freelancer" }
        : { ...clForm, role: "client" };

      const res  = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        const orgRole        = tab === "client" ? clForm.orgRole : null;
        const teamLeaderName = tab === "client" ? (data.teamLeaderName ?? "") : "";
        login(tab, data.email, data.name, data.id, orgRole, teamLeaderName);
        navigate(tab === "freelancer" ? "/freelancer/dashboard" : "/client/dashboard");
      } else {
        setErrorMsg(typeof data === "string" ? data : "Registration failed.");
      }
    } catch { setErrorMsg("Could not reach the server. Is Spring Boot running?"); }
    finally  { setLoading(false); }
  };

  const isFreelancer = tab === "freelancer";
  const btnCls = `w-full py-3.5 rounded-xl text-white font-bold text-sm transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none shadow-lg ${
    isFreelancer ? "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100" : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100"
  }`;

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className={`hidden lg:flex lg:w-5/12 flex-col justify-between p-10 ${isFreelancer ? "bg-[#0f172a]" : "bg-[#0a2e1a]"}`}>
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isFreelancer ? "bg-indigo-500" : "bg-emerald-500"}`}>
            <Zap size={16} className="text-white" />
          </div>
          <span className="text-white font-semibold text-sm">FreelanceFlow</span>
        </div>
        <div>
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${isFreelancer ? "bg-indigo-500/20" : "bg-emerald-500/20"}`}>
            <span className="text-3xl">{isFreelancer ? "📈" : "👥"}</span>
          </div>
          <h2 className="text-white text-3xl font-bold mb-3">
            {isFreelancer ? "Freelancer Portal" : "Client Portal"}
          </h2>
          <p className="text-white/50 text-sm leading-relaxed mb-8">
            {isFreelancer
              ? "Access your project marketplace, analytics, and intelligent bidding tools."
              : "Create projects, manage your team, track milestones, and handle payments."}
          </p>
          <ul className="space-y-3">
            {(isFreelancer
              ? ["Intelligent project marketplace", "Client risk analyzer", "Earnings & invoicing analytics", "Milestone-based payment tracking"]
              : ["Guided 6-step project wizard", "Team-based project visibility", "Role-based payment approvals", "Secure milestone tracking"]
            ).map(item => (
              <li key={item} className="flex items-center gap-3 text-white/70 text-sm">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isFreelancer ? "bg-indigo-400" : "bg-emerald-400"}`} />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-white/30 text-xs flex items-center gap-1.5">
          <span>🔒</span> Secured with JWT Authentication
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col justify-center px-6 py-10 bg-gray-50 overflow-y-auto">
        <div className="max-w-md w-full mx-auto">
          <button onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-8 transition-colors">
            <ArrowLeft size={15} /> Back to home
          </button>

          {/* Role toggle */}
          <div className="flex border border-gray-200 rounded-2xl p-1 bg-white mb-8 shadow-sm">
            {(["freelancer", "client"] as Role[]).map(r => (
              <button key={r} onClick={() => switchTab(r)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  tab === r
                    ? r === "freelancer" ? "bg-indigo-600 text-white shadow-sm" : "bg-emerald-600 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}>
                {r === "freelancer" ? "📈" : "👥"} {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-3xl shadow-xl shadow-gray-100 border border-gray-100 p-8">
            {mode === "signup" && tab === "freelancer" && step === 2 && (
              <button onClick={() => setStep(1)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-4 transition-colors">
                <ChevronLeft size={14} /> Back
              </button>
            )}

            <h2 className="text-2xl font-extrabold text-gray-900 mb-1">
              {mode === "login" ? "Welcome back" : step === 1 ? "Create account" : "Your profile"}
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              {mode === "login"
                ? `Sign in to your ${tab} account`
                : step === 1 ? "Fill in your details to get started" : "Tell clients about yourself"}
            </p>

            {/* LOGIN */}
            {mode === "login" && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className={labelCls}>Email Address</label>
                  <input type="email" required value={loginForm.email}
                    onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))}
                    placeholder={isFreelancer ? "alex@example.com" : "aria@company.com"}
                    className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Password</label>
                  <div className="relative">
                    <input type={showPass ? "text" : "password"} required value={loginForm.password}
                      onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="••••••••" className={inputCls + " pr-11"} />
                    <button type="button" onClick={() => setShowPass(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                {errorMsg && <p className="text-red-500 text-xs bg-red-50 rounded-lg px-3 py-2">{errorMsg}</p>}
                <button type="submit" disabled={loading} className={btnCls}>
                  {loading ? "Signing in..." : "Sign In"}
                </button>
              </form>
            )}

            {/* SIGNUP */}
            {mode === "signup" && (
              <form onSubmit={handleSignup} className="space-y-4">

                {/* Freelancer step 1 */}
                {tab === "freelancer" && step === 1 && (<>
                  <div>
                    <label className={labelCls}>Full Name</label>
                    <input required value={flForm.name} onChange={e => setFlForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="John Doe" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Email Address</label>
                    <input type="email" required value={flForm.email} onChange={e => setFlForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="john@example.com" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Password</label>
                    <div className="relative">
                      <input type={showPass ? "text" : "password"} required value={flForm.password}
                        onChange={e => setFlForm(f => ({ ...f, password: e.target.value }))}
                        placeholder="••••••••" className={inputCls + " pr-11"} />
                      <button type="button" onClick={() => setShowPass(s => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </>)}

                {/* Freelancer step 2 */}
                {tab === "freelancer" && step === 2 && (<>
                  <div>
                    <label className={labelCls}>Profession / Job Title</label>
                    <input value={flForm.profession} onChange={e => setFlForm(f => ({ ...f, profession: e.target.value }))}
                      placeholder="e.g. Full Stack Developer" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Education</label>
                    <input value={flForm.education} onChange={e => setFlForm(f => ({ ...f, education: e.target.value }))}
                      placeholder="e.g. BSc Computer Science, MIT" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Location</label>
                    <input value={flForm.location} onChange={e => setFlForm(f => ({ ...f, location: e.target.value }))}
                      placeholder="e.g. New York, USA" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Contact Info</label>
                    <input value={flForm.contactInfo} onChange={e => setFlForm(f => ({ ...f, contactInfo: e.target.value }))}
                      placeholder="e.g. Phone or LinkedIn URL" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Skills</label>
                    <TagInput values={flForm.skills} onChange={v => setFlForm(f => ({ ...f, skills: v }))}
                      placeholder="Add a skill (press Enter)..." />
                  </div>
                </>)}

                {/* Client signup */}
                {tab === "client" && (<>
                  <div>
                    <label className={labelCls}>Full Name</label>
                    <input required value={clForm.name} onChange={e => setClForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Aria Chen" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Organization / Business Name</label>
                    <input value={clForm.businessName} onChange={e => setClForm(f => ({ ...f, businessName: e.target.value }))}
                      placeholder="e.g. Acme Corp" className={inputCls} />
                  </div>

                  {/* Role selector */}
                  <div>
                    <label className={labelCls}>Role in Organization</label>
                    <div className="grid grid-cols-2 gap-3">
                      {([
                        { val: "team_leader",     label: "Team Leader",     desc: "Anchors the team · approves milestones & invoices" },
                        { val: "project_manager", label: "Project Manager", desc: "Joins a team · initiates payments" },
                      ] as { val: OrgRole; label: string; desc: string }[]).map(({ val, label, desc }) => (
                        <button key={val} type="button" onClick={() => setClForm(f => ({ ...f, orgRole: val, teamLeaderName: val === "team_leader" ? "" : f.teamLeaderName }))}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            clForm.orgRole === val
                              ? "bg-emerald-600 text-white border-emerald-600"
                              : "bg-white text-gray-700 border-gray-200 hover:border-emerald-300"
                          }`}>
                          <p className="text-xs font-bold">{label}</p>
                          <p className={`text-[10px] mt-0.5 leading-tight ${clForm.orgRole === val ? "text-white/70" : "text-gray-400"}`}>{desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Team Leader Name — only for project managers */}
                  {clForm.orgRole === "project_manager" && (
                    <div>
                      <label className={labelCls}>Team Leader's Name <span className="text-red-400">*</span></label>
                      <input value={clForm.teamLeaderName}
                        onChange={e => setClForm(f => ({ ...f, teamLeaderName: e.target.value }))}
                        placeholder="Enter your Team Leader's full name exactly"
                        className={inputCls} />
                      <p className="text-xs text-gray-400 mt-1">
                        Must match the name your Team Leader registered with. This links you to their team.
                      </p>
                    </div>
                  )}

                  <div>
                    <label className={labelCls}>Location</label>
                    <input value={clForm.location} onChange={e => setClForm(f => ({ ...f, location: e.target.value }))}
                      placeholder="e.g. San Francisco, USA" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Contact Info</label>
                    <input value={clForm.contactInfo} onChange={e => setClForm(f => ({ ...f, contactInfo: e.target.value }))}
                      placeholder="e.g. Phone or LinkedIn URL" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Email Address</label>
                    <input type="email" required value={clForm.email} onChange={e => setClForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="aria@company.com" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Password</label>
                    <div className="relative">
                      <input type={showPass ? "text" : "password"} required value={clForm.password}
                        onChange={e => setClForm(f => ({ ...f, password: e.target.value }))}
                        placeholder="••••••••" className={inputCls + " pr-11"} />
                      <button type="button" onClick={() => setShowPass(s => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </>)}

                {errorMsg && <p className="text-red-500 text-xs bg-red-50 rounded-lg px-3 py-2">{errorMsg}</p>}

                {tab === "freelancer" && (
                  <div className="flex justify-center gap-1.5">
                    {[1, 2].map(s => (
                      <div key={s} className={`h-1.5 rounded-full transition-all ${step === s ? "w-6 bg-indigo-500" : "w-3 bg-gray-200"}`} />
                    ))}
                  </div>
                )}

                <button type="submit" disabled={loading} className={btnCls}>
                  {loading ? "Creating account..." : tab === "freelancer" && step === 1 ? "Next →" : "Create Account"}
                </button>
              </form>
            )}

            <p className="text-center text-xs text-gray-400 mt-5">
              {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
              <button onClick={() => switchMode(mode === "login" ? "signup" : "login")}
                className={`font-semibold hover:underline ${isFreelancer ? "text-indigo-600" : "text-emerald-600"}`}>
                {mode === "login" ? "Sign up" : "Sign in"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
