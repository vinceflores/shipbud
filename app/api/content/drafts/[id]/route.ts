export const runtime = "nodejs";

export async function PATCH(
  _req: Request,
  context: { params: { id: string } },
) {
  return new Response("Not Implemented", { status: 501 });
}
