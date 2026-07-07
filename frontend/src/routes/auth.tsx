import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Secure Authentication | SMART BIN" },
      { name: "description", content: "Operator authentication for the LOGISTIX smart bin precision inventory control system." },
    ],
  }),
  component: AuthPage,
});

const getBaseUrl = () => {
  const url = process.env.FASTAPI_BASE_URL || "http://localhost:8000";
  return url.replace(/\/$/, "");
};

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", pw);

    try {
      const res = await fetch(`${getBaseUrl()}/api/v1/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData,
      });

      if (!res.ok) throw new Error("Invalid credentials");

      const data = await res.json();
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("username", data.username);
      navigate({ to: "/" });
    } catch {
      setError("Authentication failed. Please check your Email and Security Key.");
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-on-surface">
      <div className="fixed inset-0 pointer-events-none z-0 bg-grid-subtle opacity-10" />
      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-margin-mobile md:px-margin-desktop py-xl">
        <div className="mb-lg text-center">
          <h1 className="text-5xl font-bold text-primary tracking-tight mb-xs" style={{ letterSpacing: "-0.02em" }}>
            SMART BIN
          </h1>
          <p className="text-[12px] text-outline uppercase tracking-[0.25em] font-semibold">
            Precision Inventory Control
          </p>
        </div>

        <div className="w-full max-w-[440px] bg-surface-container-lowest border border-outline-variant p-lg shadow-sm rounded">
          <div className="flex justify-end mb-md">
            <span className="font-mono text-[10px] text-outline px-sm py-[2px] bg-surface-container rounded-sm border border-outline-variant">
              SEC_PRTCL_V5.0
            </span>
          </div>

          <div className="mb-lg">
            <h2 className="text-2xl font-semibold text-on-surface">Operator Authentication</h2>
            <div className="h-[2px] w-12 bg-primary mt-sm" />
          </div>

          <form className="space-y-lg" onSubmit={handleLogin}>
            <Field id="email" icon="mail" label="Operator Email" placeholder="Enter Email" value={email} onChange={setEmail} />
            <Field id="password" icon="lock" label="Security Key" placeholder="••••••••" type="password" value={pw} onChange={setPw} />

            {error && (
              <p className="text-[13px] text-red-500 font-semibold text-center">{error}</p>
            )}

            <div className="flex items-center gap-sm pt-xs">
              <div className="w-2 h-2 rounded-full bg-secondary" />
              <span className="text-[12px] text-secondary uppercase tracking-tight font-semibold">
                System Interface Online
              </span>
            </div>

            <button
              type="submit"
              className="w-full h-14 bg-primary text-on-primary text-lg font-semibold hover:bg-on-primary-fixed-variant transition-all active:scale-[0.99] flex items-center justify-center gap-sm group rounded shadow-md"
            >
              <span>Access System</span>
              <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </button>
          </form>

          <div className="mt-lg pt-md border-t border-outline-variant flex justify-between items-center">
            <a href="#" className="text-[12px] text-outline hover:text-primary transition-colors uppercase tracking-wider font-semibold">
              Reset Key
            </a>
            <Link to="/" className="text-[12px] text-primary hover:text-on-primary-fixed-variant transition-colors uppercase tracking-wider font-bold">
              New Access
            </Link>
          </div>
        </div>

        <div className="mt-lg w-full max-w-[440px] hidden md:block">
          <div className="font-mono text-[11px] text-outline-variant opacity-60 flex justify-between px-xs">
            <span>&gt; AUTH_LAYER: ACTIVE</span>
            <span>&gt; ENCRYPTION: AES-256</span>
            <span>&gt; NODE: BRW_001</span>
          </div>
        </div>

        <footer className="mt-xl py-md">
          <p className="text-[12px] text-outline uppercase tracking-wider font-semibold">
            © LOGISTIX OPERATIONAL SUITE
          </p>
        </footer>
      </main>
    </div>
  );
}

function Field({
  id, icon, label, placeholder, type = "text", value, onChange,
}: {
  id: string; icon: string; label: string; placeholder: string; type?: string;
  value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-xs">
      <label htmlFor={id} className="text-[12px] text-on-surface-variant block uppercase tracking-wider font-semibold">
        {label}
      </label>
      <div className="relative flex items-center group">
        <span className="material-symbols-outlined absolute left-3 text-outline group-focus-within:text-primary transition-colors">
          {icon}
        </span>
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-12 pl-10 pr-4 bg-surface-bright border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none text-on-surface transition-all rounded"
        />
      </div>
    </div>
  );
}
