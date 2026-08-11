import { Highlighter } from "@/components/ui/highlighter"
export default function HighlighterDemo() {
  return (
    <div className="text-center">
      <p className="leading-relaxed mb-500">
        The{" "}
        <Highlighter action="underline" color="#FF9800">
          Section pages 
        </Highlighter>{" "}
        goes here
        
      </p>

    </div>
  )
}