/**
 * Microphone permission helpers — preflight checks, permission query, error mapping.
 */

export type MicAccessIssue =
  | "unsupported"
  | "insecure"
  | "denied"
  | "no_device"
  | "in_use"
  | "unknown";

export interface MicAccessError {
  message: string;
  issue: MicAccessIssue;
  /** Shown when the user must change browser/OS settings (permission was blocked). */
  showResetSteps?: boolean;
}

/** Returns a blocking error before calling getUserMedia, or null if the environment looks OK. */
export function getMicPreflightError(): string | null {
  if (typeof window === "undefined") return null;

  if (!navigator.mediaDevices?.getUserMedia) {
    return "Your browser does not support microphone access. Use Chrome, Edge, or Firefox.";
  }

  if (!window.isSecureContext) {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:3002";
    return `Microphone access requires a secure page. Open ${origin} in your browser (not a file path or plain HTTP on a LAN IP).`;
  }

  return null;
}

/** Query mic permission when the Permissions API is available (Chrome, Edge, Firefox). */
export async function queryMicPermission(): Promise<
  PermissionState | "unsupported"
> {
  if (!navigator.permissions?.query) return "unsupported";

  try {
    const result = await navigator.permissions.query({
      name: "microphone" as PermissionName,
    });
    return result.state;
  } catch {
    return "unsupported";
  }
}

export function mapGetUserMediaError(err: unknown): MicAccessError {
  const name = err instanceof DOMException ? err.name : err instanceof Error ? err.name : "";

  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return {
        issue: "denied",
        showResetSteps: true,
        message:
          "Microphone permission denied. Allow microphone access for this site, then click Try Again.",
      };
    case "NotFoundError":
    case "DevicesNotFoundError":
      return {
        issue: "no_device",
        message:
          "No microphone found. Connect a microphone or enable it in Windows Settings → Privacy → Microphone.",
      };
    case "NotReadableError":
    case "TrackStartError":
      return {
        issue: "in_use",
        message:
          "Microphone is in use by another app (Zoom, Teams, etc.). Close other apps using the mic and try again.",
      };
    case "OverconstrainedError":
    case "ConstraintNotSatisfiedError":
      return {
        issue: "unknown",
        message:
          "Microphone settings are not supported on this device. Try a different browser or simplify audio settings.",
      };
    case "SecurityError":
      return {
        issue: "insecure",
        message:
          "Microphone blocked for security reasons. Use http://localhost:3002 or https in production.",
      };
    case "AbortError":
      return {
        issue: "unknown",
        message: "Microphone request was cancelled. Click Start Recording to try again.",
      };
    default:
      return {
        issue: "unknown",
        message:
          err instanceof Error && err.message
            ? err.message
            : "Could not access microphone. Check browser and Windows microphone settings.",
      };
  }
}

export const MIC_PERMISSION_RESET_STEPS = [
  "Click the lock or site-info icon in the address bar → Microphone → Allow.",
  "If you previously clicked Block, you must change this manually — the browser will not ask again.",
  "Windows: Settings → Privacy & security → Microphone → allow access for your browser.",
  "Reload the page after changing permissions, then click Try Again.",
] as const;
