import { serverGetKugouLocalCookie } from "@spindeck/player/server";

export async function loader() {
  try {
    const cookie = await serverGetKugouLocalCookie();
    return Response.json({ cookie });
  } catch (err) {
    return Response.json({ cookie: null, error: String(err) });
  }
}
