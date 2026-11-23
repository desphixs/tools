import { headers } from "next/headers";
import { auth } from "@/features/auth/server/config";

export async function getServerSession() {
  return auth.api.getSession({ headers: await headers() });
}
