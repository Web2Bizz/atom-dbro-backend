import { z } from 'zod';

export const sendEmailSchema = z.object({
  to: z.string().email('Invalid email address'),
  subject: z.string().min(1, 'Subject is required'),
  html: z.string().min(1, 'HTML content is required'),
});

export type SendEmailDto = z.infer<typeof sendEmailSchema>;

export class SendEmailDtoClass {
  to!: string;
  subject!: string;
  html!: string;
}

