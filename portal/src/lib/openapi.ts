// Minimal OpenAPI 3 helpers for the in-portal API reference and the Postman export.

export interface OpenApiSchema {
  type?: string;
  properties?: Record<string, OpenApiSchema>;
  items?: OpenApiSchema;
  example?: unknown;
  default?: unknown;
  description?: string;
  required?: string[];
  enum?: unknown[];
  $ref?: string;
}

export interface OpenApiParameter {
  name: string;
  in: 'path' | 'query' | 'header';
  required?: boolean;
  description?: string;
  schema?: OpenApiSchema;
}

export interface OpenApiOperation {
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: OpenApiParameter[];
  requestBody?: { content?: { 'application/json'?: { schema?: OpenApiSchema } } };
}

export interface OpenApiSpec {
  info: { title: string; version: string; description?: string };
  paths: Record<string, Record<string, OpenApiOperation>>;
  components?: { schemas?: Record<string, OpenApiSchema> };
}

export interface Endpoint {
  id: string;
  method: string;
  path: string;
  tag: string;
  op: OpenApiOperation;
}

export function endpoints(spec: OpenApiSpec): Endpoint[] {
  return Object.entries(spec.paths).flatMap(([path, methods]) =>
    Object.entries(methods).map(([method, op]) => ({ id: `${method} ${path}`, method: method.toUpperCase(), path, tag: op.tags?.[0] ?? 'other', op })),
  );
}

function resolve(spec: OpenApiSpec, schema?: OpenApiSchema): OpenApiSchema | undefined {
  if (schema?.$ref) return spec.components?.schemas?.[schema.$ref.split('/').pop()!];
  return schema;
}

// Builds an example JSON body from the schema's examples, falling back to placeholders.
export function exampleFor(spec: OpenApiSpec, schema?: OpenApiSchema): unknown {
  const s = resolve(spec, schema);
  if (!s) return undefined;
  if (s.example !== undefined) return s.example;
  if (s.default !== undefined) return s.default;
  if (s.type === 'object' || s.properties) {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(s.properties ?? {})) {
      const v = exampleFor(spec, value);
      if (v !== undefined && (s.required?.includes(key) || resolve(spec, value)?.example !== undefined)) out[key] = v;
    }
    return out;
  }
  if (s.type === 'array') return [];
  if (s.type === 'string') return s.enum?.[0] ?? '';
  if (s.type === 'number' || s.type === 'integer') return 0;
  if (s.type === 'boolean') return false;
  return undefined;
}

export function bodyExample(spec: OpenApiSpec, op: OpenApiOperation): string | null {
  const schema = op.requestBody?.content?.['application/json']?.schema;
  if (!schema) return null;
  return JSON.stringify(exampleFor(spec, schema) ?? {}, null, 2);
}

// Postman Collection v2.1 with {{baseUrl}} and {{apiKey}} variables.
export function toPostman(spec: OpenApiSpec, baseUrl: string) {
  const groups = new Map<string, unknown[]>();
  for (const e of endpoints(spec)) {
    const path = e.path.replace(/\{(\w+)\}/g, ':$1');
    const query = (e.op.parameters ?? []).filter((p) => p.in === 'query').map((p) => ({ key: p.name, value: '', disabled: !p.required, description: p.description }));
    const variables = (e.op.parameters ?? []).filter((p) => p.in === 'path').map((p) => ({ key: p.name, value: '' }));
    const body = bodyExample(spec, e.op);
    const item = {
      name: e.op.summary ?? `${e.method} ${e.path}`,
      request: {
        method: e.method,
        header: [{ key: 'x-api-key', value: '{{apiKey}}' }, ...(body ? [{ key: 'content-type', value: 'application/json' }] : [])],
        url: { raw: `{{baseUrl}}${path}`, host: ['{{baseUrl}}'], path: path.split('/').filter(Boolean), query, variable: variables },
        ...(body ? { body: { mode: 'raw', raw: body, options: { raw: { language: 'json' } } } } : {}),
        description: e.op.description,
      },
    };
    groups.set(e.tag, [...(groups.get(e.tag) ?? []), item]);
  }
  return {
    info: { name: spec.info.title, description: spec.info.description, schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
    variable: [
      { key: 'baseUrl', value: baseUrl },
      { key: 'apiKey', value: 'tn_test_…' },
    ],
    item: [...groups.entries()].map(([name, item]) => ({ name: name[0].toUpperCase() + name.slice(1), item })),
  };
}

export interface Field {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  enum?: unknown[];
  example?: unknown;
}

// Top-level fields of an operation's JSON body, for the reference table.
export function bodyFields(spec: OpenApiSpec, op: OpenApiOperation): Field[] {
  const schema = resolve(spec, op.requestBody?.content?.['application/json']?.schema);
  if (!schema?.properties) return [];
  return Object.entries(schema.properties).map(([name, raw]) => {
    const field = resolve(spec, raw) ?? raw;
    return {
      name,
      type: field.type ?? (field.enum ? 'string' : 'object'),
      required: schema.required?.includes(name) ?? false,
      description: field.description,
      enum: field.enum,
      example: field.example,
    };
  });
}
