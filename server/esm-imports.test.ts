import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Vercel runs api/* as native Node ESM: every relative import must name its emitted .js file.
describe('serverless ESM imports', () => {
  it('every relative import reachable from api/ ends in .js', () => {
    const bad: string[] = []; const seen = new Set<string>();
    const visit = (file: string) => {
      if (seen.has(file)) return; seen.add(file);
      for (const [, spec] of readFileSync(file, 'utf8').matchAll(/(?:from|import)\s*['"](\.{1,2}\/[^'"]+)['"]/g)) {
        if (!spec.endsWith('.js')) { bad.push(`${file}: ${spec}`); continue; }
        visit(resolve(dirname(file), spec.replace(/\.js$/, '.ts')));
      }
    };
    for (const name of readdirSync('api')) visit(resolve(join('api', name)));
    expect(seen.size).toBeGreaterThan(5);
    expect(bad).toEqual([]);
  });
});
