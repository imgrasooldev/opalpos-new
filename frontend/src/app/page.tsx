import { redirect } from "next/navigation";

/**
 * Root — abhi koi dashboard nahi, is liye seedha products par.
 * Logged out ho to `AuthGuard` wahan se `/login` bhej dega.
 */
export default function Home() {
  redirect("/products");
}
