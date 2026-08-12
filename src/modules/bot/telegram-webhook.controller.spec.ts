import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { Response } from 'express';
import { TelegramWebhookController } from './telegram-webhook.controller';
import { BotService } from './bot.service';

function configWithSecret(secret: string | undefined) {
  return {
    get: jest.fn((key: string) =>
      key === 'TELEGRAM_WEBHOOK_SECRET' ? secret : undefined,
    ),
  } as unknown as ConfigService;
}

describe('TelegramWebhookController', () => {
  let botService: { bot: { handleUpdate: jest.Mock } };
  let res: Response;

  beforeEach(() => {
    botService = { bot: { handleUpdate: jest.fn() } };
    res = {} as Response;
  });

  it('rejects a request with no secret header', async () => {
    const controller = new TelegramWebhookController(
      botService as unknown as BotService,
      configWithSecret('correct-secret'),
    );

    await expect(
      controller.handleWebhook(undefined, {} as never, res),
    ).rejects.toThrow(UnauthorizedException);
    expect(botService.bot.handleUpdate).not.toHaveBeenCalled();
  });

  it('rejects a request with the wrong secret header', async () => {
    const controller = new TelegramWebhookController(
      botService as unknown as BotService,
      configWithSecret('correct-secret'),
    );

    await expect(
      controller.handleWebhook('wrong-secret', {} as never, res),
    ).rejects.toThrow(UnauthorizedException);
    expect(botService.bot.handleUpdate).not.toHaveBeenCalled();
  });

  it('rejects every request when no secret is configured', async () => {
    const controller = new TelegramWebhookController(
      botService as unknown as BotService,
      configWithSecret(undefined),
    );

    await expect(
      controller.handleWebhook('anything', {} as never, res),
    ).rejects.toThrow(UnauthorizedException);
    expect(botService.bot.handleUpdate).not.toHaveBeenCalled();
  });

  it('forwards the update to the bot when the secret matches', async () => {
    const controller = new TelegramWebhookController(
      botService as unknown as BotService,
      configWithSecret('correct-secret'),
    );
    const update = { update_id: 1 };

    await controller.handleWebhook('correct-secret', update as never, res);

    expect(botService.bot.handleUpdate).toHaveBeenCalledWith(update, res);
  });
});
