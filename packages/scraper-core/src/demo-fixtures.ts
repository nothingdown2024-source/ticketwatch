import { readFile } from 'node:fs/promises';

export type DemoFixtureState = 'state-1' | 'state-2';

export async function loadDemoFixture(state: DemoFixtureState): Promise<string> {
  const fixtureUrl = new URL(`../fixtures/demo/${state}.html`, import.meta.url);
  return readFile(fixtureUrl, 'utf8');
}
