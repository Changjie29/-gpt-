// Imported only by server API routes through the Next.js self-hosting alias.
// Never expose these values to client components or NEXT_PUBLIC_* variables.
export const env = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL,
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
  DEEPSEEK_MODEL: process.env.DEEPSEEK_MODEL,
  LLM_PRIMARY: process.env.LLM_PRIMARY,
};
