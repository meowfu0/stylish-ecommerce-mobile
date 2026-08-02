import { Logger, ServiceUnavailableException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

import { buildActionEmailContent } from './action-email.template';
import type { ActionEmail, EmailDeliveryPort } from './email-delivery.types';

type EmailTransport = Pick<Transporter<SMTPTransport.SentMessageInfo>, 'sendMail'>;

type SanitizedSmtpError = Error & {
  code?: unknown;
  command?: unknown;
  responseCode?: unknown;
};

export class NodemailerEmailService implements EmailDeliveryPort {
  private readonly from: string;
  private readonly frontendUrl: string;
  private readonly logger = new Logger(NodemailerEmailService.name);
  private readonly replyTo?: string;
  private readonly transport: EmailTransport;

  constructor(configService: ConfigService, transport?: EmailTransport) {
    const fromAddress = configService.getOrThrow<string>('email.from.address');
    const fromName = configService.getOrThrow<string>('email.from.name');

    this.frontendUrl = configService.getOrThrow<string>('auth.frontendUrl');
    this.from = `${fromName} <${fromAddress}>`;
    this.replyTo = configService.get<string>('email.replyTo');
    this.transport =
      transport ??
      nodemailer.createTransport({
        auth: {
          pass: configService.getOrThrow<string>('email.smtp.password'),
          user: configService.getOrThrow<string>('email.smtp.user'),
        },
        connectionTimeout: configService.getOrThrow<number>('email.smtp.connectionTimeoutMs'),
        host: configService.getOrThrow<string>('email.smtp.host'),
        port: configService.getOrThrow<number>('email.smtp.port'),
        secure: configService.getOrThrow<boolean>('email.smtp.secure'),
      });
  }

  async send(message: ActionEmail): Promise<void> {
    const content = buildActionEmailContent(this.frontendUrl, message);
    const messageId = `<auth.${message.purpose.toLowerCase()}.${message.idempotencyKey}@stylish.local>`;

    try {
      const result = await this.transport.sendMail({
        from: this.from,
        html: content.html,
        messageId,
        subject: content.subject,
        text: content.text,
        to: message.recipient,
        ...(this.replyTo ? { replyTo: this.replyTo } : {}),
      });

      if (result.rejected.length > 0 || result.accepted.length === 0) {
        this.logger.error({
          acceptedCount: result.accepted.length,
          event: 'email.smtp.rejected',
          purpose: message.purpose,
          rejectedCount: result.rejected.length,
        });
        throw this.deliveryUnavailable();
      }

      this.logger.log({
        event: 'email.smtp.accepted',
        messageId: result.messageId,
        purpose: message.purpose,
      });
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      const smtpError = error as SanitizedSmtpError;
      this.logger.error({
        code: typeof smtpError.code === 'string' ? smtpError.code : undefined,
        command: typeof smtpError.command === 'string' ? smtpError.command : undefined,
        errorName: error instanceof Error ? error.name : 'UnknownError',
        event: 'email.smtp.failed',
        purpose: message.purpose,
        responseCode:
          typeof smtpError.responseCode === 'number' ? smtpError.responseCode : undefined,
      });
      throw this.deliveryUnavailable();
    }
  }

  private deliveryUnavailable(): ServiceUnavailableException {
    return new ServiceUnavailableException({
      message: 'Email delivery is temporarily unavailable',
      errors: [{ field: 'email', message: 'Email delivery is temporarily unavailable' }],
    });
  }
}
