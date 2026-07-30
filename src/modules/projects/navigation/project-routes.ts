/**
 * Centralized, type-safe project URL builders.
 *
 * ALL link/navigation generation for project routes must go through these
 * helpers so that if the URL structure changes again, there is exactly one
 * place to update.
 *
 * URL format:  /:orgSlug/p/:publicId/:segment
 * Example:     /acme/p/prj_A82JKL91/overview
 */

/**
 * Build a URL to a specific page inside a project.
 *
 * @param orgSlug   - The organization's URL slug (e.g. "acme").
 * @param publicId  - The project's public ID (e.g. "prj_A82JKL91").
 * @param segment   - Optional sub-page segment (e.g. "overview", "api-keys").
 *                    Omit to navigate to the project root (redirects to overview).
 */
export function projectPath(orgSlug: string, publicId: string, segment?: string): string {
  const base = `/${orgSlug}/p/${publicId}`;
  return segment ? `${base}/${segment}` : base;
}

/**
 * Build the URL for the projects list page of an org.
 */
export function projectsListPath(orgSlug: string): string {
  return `/${orgSlug}/projects`;
}

/**
 * Build the URL to create a new project inside an org.
 */
export function newProjectPath(orgSlug: string): string {
  return `/${orgSlug}/projects/new`;
}

/**
 * Extract the project public ID from a pathname that uses the new URL format.
 * Returns null if the path does not match.
 *
 * @example
 *   publicIdFromPath("/acme/p/prj_A82JKL91/overview")  // "prj_A82JKL91"
 *   publicIdFromPath("/projects/uuid-here/overview")    // null
 */
export function publicIdFromPath(pathname: string): string | null {
  const match = pathname.match(/\/[^/]+\/p\/(prj_[a-zA-Z0-9]+)(?:\/|$)/);
  return match?.[1] ?? null;
}

/**
 * Extract the org slug from a pathname that uses the new URL format.
 * Returns null if the path does not contain a recognizable pattern.
 *
 * @example
 *   orgSlugFromPath("/acme/p/prj_A82JKL91/overview")  // "acme"
 */
export function orgSlugFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/([^/]+)\/p\/prj_[a-zA-Z0-9]+/);
  return match?.[1] ?? null;
}
