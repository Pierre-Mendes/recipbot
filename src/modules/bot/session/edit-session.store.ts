import { Injectable } from '@nestjs/common';
import { EditableDraftField } from '../../recipes/editable-draft-field';
import { EDIT_SESSION_TTL_MS } from '../bot.constants';

export interface PendingEdit {
  draftId: string;
  field: EditableDraftField;
  expiresAt: number;
}

/**
 * Tracks "the next text message from this chat is the replacement value
 * for <field> on <draftId>" between an inline-keyboard tap and the
 * follow-up message. In-memory and per-process: fine for a single-instance
 * zero-cost deployment, but a restart or horizontal scale-out loses
 * in-flight edits — the user just taps the edit button again.
 */
@Injectable()
export class EditSessionStore {
  private readonly sessions = new Map<string, PendingEdit>();

  start(chatId: string, draftId: string, field: EditableDraftField): void {
    this.sessions.set(chatId, {
      draftId,
      field,
      expiresAt: Date.now() + EDIT_SESSION_TTL_MS,
    });
  }

  /** Reads and clears the session in one step so a reply is only ever applied once. */
  consume(chatId: string): PendingEdit | null {
    const session = this.sessions.get(chatId);
    if (!session) {
      return null;
    }
    this.sessions.delete(chatId);
    return session.expiresAt >= Date.now() ? session : null;
  }

  clear(chatId: string): void {
    this.sessions.delete(chatId);
  }
}
