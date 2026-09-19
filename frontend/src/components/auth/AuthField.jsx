import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function AuthField({ icon: Icon, isPassword = false, ...inputProps }) {
  const [visible, setVisible] = useState(false);
  const type = isPassword ? (visible ? "text" : "password") : inputProps.type ?? "text";

  return (
    <div className="relative">
      {Icon && (
        <Icon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
      )}
      <input
        {...inputProps}
        type={type}
        className={`w-full rounded-lg border border-slate-200 bg-white py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-forest focus:outline-none focus:ring-1 focus:ring-forest ${
          Icon ? "pl-10" : "pl-3"
        } ${isPassword ? "pr-10" : "pr-3"}`}
      />
      {isPassword && (
        <button
          type="button"
          onClick={() => setVisible((prev) => !prev)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          tabIndex={-1}
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      )}
    </div>
  );
}
