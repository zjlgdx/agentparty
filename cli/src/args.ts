// 轻量 argv 解析，不引 commander
export interface ArgSpec {
  booleans?: string[];
  repeatable?: string[];
  aliases?: Record<string, string>;
}

export interface Parsed {
  positionals: string[];
  flags: Record<string, string | boolean | string[]>;
}

export function parseArgs(argv: string[], spec: ArgSpec = {}): Parsed {
  const booleans = new Set(spec.booleans ?? []);
  const repeatable = new Set(spec.repeatable ?? []);
  const aliases = spec.aliases ?? {};
  const flags: Parsed["flags"] = {};
  const positionals: string[] = [];

  const set = (key: string, value: string | boolean) => {
    if (repeatable.has(key)) {
      const arr = (flags[key] as string[] | undefined) ?? [];
      arr.push(String(value));
      flags[key] = arr;
    } else {
      flags[key] = value;
    }
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--") {
      positionals.push(...argv.slice(i + 1));
      break;
    }
    if (a.startsWith("--")) {
      let key = a.slice(2);
      let val: string | undefined;
      const eq = key.indexOf("=");
      if (eq >= 0) {
        val = key.slice(eq + 1);
        key = key.slice(0, eq);
      }
      if (val === undefined) {
        if (booleans.has(key)) {
          set(key, true);
          continue;
        }
        const next = argv[i + 1];
        if (next !== undefined && (next === "-" || !next.startsWith("-") || /^-\d/.test(next))) {
          val = next;
          i++;
        } else {
          set(key, true);
          continue;
        }
      }
      set(key, val);
    } else if (a.startsWith("-") && a.length > 1) {
      const key = aliases[a.slice(1)] ?? a.slice(1);
      if (booleans.has(key)) {
        set(key, true);
        continue;
      }
      const next = argv[i + 1];
      if (next !== undefined) {
        set(key, next);
        i++;
      } else {
        set(key, true);
      }
    } else {
      positionals.push(a);
    }
  }
  return { positionals, flags };
}

export function str(v: string | boolean | string[] | undefined): string | undefined {
  return typeof v === "string" ? v : undefined;
}

export function num(v: string | boolean | string[] | undefined): number | undefined {
  const s = str(v);
  if (s === undefined) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}
