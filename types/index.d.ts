export * from './journal';
export * from './profile';

declare global {
  interface Status {
    wix: string;
    openai: string;
    pinecone: string;
  }
}
