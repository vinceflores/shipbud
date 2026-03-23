export const runtime = "nodejs";

export async function GET(
  _req: Request,
  context: { params: { request_id: string } },
) {
  return new Response("Not Implemented", { status: 501 });
}
