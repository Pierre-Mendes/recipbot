import { Injectable } from '@nestjs/common';
import { WizardStep } from './wizard-step.enum';
import {
  WIZARD_TTL_MS,
  WIZARD_WARNING_THRESHOLDS_MIN,
} from './wizard.constants';

export type CaptureType = 'texto' | 'imagem' | 'link';

export interface WizardSession {
  draftId: string;
  step: WizardStep;
  captureType: CaptureType;
  lastActivityAt: number;
  /** Thresholds already warned about since the last touch() — cleared on activity so a fresh 30-min window re-arms them. */
  warnedThresholdsMin: number[];
}

export interface WizardWarning {
  chatId: string;
  draftId: string;
  minutesRemaining: number;
}

export interface WizardExpiry {
  chatId: string;
  draftId: string;
}

export interface WizardSweepResult {
  warnings: WizardWarning[];
  expired: WizardExpiry[];
}

/**
 * In-memory wizard session state, keyed by telegram_chat_id (US08). This is
 * a disposable mirror of recipe_drafts.wizard_step/collected_fields — the
 * durable copy lives in Postgres, so losing this map (restart, or the
 * 30-min TTL) only loses "which step was I on", never the answers already
 * saved to the draft row.
 *
 * sweep() is a pure state transition (no timers, no Telegram calls) so it's
 * directly testable by passing an explicit `now`. The caller (BotService)
 * is expected to invoke it on an interval and turn the results into actual
 * outbound messages.
 */
@Injectable()
export class WizardCacheService {
  private readonly sessions = new Map<string, WizardSession>();

  start(
    chatId: string,
    draftId: string,
    step: WizardStep,
    captureType: CaptureType,
    now = Date.now(),
  ): void {
    this.sessions.set(chatId, {
      draftId,
      step,
      captureType,
      lastActivityAt: now,
      warnedThresholdsMin: [],
    });
  }

  get(chatId: string): WizardSession | undefined {
    return this.sessions.get(chatId);
  }

  has(chatId: string): boolean {
    return this.sessions.has(chatId);
  }

  /** Resets the inactivity clock and re-arms warning thresholds — called on every user reply. */
  touch(chatId: string, now = Date.now()): void {
    const session = this.sessions.get(chatId);
    if (!session) return;
    session.lastActivityAt = now;
    session.warnedThresholdsMin = [];
  }

  updateStep(chatId: string, step: WizardStep): void {
    const session = this.sessions.get(chatId);
    if (!session) return;
    session.step = step;
  }

  remove(chatId: string): void {
    this.sessions.delete(chatId);
  }

  sweep(now = Date.now()): WizardSweepResult {
    const warnings: WizardWarning[] = [];
    const expired: WizardExpiry[] = [];

    for (const [chatId, session] of this.sessions) {
      const remainingMs = WIZARD_TTL_MS - (now - session.lastActivityAt);

      if (remainingMs <= 0) {
        expired.push({ chatId, draftId: session.draftId });
        this.sessions.delete(chatId);
        continue;
      }

      const remainingMin = Math.floor(remainingMs / 60_000);
      for (const threshold of WIZARD_WARNING_THRESHOLDS_MIN) {
        if (
          remainingMin <= threshold &&
          !session.warnedThresholdsMin.includes(threshold)
        ) {
          warnings.push({
            chatId,
            draftId: session.draftId,
            minutesRemaining: threshold,
          });
          session.warnedThresholdsMin.push(threshold);
        }
      }
    }

    return { warnings, expired };
  }
}
