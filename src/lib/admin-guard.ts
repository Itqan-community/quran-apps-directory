import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/** Call at the top of every admin page/action in Plans 3-4. */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
  return session;
}
