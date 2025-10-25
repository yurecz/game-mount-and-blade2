import { types } from 'vortex-api';
import { languageFileRegex, normalizeArchivePath } from './utils';
import { GAME_ID, SUBMODULE_FILE } from '../../common';

export const isModuleTranslationArchiveAsync = (files: string[], gameId: string): Promise<types.ISupportedResult> => {
  if (gameId !== GAME_ID) {
    return Promise.resolve({ supported: false, requiredFiles: [] });
  }

  const submoduleLower = SUBMODULE_FILE.toLowerCase();
  const hasSubmoduleFile = files.some((file) => file.replace(/\\/g, '/').toLowerCase().endsWith(submoduleLower));

  const languageFiles = files.filter((file) => languageFileRegex.test(file)).map(normalizeArchivePath);
  const hasLanguageFile = languageFiles.length > 0;

  return Promise.resolve({ supported: !hasSubmoduleFile && hasLanguageFile, requiredFiles: languageFiles });
};
