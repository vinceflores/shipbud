// export const runtime = "nodejs";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  return new Response("Not Implemented", { status: 501 });
}

export async function PATCH(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  return new Response("Not Implemented", { status: 501 });
}
