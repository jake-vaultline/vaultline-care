// Vaultline Care addition, Apache-2.0. Portable support policy; no credentials, I/O or execution.
export const CARE_REPAIR_ACTIONS = ["retry_transfer"] as const;
export const CARE_READ_OPERATIONS = [
  "get_capabilities",
  "jobs_status",
  "drive_status",
  "transfer_status",
] as const;
export function transferFinding(transfer: Record<string, unknown> | undefined) {
  if (!transfer)
    return {
      text: "I could not inspect this exact transfer. Deployment-wide queue and drive checks cannot establish why your transfer stalled.",
      next: "Add the transfer reference from Media Nexus, or prepare a handoff for Jake.",
      retryable: false,
    };
  const progress = transfer.progress as Record<string, unknown> | undefined;
  if (transfer.errorCode === "ENOSPC")
    return {
      text: "This exact transfer recorded an ENOSPC error: it ran out of space while writing. Current free capacity has not been verified.",
      next: "Ask Jake to review destination capacity or an approved alternative. Retrying alone does not make room, and Care will not delete media.",
      retryable: false,
    };
  const counts =
    progress &&
    typeof progress.filesDone === "number" &&
    typeof progress.filesTotal === "number"
      ? ` ${progress.filesDone} of ${progress.filesTotal} files are recorded complete.`
      : "";
  const retryable = ["Failed", "Interrupted", "Partial", "Cancelled"].includes(
    String(transfer.status),
  );
  const reason =
    transfer.errorCode === "ETIMEDOUT"
      ? " Its recorded connection attempt timed out."
      : transfer.errorCode === "ECONNREFUSED"
        ? " Its recorded connection attempt was refused."
        : "";
  return {
    text: `Media Nexus reports this transfer as ${String(transfer.status)}.${counts}${reason} This is recorded evidence; the destination's current connection and capacity still need verification.`,
    next: retryable
      ? "Review the deployment guide and destination before requesting a Media Nexus retry preview. Nothing is retried without exact approval."
      : "Keep the case open and inspect the destination. If progress does not resume, prepare a handoff for Jake.",
    retryable,
  };
}
export function mayApproveCareRepair(
  role: string,
  action: string,
  granted: boolean,
) {
  return (
    granted &&
    action === "retry_transfer" &&
    ["Client administrator", "Vaultline administrator"].includes(role)
  );
}
