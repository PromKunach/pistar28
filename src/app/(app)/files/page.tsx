import { Highlighter } from "@/components/ui/highlighter"
export default function HighlighterDemo() {
  return (
    <div className="text-center">
      <p className="leading-relaxed mb-500">
        The{" "}
        <Highlighter action="underline" color="#FF9800">
          Magic UI Highlighter
        </Highlighter>{" "}
        makes important{" "}
        <Highlighter action="highlight" color="#87CEFA">
          text stand out
        </Highlighter>{" "}
        effortlessly.
      </p>

    </div>
  )
}