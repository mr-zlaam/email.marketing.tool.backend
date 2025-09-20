export function replaceAllPlaceholders(template: string, placeholders: Record<string, string>): string {
  let modifiedTemplate = template;

  for (const [key, value] of Object.entries(placeholders)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
    modifiedTemplate = modifiedTemplate.replace(regex, value || "");
  }

  return modifiedTemplate;
}
