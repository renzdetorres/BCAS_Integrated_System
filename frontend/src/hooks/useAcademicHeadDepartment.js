import { useEffect, useState } from "react";
import { getMyAcademicHeadProfile } from "../api/academicHeadSettingsApi.js";

/**
 * The signed-in Academic Head's assigned department, read live from their
 * profile rather than the session - an Admin can reassign it at any time,
 * and the session only reflects what was true at login. The server scopes
 * every Academic Head endpoint to this same value; this is for display.
 *
 * department is null both while loading and when none is assigned - check
 * isLoading to tell them apart.
 */
export function useAcademicHeadDepartment() {
  const [department, setDepartment] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getMyAcademicHeadProfile()
      .then((profile) => {
        if (!cancelled) setDepartment(profile.department ?? null);
      })
      .catch(() => {
        if (!cancelled) setDepartment(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { department, isLoading };
}
