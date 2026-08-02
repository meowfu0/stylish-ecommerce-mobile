import { Module, type Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { EMAIL_DELIVERY, type EmailDeliveryPort } from './email-delivery.types';
import { EmailPreviewService } from './email-preview.service';
import { NodemailerEmailService } from './nodemailer-email.service';

const emailDeliveryProvider: Provider<EmailDeliveryPort> = {
  inject: [ConfigService],
  provide: EMAIL_DELIVERY,
  useFactory: (configService: ConfigService): EmailDeliveryPort => {
    const provider = configService.getOrThrow<'preview' | 'smtp'>('email.provider');

    return provider === 'smtp'
      ? new NodemailerEmailService(configService)
      : new EmailPreviewService(configService);
  },
};

@Module({
  exports: [EMAIL_DELIVERY],
  providers: [emailDeliveryProvider],
})
export class EmailModule {}
