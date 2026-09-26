import { NextResponse } from "next/server";
import { getDataProvider } from "@/lib/data-provider";
import type { CommitRequest } from "@/lib/data-provider/types";

export async function POST(request: Request) {
  let body: CommitRequest;
  try {
    body = (await request.json()) as CommitRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body?.message || !Array.isArray(body.databaseFiles)) {
    return NextResponse.json({ error: "Expected { message, databaseFiles }" }, { status: 400 });
  }

  try {
    const provider = getDataProvider();
    const result = await provider.commit(body);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
