import OpenAI from "openai";
import { tools, toolImplementations } from "./tools.js";
import { searchKnowledge } from "./knowledge.js";
import { readJSON } from "../db.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "mock-key", // Fallback for dev without key if strictly needed, but will fail actual calls
});

// System Prompt Template
const SYSTEM_PROMPT = `
You are a helpful Maintenance Support Agent for a property management company.
Your goal is to assist tenants with maintenance issues by:
1. Collecting necessary information (what, where, urgency).
2. Attempting to auto-resolve simple issues using the knowledge base.
3. Escalating to a contractor or property manager if the issue cannot be resolved or is an emergency.

CONTEXT:
Tenant: {{TENANT_NAME}}
Unit: {{TENANT_UNIT}}

GUIDELINES:
- EMERGENCY: If the issue involves fire, gas leak, active flooding, or immediate danger, advise the tenant to call emergency services immediately and prioritize safety. Still create an escalation record if appropriate but getting them safe is #1.
- KNOWLEDGE: Always search the knowledge base for "how-to" guides before suggesting a contractor. If you find a relevant guide, summarize it for the tenant.
- TONE: Professional, empathetic, and efficient.
- TOOLS: Use tools to search knowledge, find contractors, and create work orders.
- ACTION: You CANNOT create a work order just by saying it. You MUST use the 'create_work_order' tool. If you haven't used the tool, verify with the user or use the tool. Start by finding a contractor, then ask the user to confirm, then use the tool.

When you create a work order using the tool, explicitly tell the user you have done so and provide the Work Order ID returned by the tool.
`;

export async function chatHandler(req, res) {
  try {
    const { messages, tenantId } = req.body;

    // Load Tenant Context
    const tenants = readJSON("tenants.json");
    const tenant = tenants.find((t) => t.id === tenantId) || tenants[0]; // Default to first tenant if not found

    const systemPrompt = SYSTEM_PROMPT.replace(
      "{{TENANT_NAME}}",
      tenant.name
    ).replace("{{TENANT_UNIT}}", tenant.unit);

    const conversation = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    // Track all tool calls and results across the loop
    const allToolCalls = [];
    const allToolResults = [];

    // Agent Loop
    let loopCount = 0;
    const MAX_LOOPS = 5;

    while (loopCount < MAX_LOOPS) {
      loopCount++;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: conversation,
        tools: [
          tools.search_knowledge_base.definition,
          tools.get_available_contractors.definition,
          tools.create_work_order.definition,
        ],
        tool_choice: "auto",
      });

      const responseMessage = response.choices[0].message;

      // If no tool calls, return the response with accumulated tool data
      if (!responseMessage.tool_calls) {
        return res.json({
          message: responseMessage,
          toolCalls: allToolCalls,
          toolResults: allToolResults,
        });
      }

      // Add assistant's message (with tool calls) to conversation
      conversation.push(responseMessage);

      // Store tool calls for frontend
      allToolCalls.push(...responseMessage.tool_calls);

      // Process all tool calls in this turn
      for (const toolCall of responseMessage.tool_calls) {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);
        let result;

        console.log(`[Agent] Calling tool: ${functionName} with args:`, args);

        try {
          if (functionName === "search_knowledge_base") {
            result = searchKnowledge(args.query);
          } else if (functionName === "get_available_contractors") {
            result = toolImplementations.get_available_contractors(args);
          } else if (functionName === "create_work_order") {
            result = toolImplementations.create_work_order({
              ...args,
              tenant_id: tenant.id,
            });
          } else {
            result = { error: "Unknown tool" };
          }
        } catch (error) {
          console.error(`Error executing tool ${functionName}:`, error);
          result = { error: error.message };
        }

        // Track result for frontend
        allToolResults.push({
          name: functionName,
          content: JSON.stringify(result),
        });

        conversation.push({
          tool_call_id: toolCall.id,
          role: "tool",
          name: functionName,
          content: JSON.stringify(result),
        });
      }
      // Loop continues to next LLM call with updated conversation history
    }

    // If max loops reached
    return res.status(500).json({ error: "Agent loop limit exceeded" });
  } catch (error) {
    console.error("Chat Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
