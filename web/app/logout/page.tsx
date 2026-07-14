import { redirect } from "next/navigation";
import { destroySession } from "@/lib/session";

export default async function LogoutPage() {
  await destroySession();
  redirect("/login");
}
