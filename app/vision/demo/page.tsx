import Link from "next/link";
import { MailWarning } from "lucide-react";
import "@/components/vision/vision.css";
export const metadata = { title: "Atlas invitation · UX-17 demo" };
export default function Page() {
  return (
    <main
      className="vision-shell"
      style={{ display: "grid", placeItems: "center", padding: 24 }}
    >
      <div style={{ width: "100%", maxWidth: 440, textAlign: "center" }}>
        <div className="vision-eyebrow" style={{ justifyContent: "center" }}>
          ATLAS / CUSTOMER PORTAL
        </div>
        <div
          style={{
            background: "var(--panel)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            padding: 40,
            marginTop: 24,
          }}
        >
          <MailWarning
            size={38}
            style={{ margin: "0 auto 24px", color: "var(--muted)" }}
          />
          <h1 style={{ fontSize: 25, marginBottom: 14 }}>
            This invitation has expired.
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.7 }}>
            Your invitation to the Northstar Studio workspace is no longer
            valid.
          </p>
          <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 28 }}>
            Please contact your workspace administrator.
          </p>
        </div>
        <p
          style={{
            color: "var(--muted)",
            fontSize: 11,
            marginTop: 22,
            lineHeight: 1.8,
          }}
        >
          Demo fixture · UX-17
          <br />
          The missing resend action is intentional. Share this tab with your
          team.
        </p>
        <Link
          href="/vision/team"
          style={{ fontSize: 12, color: "var(--accent)" }}
        >
          Back to your team
        </Link>
      </div>
    </main>
  );
}
