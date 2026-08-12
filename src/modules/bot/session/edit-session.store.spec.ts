import { EditSessionStore } from './edit-session.store';
import { EDIT_SESSION_TTL_MS } from '../bot.constants';

describe('EditSessionStore', () => {
  let store: EditSessionStore;

  beforeEach(() => {
    store = new EditSessionStore();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns null when there is no pending session for the chat', () => {
    expect(store.consume('chat-1')).toBeNull();
  });

  it('returns the pending session and clears it (consume is one-shot)', () => {
    store.start('chat-1', 'draft-1', 'title');

    expect(store.consume('chat-1')).toEqual(
      expect.objectContaining({ draftId: 'draft-1', field: 'title' }),
    );
    expect(store.consume('chat-1')).toBeNull();
  });

  it('keeps sessions independent per chat', () => {
    store.start('chat-1', 'draft-1', 'title');
    store.start('chat-2', 'draft-2', 'tags');

    expect(store.consume('chat-1')).toEqual(
      expect.objectContaining({ draftId: 'draft-1', field: 'title' }),
    );
    expect(store.consume('chat-2')).toEqual(
      expect.objectContaining({ draftId: 'draft-2', field: 'tags' }),
    );
  });

  it('overwrites a previous pending session for the same chat', () => {
    store.start('chat-1', 'draft-1', 'title');
    store.start('chat-1', 'draft-1', 'tags');

    expect(store.consume('chat-1')).toEqual(
      expect.objectContaining({ field: 'tags' }),
    );
  });

  it('expires a session after the TTL elapses', () => {
    jest.useFakeTimers().setSystemTime(0);
    store.start('chat-1', 'draft-1', 'title');

    jest.setSystemTime(EDIT_SESSION_TTL_MS + 1);

    expect(store.consume('chat-1')).toBeNull();
  });

  it('clear() removes a pending session without returning it', () => {
    store.start('chat-1', 'draft-1', 'title');
    store.clear('chat-1');
    expect(store.consume('chat-1')).toBeNull();
  });
});
