import { NextResponse } from "next/server";
import { getAvailableModels } from "@/lib/ai-client";

export async function GET() {
  const models = getAvailableModels();
  return NextResponse.json({ models });
}
