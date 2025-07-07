import OpenAI from 'openai';
import { NextResponse } from 'next/server';

console.log("✅ API KEY:", process.env.OPENAI_API_KEY);
console.log("✅ ASSISTANT ID:", process.env.ASSISTANT_ID);

export const runtime = 'node'; // optional
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req) {
  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'No message provided' }, { status: 400 });
    }

    const thread = await openai.beta.threads.create();
    await openai

