import { z } from 'zod';

export const publishMessageSchema = z.object({
  exchange: z.string().min(1, 'Exchange name is required'),
  routingKey: z.string().min(1, 'Routing key is required'),
  message: z.any(), // Любой тип сообщения
  exchangeType: z.enum(['direct', 'topic', 'fanout', 'headers']).optional().default('direct'),
  options: z
    .object({
      durable: z.boolean().optional(),
      persistent: z.boolean().optional(),
    })
    .optional(),
});

export type PublishMessageDto = z.infer<typeof publishMessageSchema>;

export class PublishMessageDtoClass {
  exchange!: string;
  routingKey!: string;
  message!: any;
  exchangeType?: 'direct' | 'topic' | 'fanout' | 'headers';
  options?: {
    durable?: boolean;
    persistent?: boolean;
  };
}

