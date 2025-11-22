import { z } from 'zod';

export const sendMessageSchema = z.object({
  queue: z.string().min(1, 'Queue name is required'),
  message: z.any().refine((val) => val !== undefined && val !== null, {
    message: 'Message is required and cannot be null or undefined',
  }), // Любой тип сообщения, но не undefined/null
  options: z
    .object({
      durable: z.boolean().optional(),
      persistent: z.boolean().optional(),
      expiration: z.string().optional(),
      priority: z.number().optional(),
    })
    .optional(),
});

export type SendMessageDto = z.infer<typeof sendMessageSchema>;

export class SendMessageDtoClass {
  queue!: string;
  message!: any;
  options?: {
    durable?: boolean;
    persistent?: boolean;
    expiration?: string;
    priority?: number;
  };
}

