import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
} from "@/components/ai-elements/tool";

interface ToolCall {
  id: string;
  function: {
    name: string;
    arguments: string;
  };
  type: "function";
}

interface AgentActionsProps {
  toolCalls?: ToolCall[];
}

export const AgentActions = ({ toolCalls }: AgentActionsProps) => {
  if (!toolCalls || toolCalls.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 mt-2">
      {toolCalls.map((call) => {
        let parsedArgs: Record<string, unknown> = {};
        try {
          parsedArgs = JSON.parse(call.function.arguments);
        } catch {
          parsedArgs = { raw: call.function.arguments };
        }

        return (
          <Tool
            key={call.id}
            defaultOpen={false}>
            <ToolHeader
              title={formatToolName(call.function.name)}
              type="tool-invocation"
              state="output-available"
            />
            <ToolContent>
              <ToolInput input={parsedArgs} />
            </ToolContent>
          </Tool>
        );
      })}
    </div>
  );
};

// Helper to format tool names for display
function formatToolName(name: string): string {
  return name
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
