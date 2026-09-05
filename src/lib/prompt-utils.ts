/**
 * Helpers for the prompt library: pull the {переменные} out of a prompt template
 * and assemble a final prompt from user-entered values.
 *
 * Only `{...}` placeholders are treated as fillable variables. Prompts also use
 * `<xml_tags>` for structure — those are left untouched.
 */

const VARIABLE_RE = /\{[^}]+\}/g;

/** Unique `{variable}` tokens in template order, e.g. `["{название бренда}", "{период}"]`. */
export function extractVariables(template: string): string[] {
  const matches = template.match(VARIABLE_RE) || [];
  return Array.from(new Set(matches));
}

/**
 * Replace each `{variable}` with the user's value. A missing or blank value keeps
 * the original `{placeholder}`, so a partially-filled (or untouched) template still
 * copies cleanly and stays fillable in the chat.
 */
export function buildPrompt(
  template: string,
  values: Record<string, string>
): string {
  return template.replace(VARIABLE_RE, (token) => {
    const value = values[token]?.trim();
    return value ? value : token;
  });
}

/** True once every variable in the template has a non-empty value. */
export function allVariablesFilled(
  template: string,
  values: Record<string, string>
): boolean {
  const vars = extractVariables(template);
  return vars.length > 0 && vars.every((v) => values[v]?.trim());
}
