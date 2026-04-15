import React, { useState, useEffect } from "react";
import { useApp } from "../AppContext";
import {
  Edit2, Save, X, Plus, AlertCircle, CheckCircle, Loader,
  MapPin, Briefcase, GraduationCap, Phone, User
} from "lucide-react";

interface Profile {
  id:          string;
  name:        string;
  email:       string;
  headline:    string;
  profession:  string;
  education:   string;
  location:    string;
  contactInfo: string;
  avatar:      string;
  skills:      string[];
}

const AVATAR_COLORS = [
  "bg-indigo-500", "bg-emerald-500", "bg-violet-500",
  "bg-pink-500",   "bg-amber-500",   "bg-sky-500",
];

const inputCls = "w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all bg-white";
const labelCls = "block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5";

export function FreelancerProfile() {
  const { user, login } = useApp();

  const [profile,   setProfile]   = useState<Profile | null>(null);
  const [editing,   setEditing]   = useState(false);
  const [draft,     setDraft]     = useState<Profile | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [success,   setSuccess]   = useState(false);
  const [skillInput, setSkillInput] = useState("");
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    fetch(`/api/freelancer/profile?id=${user.id}`)
      .then(r => { if (!r.ok) throw new Error(r.status.toString()); return r.json(); })
      .then(d => { setProfile(d); setLoading(false); })
      .catch(e => { setError("Failed to load profile: " + e.message); setLoading(false); });
  }, [user?.id]);

  const startEdit = () => {
    if (!profile) return;
    setDraft({ ...profile });
    setEditing(true);
    setSuccess(false);
  };

  const cancelEdit = () => { setEditing(false); setDraft(null); setError(null); };

  const setD = (field: keyof Profile, value: any) =>
    setDraft(prev => prev ? { ...prev, [field]: value } : prev);

  const addSkill = () => {
    const v = skillInput.trim();
    if (!v || !draft) return;
    if (!draft.skills.includes(v)) setD("skills", [...draft.skills, v]);
    setSkillInput("");
  };

  const removeSkill = (s: string) =>
    setD("skills", draft!.skills.filter(x => x !== s));

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/freelancer/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error(await res.text());
      setProfile({ ...draft });
      setEditing(false);
      setDraft(null);
      setSuccess(true);
      // Update the name in AppContext so sidebar reflects the change
      login("freelancer", draft.email, draft.name, draft.id);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: any) {
      setError("Failed to save: " + e.message);
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div className="p-6 flex items-center gap-3 text-gray-400 text-sm">
      <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      Loading profile...
    </div>
  );

  if (error && !profile) return (
    <div className="p-6">
      <div className="flex items-start gap-3 bg-red-50 border border-red-100 text-red-700 rounded-2xl p-4 text-sm max-w-lg">
        <AlertCircle size={18} className="mt-0.5 shrink-0" />
        <p>{error}</p>
      </div>
    </div>
  );

  const display = editing && draft ? draft : profile;
  if (!display) return null;

  const initials = display.name?.substring(0, 2).toUpperCase() ?? "??";

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Profile</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your public freelancer profile</p>
        </div>
        {!editing ? (
          <button onClick={startEdit}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors">
            <Edit2 size={15} /> Edit Profile
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={cancelEdit}
              className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">
              <X size={15} /> Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-60">
              {saving ? <><Loader size={14} className="animate-spin" /> Saving...</> : <><Save size={15} /> Save Changes</>}
            </button>
          </div>
        )}
      </div>

      {success && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl p-3 text-sm mb-5">
          <CheckCircle size={16} className="shrink-0" />
          Profile updated successfully!
        </div>
      )}
      {error && editing && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-100 text-red-700 rounded-xl p-3 text-sm mb-5">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />{error}
        </div>
      )}

      {/* Avatar + name card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
        <div className="flex items-center gap-5">
          {/* Avatar */}
          <div className={`w-20 h-20 rounded-2xl ${avatarColor} flex items-center justify-center text-white text-2xl font-black shrink-0 shadow-lg`}>
            {initials}
          </div>

          {editing ? (
            <div className="flex-1 space-y-3">
              <div>
                <label className={labelCls}>Display Name</label>
                <input value={draft!.name} onChange={e => setD("name", e.target.value)}
                  placeholder="Your full name" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Profile Headline</label>
                <input value={draft!.headline} onChange={e => setD("headline", e.target.value)}
                  placeholder='e.g. "Senior React Developer | 5+ years experience"' className={inputCls} />
              </div>
              {/* Avatar color picker */}
              <div>
                <label className={labelCls}>Avatar Color</label>
                <div className="flex gap-2">
                  {AVATAR_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setAvatarColor(c)}
                      className={`w-7 h-7 rounded-full ${c} transition-transform ${avatarColor === c ? "scale-125 ring-2 ring-offset-1 ring-gray-400" : "hover:scale-110"}`} />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-bold text-gray-900">{display.name}</h2>
              {display.headline && <p className="text-sm text-indigo-600 font-medium mt-0.5">{display.headline}</p>}
              <p className="text-xs text-gray-400 mt-1">{display.email}</p>
            </div>
          )}
        </div>
      </div>

      {/* Details card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
        <h3 className="text-sm font-bold text-gray-700 mb-4">Professional Details</h3>
        <div className="space-y-4">

          {editing ? (
            <>
              <div>
                <label className={labelCls}><Briefcase size={11} className="inline mr-1" />Profession</label>
                <input value={draft!.profession} onChange={e => setD("profession", e.target.value)}
                  placeholder="e.g. Full Stack Developer" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}><GraduationCap size={11} className="inline mr-1" />Education</label>
                <input value={draft!.education} onChange={e => setD("education", e.target.value)}
                  placeholder="e.g. BSc Computer Science, MIT" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}><MapPin size={11} className="inline mr-1" />Location</label>
                <input value={draft!.location} onChange={e => setD("location", e.target.value)}
                  placeholder="e.g. New York, USA" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}><Phone size={11} className="inline mr-1" />Contact Info</label>
                <input value={draft!.contactInfo} onChange={e => setD("contactInfo", e.target.value)}
                  placeholder="e.g. +1 555 000 0000 or LinkedIn URL" className={inputCls} />
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Briefcase,      label: "Profession",  val: display.profession  },
                { icon: GraduationCap,  label: "Education",   val: display.education   },
                { icon: MapPin,         label: "Location",    val: display.location    },
                { icon: Phone,          label: "Contact",     val: display.contactInfo },
              ].map(({ icon: Icon, label, val }) => (
                <div key={label}>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mb-0.5">
                    <Icon size={11} /> {label}
                  </p>
                  <p className="text-sm font-medium text-gray-800">{val || <span className="text-gray-300 italic">Not set</span>}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Skills card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-sm font-bold text-gray-700 mb-4">Skills</h3>

        {editing ? (
          <div>
            <div className="flex gap-2 mb-3">
              <input value={skillInput} onChange={e => setSkillInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                placeholder="Add a skill (press Enter)..."
                className={inputCls + " flex-1"} />
              <button type="button" onClick={addSkill}
                className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm hover:bg-indigo-700 transition-colors">
                <Plus size={16} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {draft!.skills.map(s => (
                <span key={s} className="flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-1 rounded-full text-xs font-medium">
                  {s}
                  <button onClick={() => removeSkill(s)} className="hover:text-red-500 transition-colors ml-0.5">
                    <X size={11} />
                  </button>
                </span>
              ))}
              {draft!.skills.length === 0 && (
                <p className="text-sm text-gray-400 italic">No skills added yet.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {display.skills?.length > 0
              ? display.skills.map(s => (
                  <span key={s} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-xs font-semibold">
                    {s}
                  </span>
                ))
              : <p className="text-sm text-gray-400 italic">No skills listed yet. Click Edit Profile to add some.</p>
            }
          </div>
        )}
      </div>
    </div>
  );
}
