import { createOpenAI } from '@ai-sdk/openai';

export const feather = createOpenAI({
  baseURL: process.env.FEATHERLESSAI_BASE_URL,
  apiKey: process.env.OPENAI_API_KEY
});