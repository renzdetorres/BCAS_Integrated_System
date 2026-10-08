import { useCallback, useEffect, useState } from "react";
import { getRoleAccess, setRoleAccess } from "../api/roleAccessApi.js";
import { ApiError } from "../api/apiClient.js";
import AppLayout from "../components/layout/AppLayout.jsx";
import Card from "../components/ui/Card.jsx";
import { ROLE_SHORT_LABELS } from "../config/navigation.js";
import { useToast } from "../context/ToastContext.jsx";
import "./AdminRoleAccessPage.css";

function groupFeatures(features) {
  const groups = [];
  for (const feature of features) {
    let group = groups.find((g) => g.name === feature.group);
    if (!group) {
      group = { name: feature.group, features: [] };
      groups.push(group);
    }
    group.features.push(feature);
  }
  return groups;
}

export default function AdminRoleAccessPage() {
  const { showToast } = useToast();
  const [overview, setOverview] = useState(null);
  const [activeRole, setActiveRole] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [pendingKey, setPendingKey] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await getRoleAccess();
      setOverview(data);
      setActiveRole((current) => current ?? data.roles[0]?.role ?? null);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Failed to load role access.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleToggle(role, feature) {
    const pendingId = `${role}:${feature.key}`;
    setPendingKey(pendingId);
    try {
      await setRoleAccess({ role, featureKey: feature.key, blocked: !feature.isBlocked });
      setOverview((prev) => ({
        ...prev,
        roles: prev.roles.map((r) =>
          r.role !== role
            ? r
            : { ...r, features: r.features.map((f) => (f.key === feature.key ? { ...f, isBlocked: !f.isBlocked } : f)) },
        ),
      }));
      showToast(`${feature.label} ${feature.isBlocked ? "allowed" : "blocked"} for ${ROLE_SHORT_LABELS[role] ?? role}.`);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Failed to update access.");
    } finally {
      setPendingKey(null);
    }
  }

  const current = overview?.roles.find((r) => r.role === activeRole);
  const canEdit = overview?.callerIsSuperAdmin ?? false;

  return (
    <AppLayout title="Role Access">
      <Card>
        <p className="role-access-intro">
          Choose which pages each role can open. A page you switch off disappears from that role&apos;s menu and its
          data is refused by the server. Dashboards and personal settings stay available, and Super Admins are never
          restricted.
        </p>

        {errorMessage && (
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        )}

        {overview && !canEdit && (
          <p className="role-access-note">Only a Super Admin can change these. You can view them.</p>
        )}

        {!overview && !errorMessage && <p>Loading...</p>}

        {overview && (
          <>
            <div className="role-access-tabs" role="tablist" aria-label="Role">
              {overview.roles.map((r) => (
                <button
                  key={r.role}
                  type="button"
                  role="tab"
                  aria-selected={r.role === activeRole}
                  className={r.role === activeRole ? "role-access-tab role-access-tab-active" : "role-access-tab"}
                  onClick={() => setActiveRole(r.role)}
                >
                  {ROLE_SHORT_LABELS[r.role] ?? r.role}
                  {r.features.some((f) => f.isBlocked) && (
                    <span className="role-access-tab-count">{r.features.filter((f) => f.isBlocked).length} off</span>
                  )}
                </button>
              ))}
            </div>

            {current &&
              groupFeatures(current.features).map((group) => (
                <section key={group.name} className="role-access-group">
                  <h2 className="role-access-group-title">{group.name}</h2>
                  <ul className="role-access-list">
                    {group.features.map((feature) => {
                      const pending = pendingKey === `${current.role}:${feature.key}`;
                      return (
                        <li key={feature.key} className="role-access-row">
                          <span className="role-access-label">{feature.label}</span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={!feature.isBlocked}
                            aria-label={`${feature.label} for ${ROLE_SHORT_LABELS[current.role] ?? current.role}`}
                            className={feature.isBlocked ? "role-access-switch" : "role-access-switch role-access-switch-on"}
                            disabled={!canEdit || pending}
                            onClick={() => handleToggle(current.role, feature)}
                          >
                            <span className="role-access-switch-knob" />
                          </button>
                          <span className="role-access-state">{feature.isBlocked ? "Blocked" : "Allowed"}</span>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
          </>
        )}
      </Card>
    </AppLayout>
  );
}
