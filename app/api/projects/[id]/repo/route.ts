// export const runtime = "nodejs";

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  return new Response("Not Implemented", { status: 501 });
}
