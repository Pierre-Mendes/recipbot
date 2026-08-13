import { RecipeDraft } from '../../recipes/interfaces/draft.interface';
import { Recipe } from '../../recipes/interfaces/recipe.interface';
import { WizardStep } from './wizard-step.enum';

export interface StepListEntry {
  step: WizardStep;
  label: string;
  answered: boolean;
}

export type WizardResult =
  | { kind: 'entry_menu' }
  | { kind: 'prompt'; step: WizardStep; prompt: string; core: boolean }
  | {
      kind: 'review';
      part: 'title_ingredients' | 'instructions';
      draft: RecipeDraft;
    }
  | { kind: 'step_list'; mode: 'back' | 'forward'; entries: StepListEntry[] }
  | { kind: 'confirmation'; draft: RecipeDraft }
  | { kind: 'soft_warning'; draft: RecipeDraft; missingFields: string[] }
  | { kind: 'saved'; recipe: Recipe }
  | { kind: 'cancelled' }
  | { kind: 'resume_offer'; draft: RecipeDraft }
  | { kind: 'no_active_wizard' }
  | {
      kind: 'validation_error';
      step: WizardStep;
      message: string;
      core: boolean;
    };
