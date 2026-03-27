"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { useSession } from "@/server/better-auth/client";

interface InviteInfo {
  workspaceName: string;
  workspaceId: string;
  email: string;
  role: string;
}

export default function InvitePage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;
  const { data: session } = useSession();

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    async function fetchInvite() {
      try {
        const resp = await fetch(`/api/invite/${token}`);
        if (!resp.ok) {
          const data = await resp.json();
          setError(data.error ?? "Invalid invite");
          return;
        }
        setInvite(await resp.json());
      } catch {
        setError("Failed to load invite");
      } finally {
        setLoading(false);
      }
    }
    fetchInvite();
  }, [token]);

  async function handleAccept() {
    if (!session) {
      router.push(`/login?redirect=/invite/${token}`);
      return;
    }

    setAccepting(true);
    try {
      const resp = await fetch(`/api/invite/${token}`, { method: "POST" });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error ?? "Failed to accept invite");
        return;
      }
      router.push("/workspace");
    } catch {
      setError("Failed to accept invite");
    } finally {
      setAccepting(false);
    }
  }

  if (loading) {
    return (
      <div className="invite-container">
        <p style={{ color: "rgba(255,255,255,0.5)" }}>Loading invite...</p>
        <style jsx>{`
          .invite-container { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #16213e 100%); }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="invite-container">
        <div className="invite-card">
          <h1 style={{ color: "#f87171", fontSize: "1.25rem" }}>Invite Error</h1>
          <p style={{ color: "rgba(255,255,255,0.5)" }}>{error}</p>
        </div>
        <style jsx>{`
          .invite-container { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #16213e 100%); }
          .invite-card { background: rgba(255,255,255,0.05); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 2.5rem; text-align: center; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="invite-container">
      <div className="invite-card">
        <h1 style={{ color: "#fff", fontSize: "1.5rem", margin: "0 0 0.5rem" }}>
          Workspace Invitation
        </h1>
        <p style={{ color: "rgba(255,255,255,0.5)", margin: "0 0 1.5rem" }}>
          You&apos;ve been invited to join{" "}
          <strong style={{ color: "#3b82f6" }}>{invite?.workspaceName}</strong>{" "}
          as {invite?.role === "editor" ? "an editor" : `a ${invite?.role}`}.
        </p>
        {!session && (
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem", margin: "0 0 1rem" }}>
            You&apos;ll need to sign in or create an account first.
          </p>
        )}
        <button
          onClick={handleAccept}
          disabled={accepting}
          style={{
            background: "linear-gradient(135deg, #3b82f6, #2563eb)",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            padding: "0.75rem 2rem",
            fontSize: "0.95rem",
            fontWeight: 600,
            cursor: "pointer",
            width: "100%",
          }}
        >
          {accepting
            ? "Accepting..."
            : session
              ? "Accept Invitation"
              : "Sign in & Accept"}
        </button>
      </div>
      <style jsx>{`
        .invite-container { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #16213e 100%); }
        .invite-card { width: 100%; max-width: 420px; background: rgba(255,255,255,0.05); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 2.5rem; text-align: center; }
      `}</style>
    </div>
  );
}
