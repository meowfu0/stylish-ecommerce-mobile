import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { buildActionEmailContent } from './action-email.template';
import type { ActionEmail, EmailDeliveryPort } from './email-delivery.types';

@Injectable()
export class EmailPreviewService implements EmailDeliveryPort {
  private readonly enabled: boolean;
  private readonly frontendUrl: string;
  private readonly logger = new Logger(EmailPreviewService.name);
  private readonly previewDirectory: string;

  constructor(configService: ConfigService) {
    this.enabled = configService.getOrThrow<boolean>('email.previewEnabled');
    this.previewDirectory = resolve(
      process.cwd(),
      configService.getOrThrow<string>('email.previewDirectory'),
    );
    this.frontendUrl = configService.getOrThrow<string>('auth.frontendUrl');
  }

  async send(message: ActionEmail): Promise<void> {
    if (!this.enabled) {
      throw new ServiceUnavailableException({
        message: 'Email delivery is temporarily unavailable',
        errors: [{ field: 'email', message: 'Email delivery is not configured' }],
      });
    }

    const previewId = randomUUID();
    const content = buildActionEmailContent(this.frontendUrl, message);
    const preview = [
      `To: ${message.recipient}`,
      `Purpose: ${message.purpose}`,
      `Subject: ${content.subject}`,
      '',
      content.link,
      '',
      'Development preview only. Do not use this adapter in production.',
    ].join('\n');

    await mkdir(this.previewDirectory, { recursive: true, mode: 0o700 });
    await writeFile(resolve(this.previewDirectory, `${previewId}.txt`), preview, {
      encoding: 'utf8',
      flag: 'wx',
      mode: 0o600,
    });

    this.logger.log({
      event: 'email.preview.created',
      previewId,
      purpose: message.purpose,
    });
  }
}
