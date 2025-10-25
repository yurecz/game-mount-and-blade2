import { types } from 'vortex-api';
import { types as vetypes } from '@butr/vortexextensionnative';
import path from 'path';
import { GAME_ID } from '../../common';
import { VortexLauncherManager } from '../../launcher/manager';
import { IModuleCache } from '../../types';

export const languageFileRegex = /ModuleData[\\/]+Languages[\\/]+([^\\/]+)[\\/]+language_data\.xml$/i;

export function detectLanguageCodes(files: string[]): string[] {
  const set = new Set<string>();
  for (const f of files) {
    const m = f.match(languageFileRegex);
    if (m?.[1] !== undefined) set.add(m[1]);
  }
  return [...set];
}

export function isTranslationPayload(p: string): boolean {
  return /ModuleData[\\/]+Languages[\\/]+[^\\/]+[\\/]+/i.test(p);
}

export function normalizeArchivePath(p: string): string {
  return p
    .replace(/^[.][\\/]+/, '')
    .replace(/\\+/g, '/')
    .replace(/\/+$/, '');
}

type NexusModInfo = { name?: string };
type NexusField = { modInfo?: NexusModInfo };

interface IDownloadEntry {
  game?: string[] | string;
  localPath?: string;
  fileName?: string;
  logicalFileName?: string;
  modInfo?: { nexus?: NexusField };
}

export async function inferModuleIdFromDownload(
  api: types.IExtensionApi,
  archivePath?: string
): Promise<string | undefined> {
  try {
    if (archivePath === undefined) return undefined;

    const state = api.getState();
    const downloads: Record<string, IDownloadEntry> = (state.persistent.downloads.files ?? {}) as Record<
      string,
      IDownloadEntry
    >;
    const archiveName = path.basename(archivePath);

    const entries: IDownloadEntry[] = Object.values(downloads ?? {});
    const entry = entries.find((d: IDownloadEntry) => {
      try {
        const game = d?.game;
        const gameMatches = Array.isArray(game) ? (game as string[]).includes(GAME_ID) : false;
        const localPath: string | undefined = d?.localPath;
        const fileName: string | undefined = d?.fileName ?? d?.logicalFileName;
        const pathMatches =
          (typeof localPath === 'string' && localPath.toLowerCase().endsWith(archiveName.toLowerCase())) ||
          (typeof fileName === 'string' && fileName.toLowerCase() === archiveName.toLowerCase());
        return gameMatches && pathMatches;
      } catch {
        return false;
      }
    });

    const nexusInfo: NexusField | undefined = entry?.modInfo?.nexus;
    const nexusModName: string | undefined = nexusInfo?.modInfo?.name;
    if (nexusModName === null || nexusModName === undefined) return undefined;

    const launcher = VortexLauncherManager.getInstance(api);
    const modules: Readonly<IModuleCache> = await launcher.getAllModulesAsync();

    const norm = (s: string): string =>
      s
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
    const tokens = norm(nexusModName)
      .split(' ')
      .filter((x) => x.length > 1);

    let bestId: string | undefined;
    let bestScore = 0;
    for (const [id, m] of Object.entries(modules) as Array<[string, vetypes.ModuleInfoExtendedWithMetadata]>) {
      const idNorm = norm(id);
      const nameNorm = norm(m.name ?? '');
      const hay = `${idNorm} ${nameNorm}`;
      const score = tokens.reduce((acc, t) => (hay.includes(t) ? acc + 1 : acc), 0);
      if (score > bestScore) {
        bestScore = score;
        bestId = id;
      }
    }

    if (bestScore >= 3) return bestId;

    return undefined;
  } catch {
    return undefined;
  }
}
