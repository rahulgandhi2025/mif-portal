import type { UseCaseException } from "../types";

// Chain-of-events lines use the Time Sequence Diagram syntax:
// "[Phase]" opens a group, "A -> B: text" is a solid arrow, "A --> B: text" a dashed reply.
export function buildChain(src: string, tgt: string, msg: string, proto: string, bidirectional: boolean): string[] {
  const lines = [
    "[Request]",
    `${src} -> ${tgt}: Send ${msg} payload via ${proto}`,
    `${tgt} -> ${tgt}: Validate payload against the agreed contract and process it`,
  ];
  if (bidirectional) {
    lines.push(
      "[Response]",
      `${tgt} --> ${src}: Return acknowledgement / response for ${msg}`,
      `${src} -> ${src}: Record the response and update message status`,
    );
  }
  return lines;
}

// Each exception: first plain line = cause (rendered as a note), arrow lines = recovery steps (rendered as messages).
export function buildExceptions(src: string, tgt: string, msg: string, bidirectional: boolean): UseCaseException[] {
  const out: UseCaseException[] = [
    {
      step: "1.1",
      description: [
        `Cause: ${tgt} is unreachable or the ${msg} request times out.`,
        `${src} -> ${src}: Retry with back-off (3 attempts)`,
        `${src} -> ${src}: Raise connectivity alert and park message in retry queue`,
      ].join("\n"),
    },
    {
      step: "2.1",
      description: [
        `Cause: ${msg} payload fails contract validation or business rules.`,
        `${tgt} --> ${src}: Reject with error response (HTTP 400 / NACK) and reason code`,
        `${src} -> ${src}: Log error, notify support and correct payload before resend`,
      ].join("\n"),
    },
  ];
  if (bidirectional) {
    out.push({
      step: "3.1",
      description: [
        `Cause: Response from ${tgt} is lost or arrives after the timeout.`,
        `${src} -> ${tgt}: Re-send ${msg} using the same message id (idempotent)`,
        `${tgt} --> ${src}: Return the previously processed response`,
      ].join("\n"),
    });
  }
  return out;
}

// Turn sequence-syntax lines into plain readable test steps.
export function plainSteps(chain: string[]): string[] {
  return chain
    .map((l) => l.trim())
    .filter((l) => l && !/^\[.+\]$/.test(l))
    .map((l) => l.replace(/\s*-->\s*/, " ⇢ ").replace(/\s*->\s*/, " → "));
}
