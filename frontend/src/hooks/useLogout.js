import { useNavigate } from "react-router-dom";
import { logoutUser } from "../api/authApi.js";
import { useSession } from "../context/SessionContext.jsx";

export function useLogout() {
  const { setSession } = useSession();
  const navigate = useNavigate();

  return async function handleLogout() {
    try {
      await logoutUser();
    } finally {
      // Clear local state regardless of network outcome - the server-side
      // cookie clear is what actually ends the session.
      setSession(null);
      navigate("/login", { replace: true });
    }
  };
}
