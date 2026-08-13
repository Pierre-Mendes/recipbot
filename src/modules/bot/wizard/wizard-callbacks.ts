import { WizardStep } from './wizard-step.enum';

export type EntryMenuChoice = 'texto' | 'imagem' | 'link';
export type ReviewAction = 'confirm' | 'edit';
export type ReviewPart = 'title_ingredients' | 'instructions';

export const menuCallback = (choice: EntryMenuChoice): string =>
  `wz:menu:${choice}`;
export const SKIP_CALLBACK = 'wz:skip';
export const reviewCallback = (
  action: ReviewAction,
  part: ReviewPart,
): string => `wz:review:${action}:${part}`;
export const backGotoCallback = (step: WizardStep): string => `wz:back:${step}`;
export const forwardGotoCallback = (step: WizardStep): string =>
  `wz:fwd:${step}`;
export const SAVE_CALLBACK = 'wz:save';
export const SAVE_ANYWAY_CALLBACK = 'wz:save_anyway';
export const COMPLETE_NOW_CALLBACK = 'wz:complete_now';
export const EDIT_SOMETHING_CALLBACK = 'wz:edit_something';
export const CANCEL_CALLBACK = 'wz:cancel';
export const RESUME_CALLBACK = 'wz:resume';
export const RESTART_CALLBACK = 'wz:restart';

export const MENU_ACTION_PATTERN = /^wz:menu:(texto|imagem|link)$/;
export const REVIEW_ACTION_PATTERN =
  /^wz:review:(confirm|edit):(title_ingredients|instructions)$/;
export const BACK_GOTO_PATTERN = /^wz:back:(.+)$/;
export const FORWARD_GOTO_PATTERN = /^wz:fwd:(.+)$/;
