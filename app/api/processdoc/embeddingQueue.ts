// embeddingQueue.ts
import { embed } from 'ai';

type TextEmbeddingModel = Parameters<typeof embed>[0]['model'];

interface QueueConfig {
  rpmLimit: number;
  tpmLimit: number;
  model: TextEmbeddingModel;
}

export class EmbeddingQueue {
  private queue: Array<{ text: string, resolve: Function, reject: Function }> = [];
  private activeRequests = 0;
  private tokensProcessed = 0;
  private requestsProcessed = 0;
  private lastReset = Date.now();
  private config: QueueConfig;

  constructor(config: QueueConfig) {
    this.config = config;
    setInterval(() => this.resetCounters(), 60000);
  }

  async add(text: string): Promise<number[]> {
    return new Promise((resolve, reject) => {
      this.queue.push({ text, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.queue.length === 0 || this.activeRequests > 0) return;

    // Reset counters if a minute has passed
    if (Date.now() - this.lastReset > 60000) {
      this.resetCounters();
    }

    // Check rate limits
    if (this.requestsProcessed >= this.config.rpmLimit || 
        this.tokensProcessed >= this.config.tpmLimit) {
      setTimeout(() => this.processQueue(), 1000);
      return;
    }

    const { text, resolve, reject } = this.queue.shift()!;
    this.activeRequests++;

    try {
      const { embedding } = await embed({
        model: this.config.model,
        value: text
      });

      this.requestsProcessed++;
      this.tokensProcessed += Math.ceil(text.length / 4); // Approximate tokens
      resolve(embedding);
    } catch (error) {
      reject(error);
    } finally {
      this.activeRequests--;
      this.processQueue();
    }
  }

  private resetCounters() {
    this.tokensProcessed = 0;
    this.requestsProcessed = 0;
    this.lastReset = Date.now();
  }
}
