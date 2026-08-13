import { WizardCacheService } from './wizard-cache.service';
import { WizardStep } from './wizard-step.enum';
import { WIZARD_TTL_MS } from './wizard.constants';

const MIN = 60_000;

describe('WizardCacheService', () => {
  let cache: WizardCacheService;

  beforeEach(() => {
    cache = new WizardCacheService();
  });

  describe('start / get / has / remove', () => {
    it('creates a session retrievable by chatId', () => {
      cache.start('chat-1', 'draft-1', WizardStep.NOME, 'texto', 0);

      expect(cache.has('chat-1')).toBe(true);
      expect(cache.get('chat-1')).toEqual({
        draftId: 'draft-1',
        step: WizardStep.NOME,
        captureType: 'texto',
        lastActivityAt: 0,
        warnedThresholdsMin: [],
      });
    });

    it('has() is false and get() is undefined for an unknown chat', () => {
      expect(cache.has('nope')).toBe(false);
      expect(cache.get('nope')).toBeUndefined();
    });

    it('remove() clears the session', () => {
      cache.start('chat-1', 'draft-1', WizardStep.NOME, 'texto', 0);
      cache.remove('chat-1');
      expect(cache.has('chat-1')).toBe(false);
    });

    it('keeps sessions for different chats independent', () => {
      cache.start('chat-1', 'draft-1', WizardStep.NOME, 'texto', 0);
      cache.start('chat-2', 'draft-2', WizardStep.TAGS, 'imagem', 0);

      expect(cache.get('chat-1')?.step).toBe(WizardStep.NOME);
      expect(cache.get('chat-2')?.step).toBe(WizardStep.TAGS);
    });
  });

  describe('updateStep', () => {
    it('changes the step of an existing session', () => {
      cache.start('chat-1', 'draft-1', WizardStep.NOME, 'texto', 0);
      cache.updateStep('chat-1', WizardStep.INGREDIENTES);
      expect(cache.get('chat-1')?.step).toBe(WizardStep.INGREDIENTES);
    });

    it('is a no-op for an unknown chat', () => {
      expect(() => cache.updateStep('nope', WizardStep.TAGS)).not.toThrow();
    });
  });

  describe('touch', () => {
    it('resets lastActivityAt and re-arms warning thresholds', () => {
      cache.start('chat-1', 'draft-1', WizardStep.NOME, 'texto', 0);
      cache.sweep(20 * MIN); // fires the 20-, 15-, and 10-min-remaining warnings

      cache.touch('chat-1', 20 * MIN);

      const session = cache.get('chat-1')!;
      expect(session.lastActivityAt).toBe(20 * MIN);
      expect(session.warnedThresholdsMin).toEqual([]);
    });

    it('is a no-op for an unknown chat', () => {
      expect(() => cache.touch('nope')).not.toThrow();
    });
  });

  describe('sweep — warnings', () => {
    it('fires no warning before 10 minutes of inactivity have elapsed', () => {
      cache.start('chat-1', 'draft-1', WizardStep.NOME, 'texto', 0);
      const { warnings, expired } = cache.sweep(9 * MIN);
      expect(warnings).toEqual([]);
      expect(expired).toEqual([]);
    });

    it('fires the 20-minutes-remaining warning once elapsed reaches 10 minutes', () => {
      cache.start('chat-1', 'draft-1', WizardStep.NOME, 'texto', 0);
      const { warnings } = cache.sweep(10 * MIN);
      expect(warnings).toEqual([
        { chatId: 'chat-1', draftId: 'draft-1', minutesRemaining: 20 },
      ]);
    });

    it('does not repeat the same threshold on a later sweep with no new activity', () => {
      cache.start('chat-1', 'draft-1', WizardStep.NOME, 'texto', 0);
      cache.sweep(10 * MIN);
      const { warnings } = cache.sweep(11 * MIN);
      expect(warnings).toEqual([]);
    });

    it('fires the 15- and 10-minutes-remaining warnings at their respective elapsed marks', () => {
      cache.start('chat-1', 'draft-1', WizardStep.NOME, 'texto', 0);
      cache.sweep(10 * MIN);

      expect(cache.sweep(15 * MIN).warnings).toEqual([
        { chatId: 'chat-1', draftId: 'draft-1', minutesRemaining: 15 },
      ]);
      expect(cache.sweep(20 * MIN).warnings).toEqual([
        { chatId: 'chat-1', draftId: 'draft-1', minutesRemaining: 10 },
      ]);
    });

    it('fires every threshold crossed since the last sweep, in one call, if the gap skips over them', () => {
      cache.start('chat-1', 'draft-1', WizardStep.NOME, 'texto', 0);

      // elapsed=16min -> remaining=14min: past both the 20- and 15-min
      // marks, but not yet the 10-min one.
      const { warnings } = cache.sweep(16 * MIN);
      const minutesRemaining = warnings
        .map((w) => w.minutesRemaining)
        .sort((a, b) => b - a);
      expect(minutesRemaining).toEqual([20, 15]);
    });

    it('touch() lets the same threshold fire again after a fresh countdown', () => {
      cache.start('chat-1', 'draft-1', WizardStep.NOME, 'texto', 0);
      cache.sweep(10 * MIN);
      cache.touch('chat-1', 10 * MIN);

      const { warnings } = cache.sweep(20 * MIN); // 10 min after the touch = 20-min-remaining mark again
      expect(warnings).toEqual([
        { chatId: 'chat-1', draftId: 'draft-1', minutesRemaining: 20 },
      ]);
    });

    it('tracks warnings per chat independently', () => {
      cache.start('chat-1', 'draft-1', WizardStep.NOME, 'texto', 0);
      cache.start('chat-2', 'draft-2', WizardStep.TAGS, 'imagem', 5 * MIN);

      const { warnings } = cache.sweep(10 * MIN);
      expect(warnings).toEqual([
        { chatId: 'chat-1', draftId: 'draft-1', minutesRemaining: 20 },
      ]);
      // chat-2 has only been inactive for 5 minutes at this point — no warning yet.
      expect(warnings.some((w) => w.chatId === 'chat-2')).toBe(false);
    });
  });

  describe('sweep — expiration', () => {
    it('expires a session once the full TTL has elapsed', () => {
      cache.start('chat-1', 'draft-1', WizardStep.NOME, 'texto', 0);

      const { expired, warnings } = cache.sweep(WIZARD_TTL_MS);

      expect(expired).toEqual([{ chatId: 'chat-1', draftId: 'draft-1' }]);
      expect(warnings).toEqual([]);
      expect(cache.has('chat-1')).toBe(false);
    });

    it('does not expire a session one millisecond before the TTL', () => {
      cache.start('chat-1', 'draft-1', WizardStep.NOME, 'texto', 0);
      const { expired } = cache.sweep(WIZARD_TTL_MS - 1);
      expect(expired).toEqual([]);
      expect(cache.has('chat-1')).toBe(true);
    });

    it('never reports an already-expired session again on a later sweep', () => {
      cache.start('chat-1', 'draft-1', WizardStep.NOME, 'texto', 0);
      cache.sweep(WIZARD_TTL_MS);
      const { expired } = cache.sweep(WIZARD_TTL_MS + MIN);
      expect(expired).toEqual([]);
    });

    it('expires sessions independently per chat', () => {
      cache.start('chat-1', 'draft-1', WizardStep.NOME, 'texto', 0);
      cache.start('chat-2', 'draft-2', WizardStep.TAGS, 'imagem', 10 * MIN);

      const { expired } = cache.sweep(WIZARD_TTL_MS);

      expect(expired).toEqual([{ chatId: 'chat-1', draftId: 'draft-1' }]);
      expect(cache.has('chat-2')).toBe(true);
    });
  });
});
