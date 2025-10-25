// eslint-disable-next-line no-restricted-imports
import { method as toBluebird } from 'bluebird';
import { selectors, types } from 'vortex-api';
import { isModuleTranslationArchiveAsync } from './detection';
import { installModuleTranslationAsync } from './installer';
import { isModTypeModuleTranslation } from './modType';
import { getInstallPathModule } from '../modType';
import { GAME_ID } from '../../common';

export function registerModuleTranslationInstaller(context: types.IExtensionContext): void {
  context.registerInstaller(
    /*id:*/ `bannerlord-translation-installer`,
    /*priority:*/ 30,
    /*testSupported:*/ toBluebird(isModuleTranslationArchiveAsync),
    /*install:*/ toBluebird(
      (
        files: string[],
        destinationPath: string,
        gameId: string,
        _progressDelegate: types.ProgressDelegate,
        _choices?: unknown,
        _unattended?: boolean,
        archivePath?: string
      ) =>
        installModuleTranslationAsync(
          context.api,
          files,
          destinationPath,
          gameId,
          _progressDelegate,
          _choices,
          _unattended,
          archivePath
        )
    )
  );
}

export function registerModuleTranslationModType(context: types.IExtensionContext): void {
  context.registerModType(
    /*id:*/ 'bannerlord-translation',
    /*priority:*/ 30,
    /*isSupported:*/ (gameId) => gameId === GAME_ID,
    /*getPath:*/ (game) => getInstallPathModule(context.api, game),
    /*test:*/ toBluebird((instructions) => isModTypeModuleTranslation(instructions))
  );
}

export function registerModuleTranslationTableAttribute(context: types.IExtensionContext): void {
  context.registerTableAttribute('mods', {
    id: 'translationLanguagesText',
    name: 'Translation Languages',
    description: 'Detected languages included in this translation mod',
    placement: 'detail',
    position: 76,
    help: 'Comma-separated list of language codes found under ModuleData/Languages',
    isSortable: false,
    isGroupable: false,
    condition: () => selectors.activeGameId(context.api.getState()) === GAME_ID,
    calc: (mod: types.IMod) =>
      mod?.type === 'bannerlord-translation' ? mod?.attributes?.['translationLanguagesText'] : undefined,
    edit: {},
  });
}
