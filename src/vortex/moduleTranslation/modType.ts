import { types } from 'vortex-api';
import { isModTypeModule } from '../modType';

export const isModTypeModuleTranslation = (instructions: types.IInstruction[]): boolean => {
  const languageFileRegex = /ModuleData[\\/]+Languages[\\/]+[^\\/]+[\\/]+language_data\.xml$/i;

  const hasLanguageFile = instructions.some(
    (instr) => instr.type === 'copy' && languageFileRegex.test(instr.destination ?? '')
  );
  const hasSubmoduleFile = isModTypeModule(instructions);
  return hasLanguageFile && !hasSubmoduleFile;
};
