import React, { useState, useEffect } from "react";
import { useApp, OrgRole } from "../AppContext";
import {
  Edit2, Save, X, AlertCircle, CheckCircle, Loader,
  MapPin, Phone, Building2, User, Users
} from "lucide-react";

interface ClientProfileData {
  id:             string;
  name:           string;
  email:          string;
  businessName:   string;
  location:       string;
  contactInfo:    string;
  orgRole:        string;
  teamLeaderName: string;
  avatar:         string;
}

const inputCls = "w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all bg-white";
const labelCls = "block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5";

const ORG_INFO: Record<string, { label: string; icon: string; color: string }> = {
  team_leader:     { label: "Team Leader",     icon: "👑", color: "bg-amber-50 text-amber-700 border-amber-200"   },
  project_manager: { label: "Project Manager", icon: "💼", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
};

export function ClientProfile() {
  const { user, updateUser } = useApp();

  const [profile,  setProfile]  = useState<ClientProfileData | null>(null);
  const [editing,  setEditing]  = useState(false);
  const [draft,    setDraft]    = useState<ClientProfileData | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [success,  setSuccess]  = useState(false);

  const loadProfile = () => {
    if (!user?.id) return;
    setLoading(true);
    fetch(`/api/client/profile?id=${user.id}`)
      .then(r => {
        if (!r.ok) throw new Error(r.status.toString());
        return r.json();
      })
      .then(d => {
        setProfile(d);
        setLoading(false);
        // Sync AppContext with whatever is actually in the DB
        if (d.orgRole || d.teamLeaderName) {
          updateUser({
            orgRole:        (d.orgRole as OrgRole) ?? null,
            teamLeaderName: d.teamLeaderName ?? "",
          });
        }
      })
      .catch(() => {
        // Fallback: build from AppContext when profile endpoint not reachable
        setProfile({
          id:             user.id,
          name:           user.name,
          email:          user.email,
          businessName:   "",
          location:       "",
          contactInfo:    "",
          orgRole:        user.orgRole ?? "team_leader",
          teamLeaderName: user.teamLeaderName ?? "",
          avatar:         user.avatar,
        });
        setLoading(false);
      });
  };

  useEffect(() => { loadProfile(); }, [user?.id]);

  const startEdit  = () => {
    if (!profile) return;
    setDraft({ ...profile });
    setEditing(true);
    setSuccess(false);
    setError(null);
  };

  const cancelEdit = () => { setEditing(false); setDraft(null); setError(null); };

  const setD = (field: keyof ClientProfileData, value: string) =>
    setDraft(prev => prev ? { ...prev, [field]: value } : prev);

  const handleSave = async () => {
    if (!draft) return;

    // Validate: project managers must have a team leader name
    if (draft.orgRole === "project_manager" && !draft.teamLeaderName.trim()) {
      setError("Project Managers must enter their Team Leader's name.");
      return;
    }

    setSaving(true); setError(null);

    try {
      const res = await fetch("/api/client/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });

      const data = await res.json();

      if (!res.ok) {
        setError("Save failed: " + (typeof data === "string" ? data : JSON.stringify(data)));
        return;
      }

      // The server returns the resolved orgRole and teamLeaderName
      // Use those values (not draft values) because server may have adjusted them
      const resolvedOrgRole        = data.orgRole        ?? draft.orgRole;
      const resolvedTeamLeaderName = data.teamLeaderName ?? draft.teamLeaderName;

      const updatedProfile: ClientProfileData = {
        ...draft,
        orgRole:        resolvedOrgRole,
        teamLeaderName: resolvedTeamLeaderName,
      };

      setProfile(updatedProfile);
      setEditing(false);
      setDraft(null);
      setSuccess(true);

      // Update AppContext immediately so sidebar and other tabs reflect the change
      updateUser({
        name:           updatedProfile.name,
        orgRole:        resolvedOrgRole as OrgRole,
        teamLeaderName: resolvedTeamLeaderName,
        avatar:         updatedProfile.name.substring(0, 2).toUpperCase(),
      });

      // Re-fetch from server to confirm save was persisted
      setTimeout(() => {
        loadProfile();
        setSuccess(false);
      }, 2000);

    } catch (e: any) {
      setError("Save failed: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="p-6 flex items-center gap-3 text-gray-400 text-sm">
      <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      Loading profile...
    </div>
  );

  const display  = editing && draft ? draft : profile;
  if (!display) return null;

  const orgInfo  = ORG_INFO[display.orgRole] ?? { label: display.orgRole || "Not set", icon: "👤", color: "bg-gray-50 text-gray-600 border-gray-200" };
  const isLeader = display.orgRole === "team_leader";

  return (
    <div className="p-6 max-w-2xl">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Profile</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your account and team details</p>
        </div>
        {!editing ? (
          <button onClick={startEdit}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors">
            <Edit2 size={15} /> Edit Profile
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={cancelEdit}
              className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">
              <X size={15} /> Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-60">
              {saving
                ? <><Loader size={14} className="animate-spin" /> Saving...</>
                : <><Save size={15} /> Save Changes</>
              }
            </button>
          </div>
        )}
      </div>

      {success && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl p-3 text-sm mb-5">
          <CheckCircle size={16} className="shrink-0" />
          Profile saved successfully! Verifying with server...
        </div>
      )}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-100 text-red-700 rounded-xl p-3 text-sm mb-5">
          <AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      {/* Avatar + Name */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center text-white text-xl font-black shrink-0">
            {display.name.substring(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            {editing ? (
              <div>
                <label className={labelCls}>Full Name</label>
                <input value={draft!.name} onChange={e => setD("name", e.target.value)}
                  placeholder="Your name" className={inputCls} />
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-gray-900">{display.name}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{display.email}</p>
              </>
            )}
            {display.orgRole && (
              <div className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full border text-xs font-semibold ${orgInfo.color}`}>
                <span>{orgInfo.icon}</span> {orgInfo.label}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Role & Team */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
        <h3 className="text-sm font-bold text-gray-700 mb-4">Role & Team</h3>

        {editing ? (
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Role in Organization</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { val: "team_leader",     label: "Team Leader",     desc: "Approves milestones & invoices" },
                  { val: "project_manager", label: "Project Manager", desc: "Initiates payments to freelancers" },
                ].map(({ val, label, desc }) => (
                  <button key={val} type="button"
                    onClick={() => {
                      setD("orgRole", val);
                      // If switching to team leader, clear teamLeaderName (will be set by server)
                      if (val === "team_leader") setD("teamLeaderName", "");
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      draft!.orgRole === val
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white text-gray-700 border-gray-200 hover:border-emerald-300"
                    }`}>
                    <p className="text-xs font-bold">{label}</p>
                    <p className={`text-[10px] mt-0.5 ${draft!.orgRole === val ? "text-white/70" : "text-gray-400"}`}>{desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {draft!.orgRole === "project_manager" && (
              <div>
                <label className={labelCls}>
                  <Users size={11} className="inline mr-1" />
                  Team Leader's Name <span className="text-red-400">*</span>
                </label>
                <input
                  value={draft!.teamLeaderName}
                  onChange={e => setD("teamLeaderName", e.target.value)}
                  placeholder="Enter your Team Leader's full name exactly as registered"
                  className={inputCls}
                />
                <p className="text-xs text-gray-400 mt-1">
                  This must match the name the Team Leader registered with. They will automatically be linked to your account.
                </p>
              </div>
            )}

            {draft!.orgRole === "team_leader" && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700">
                👑 As Team Leader, your name becomes the anchor for your team. Project Managers should enter <strong>"{draft!.name || display.name}"</strong> as their Team Leader name.
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Role</p>
              <p className="text-sm font-medium text-gray-800">
                {display.orgRole
                  ? `${orgInfo.icon} ${orgInfo.label}`
                  : <span className="text-gray-400 italic">Not set — click Edit Profile</span>
                }
              </p>
            </div>

            {!isLeader && display.orgRole && (
              <div>
                <p className="text-xs text-gray-400 flex items-center gap-1 mb-0.5">
                  <Users size={11} /> Reports to (Team Leader)
                </p>
                <p className="text-sm font-medium text-gray-800">
                  {display.teamLeaderName || <span className="text-gray-300 italic">Not set</span>}
                </p>
              </div>
            )}

            {isLeader && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700">
                👑 You are the Team Leader. Project Managers must enter <strong>"{display.name}"</strong> as their Team Leader name when registering or updating their profile.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Organization Details */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-sm font-bold text-gray-700 mb-4">Organization Details</h3>

        {editing ? (
          <div className="space-y-4">
            <div>
              <label className={labelCls}><Building2 size={11} className="inline mr-1" />Organization / Business Name</label>
              <input value={draft!.businessName} onChange={e => setD("businessName", e.target.value)}
                placeholder="e.g. Acme Corp" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}><MapPin size={11} className="inline mr-1" />Location</label>
              <input value={draft!.location} onChange={e => setD("location", e.target.value)}
                placeholder="e.g. San Francisco, USA" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}><Phone size={11} className="inline mr-1" />Contact Info</label>
              <input value={draft!.contactInfo} onChange={e => setD("contactInfo", e.target.value)}
                placeholder="e.g. Phone or LinkedIn URL" className={inputCls} />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Building2, label: "Organization", val: display.businessName },
              { icon: MapPin,    label: "Location",     val: display.location     },
              { icon: Phone,     label: "Contact",      val: display.contactInfo  },
              { icon: User,      label: "Email",        val: display.email        },
            ].map(({ icon: Icon, label, val }) => (
              <div key={label}>
                <p className="text-xs text-gray-400 flex items-center gap-1 mb-0.5">
                  <Icon size={11} /> {label}
                </p>
                <p className="text-sm font-medium text-gray-800">
                  {val || <span className="text-gray-300 italic">Not set</span>}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
