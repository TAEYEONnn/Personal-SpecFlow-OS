/**
 * Validates that a JSON Schema is compatible with OpenAI Structured Outputs
 * strict mode: every property in an object must be in required[], and
 * additionalProperties must be false.
 */
export function validateStrictSchema(schema: unknown, path = "root"): string[] {
  const errors: string[] = [];
  if (!schema || typeof schema !== "object") return errors;

  const node = schema as {
    type?: string | string[];
    properties?: Record<string, unknown>;
    required?: string[];
    additionalProperties?: unknown;
    items?: unknown;
    anyOf?: unknown[];
  };

  const types = Array.isArray(node.type)
    ? node.type
    : node.type ? [node.type] : [];

  if (types.includes("object")) {
    const keys = Object.keys(node.properties ?? {});
    const required = new Set(node.required ?? []);

    for (const key of keys) {
      if (!required.has(key)) {
        errors.push(`${path}: required에 누락된 필드: "${key}"`);
      }
    }

    if (node.additionalProperties !== false) {
      errors.push(`${path}: additionalProperties는 false여야 합니다`);
    }

    for (const [key, child] of Object.entries(node.properties ?? {})) {
      errors.push(...validateStrictSchema(child, `${path}.${key}`));
    }
  }

  if (types.includes("array") && node.items) {
    errors.push(...validateStrictSchema(node.items, `${path}[]`));
  }

  // anyOf is allowed when it's the nullable pattern: anyOf: [{...}, {type:"null"}]
  if (node.anyOf) {
    const hasNullBranch = node.anyOf.some(
      (b) => typeof b === "object" && b !== null && (b as Record<string, unknown>).type === "null"
    );
    if (!hasNullBranch) {
      errors.push(`${path}: anyOf는 nullable 패턴([..., {type:"null"}])이 아니면 OpenAI strict schema에서 지원되지 않습니다`);
    }
    // Recurse into non-null branches
    for (const branch of node.anyOf) {
      if (typeof branch === "object" && branch !== null && (branch as Record<string, unknown>).type !== "null") {
        errors.push(...validateStrictSchema(branch, `${path}(anyOf)`));
      }
    }
  }

  return errors;
}
