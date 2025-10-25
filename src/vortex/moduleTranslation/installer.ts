import { types } from 'vortex-api';
import path from 'path';
import { detectLanguageCodes, inferModuleIdFromDownload, isTranslationPayload, normalizeArchivePath } from './utils';
import { GAME_ID } from '../../common';
import { LocalizationManager } from '../../localization';

export async function installModuleTranslationAsync(
  api: types.IExtensionApi,
  files: string[],
  destinationPath: string,
  gameId: string,
  _progressDelegate: types.ProgressDelegate,
  _choices?: unknown,
  _unattended?: boolean,
  archivePath?: string
): Promise<types.IInstallResult> {
  if (gameId !== GAME_ID) {
    return undefined!;
  }

  const languageCodes = detectLanguageCodes(files);
  const languageCodesNorm = Array.from(
    new Set(
      languageCodes
        .map((x) => (x ?? '').toString().trim())
        .filter((x) => x.length > 0)
        .map((x) => x.toUpperCase())
    )
  ).sort((a, b) => a.localeCompare(b));

  const instructions: types.IInstruction[] = [];

  const payloadFiles = files.filter(isTranslationPayload);
  const candidates = (payloadFiles.length > 0 ? payloadFiles : files).filter((f) => !/[\\/]+$/.test(f));

  let warnedMissingTarget = false;
  let inferredTargetUsed: string | undefined = undefined;

  for (const file of candidates) {
    const normalized = normalizeArchivePath(file);

    let destination = normalized;
    const topLevelModMatch = normalized.match(/(?:^|.*\/)([^/]+)\/(ModuleData\/.*)$/i);
    if (topLevelModMatch && !normalized.toLowerCase().startsWith('modules/')) {
      destination = `Modules/${topLevelModMatch[1]}/${topLevelModMatch[2]}`;
    } else if (!normalized.toLowerCase().startsWith('modules/') && /^moduledata\//i.test(normalized)) {
      if (archivePath !== undefined && archivePath.length > 0) {
        const inferredModuleId = await inferModuleIdFromDownload(api, archivePath);
        if (inferredModuleId !== undefined) {
          destination = `Modules/${inferredModuleId}/${normalized}`;
          inferredTargetUsed = inferredModuleId;
        } else {
          warnedMissingTarget = true;
        }
      } else {
        warnedMissingTarget = true;
      }
    }

    instructions.push({ type: 'copy', source: normalized, destination });
  }

  if (languageCodesNorm.length > 0) {
    instructions.push({ type: 'attribute', key: 'translationLanguages', value: languageCodesNorm });
    instructions.push({ type: 'attribute', key: 'translationLanguagesText', value: languageCodesNorm.join(', ') });
  }

  const result: types.IInstallResult = { instructions };

  if (inferredTargetUsed !== undefined) {
    const { localize: t } = LocalizationManager.getInstance(api);
    const archiveBase = path.basename(archivePath!);
    const title = `${t('Inferred Translation Target')} - ${archiveBase}`;
    api.sendNotification?.({
      id: 'translation-inferred-target',
      type: 'warning',
      title,
      message: `${t('Using inferred module for translation files')}: ${inferredTargetUsed}. ${t(
        'The archive did not include a module folder.'
      )}`,
    });
  }

  if (warnedMissingTarget) {
    const { localize: t } = LocalizationManager.getInstance(api);
    const archiveBase = archivePath !== undefined ? path.basename(archivePath) : '';
    const title = archiveBase
      ? `${t('Cannot Determine Target Module')} - ${archiveBase}`
      : t('Cannot Determine Target Module');
    api.showErrorNotification?.(
      title,
      t(
        'Could not identify the target Bannerlord module for translation files. The archive lacks a module folder and Nexus metadata did not help. Files will be placed under ModuleData/ and may not work. Consider repacking as Modules/<ModuleId>/ModuleData or <ModuleId>/ModuleData.'
      )
    );
  }

  return result;
}
