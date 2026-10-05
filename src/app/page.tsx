import { redirect } from "next/navigation";

// The gallery is the home experience (mirrors /#/galeri of the old site).
export default function HomePage() {
  redirect("/galeri");
}
