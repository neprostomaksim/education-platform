import { redirect } from "next/navigation";

// The prompt library grew into a general resource library. Old links (bot
// messages, the claim flow, bookmarks) keep working through this redirect.
export default function PromptsPage() {
  redirect("/library");
}
