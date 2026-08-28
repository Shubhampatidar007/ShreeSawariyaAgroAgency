import { createFileRoute } from "@tanstack/react-router";
import { AboutExperience } from "@/components/about/AboutExperience";

const title = "Shubham Patidar — Digital Builder";
const description =
  "An immersive story about building digital experiences at the intersection of agriculture, technology, and practical problem solving.";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: AboutExperience,
});
