export function isMissingProjectShellError(error: unknown): boolean {
  return error instanceof Error && error.message === "useCurrentProject must be used within ProjectShellPage";
}
