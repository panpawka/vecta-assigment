import OpenAI from "openai";
import { tools, toolImplementations } from "./tools.js";
import { searchKnowledge } from "./knowledge.js";
import { readJSON } from "../db.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "mock-key",
});

// System Prompt Template
const SYSTEM_PROMPT = `
You are a helpful Maintenance Support Agent for a property management company.
Your goal is to assist tenants with maintenance issues by:
1. Collecting necessary information (what, where, urgency).
2. Attempting to auto-resolve simple issues using the knowledge base.
3. Escalating to a contractor or property manager if the issue cannot be resolved or is an emergency.

CONTEXT:
Tenant ID: {{TENANT_ID}}
Tenant: {{TENANT_NAME}}
Unit: {{TENANT_UNIT}}

GUIDELINES:
- EMERGENCY: If the issue involves fire, gas leak, active flooding, or immediate danger, advise the tenant to call emergency services immediately and prioritize safety. Still create an escalation record if appropriate but getting them safe is #1.
- KNOWLEDGE: Always search the knowledge base for "how-to" guides before suggesting a contractor. If you find a relevant guide, summarize it for the tenant.
- TONE: Professional, empathetic, and efficient.
- TOOLS: Use tools to search knowledge, find contractors, and create work orders.
- ACTION: You CANNOT create a work order just by saying it. You MUST use the 'create_work_order' tool.

IMPORTANT TOOL USAGE RULES:
- When creating a work order, you MUST use the contractor ID (e.g., 'contractor-001', 'contractor-005'), NOT the contractor name.
- For tenant_id, use "{{TENANT_ID}}" from the context above.
- WAIT for each tool's result before calling the next tool. Do NOT call them simultaneously.

WORKFLOW FOR BOOKING A CONTRACTOR (FOLLOW THIS EXACT ORDER):
1. FIRST: Call check_similar_issues with:
   - tenant_id: "{{TENANT_ID}}"
   - new_issue_description: The issue the tenant described
   
2. IF check_similar_issues returns has_similar: true:
   - Tell the tenant about the existing similar work order
   - Ask them to confirm: "Is this the same issue as [existing issue], or is this a different problem?"
   - WAIT for their response before proceeding
   - Only create a new work order if they confirm it's a DIFFERENT issue
   
3. IF no similar issues OR tenant confirms it's different:
   - Call get_available_contractors with the appropriate trade
   - Review the returned list and select a suitable contractor
   
4. THEN: Call create_work_order using:
   - tenant_id: "{{TENANT_ID}}"
   - contractor_id: The contractor's ID (e.g., "contractor-005"), NOT their name
   - issue_summary: Brief description of the issue
   - priority: "Low", "Medium", "High", or "Emergency"

When you create a work order, tell the user and provide the Work Order ID.

DUPLICATE PREVENTION:
- ALWAYS call check_similar_issues BEFORE creating any work order
- This prevents duplicate orders for the same underlying problem
- If tenant confirms it's the same issue, reference the existing work order instead of creating a new one

WORK ORDER MANAGEMENT:
- Use get_work_orders to check a tenant's existing work orders
- Use update_work_order to modify issue details, priority, or status
- Use complete_work_order when a tenant confirms an issue is resolved
- Use delete_work_order only for duplicate or erroneous orders (use sparingly)
- When tenant asks about status of their orders, use get_work_orders

PHOTO ATTACHMENTS:
- Tenants can attach photos of issues when reporting problems
- These photos will be automatically included in the work order
- Mention to the contractor that photos are available when creating the order
`;

export async function chatHandler(req, res) {
  try {
    const { messages, tenantId, attachments } = req.body;

    // Load Tenant Context
    const tenants = readJSON("tenants.json");
    const tenant = tenants.find((t) => t.id === tenantId) || tenants[0];

    let systemPrompt = SYSTEM_PROMPT.replace(/\{\{TENANT_ID\}\}/g, tenant.id)
      .replace(/\{\{TENANT_NAME\}\}/g, tenant.name)
      .replace(/\{\{TENANT_UNIT\}\}/g, tenant.unit);

    // Add note about attachments if present (but don't send actual image data to LLM)
    if (attachments && attachments.length > 0) {
      systemPrompt += `\n\nNOTE: The tenant has attached ${attachments.length} photo(s) of the issue. These photos will be automatically included in any work order you create. You don't need to mention this unless relevant to the conversation.`;
    }

    // Limit conversation history to prevent token overflow
    // Keep only the last 4 messages (2 exchanges) to stay within token limits
    const MAX_HISTORY_MESSAGES = 4;
    const recentMessages =
      messages.length > MAX_HISTORY_MESSAGES
        ? messages.slice(-MAX_HISTORY_MESSAGES)
        : messages;

    if (messages.length > MAX_HISTORY_MESSAGES) {
      console.log(
        `[Chat] Trimmed conversation history from ${messages.length} to ${recentMessages.length} messages`
      );
    }

    const conversation = [
      { role: "system", content: systemPrompt },
      ...recentMessages,
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
        model: "gpt-4o-mini", // Use mini for better rate limits and lower cost
        messages: conversation,
        tools: [
          tools.search_knowledge_base.definition,
          tools.check_similar_issues.definition,
          tools.get_available_contractors.definition,
          tools.create_work_order.definition,
          tools.get_work_orders.definition,
          tools.update_work_order.definition,
          tools.complete_work_order.definition,
          tools.delete_work_order.definition,
        ],
        tool_choice: "auto",
        parallel_tool_calls: false, // Disable parallel tool calls to prevent race conditions
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
          } else if (functionName === "check_similar_issues") {
            result = await toolImplementations.check_similar_issues({
              ...args,
              tenant_id: tenant.id, // Always override with actual tenant ID
            });
          } else if (functionName === "get_available_contractors") {
            result = toolImplementations.get_available_contractors(args);
          } else if (functionName === "create_work_order") {
            result = toolImplementations.create_work_order({
              ...args,
              tenant_id: tenant.id, // Always override with actual tenant ID
              attachments: attachments || [], // Pass attachments from request
            });
          } else if (functionName === "get_work_orders") {
            result = toolImplementations.get_work_orders({
              ...args,
              tenant_id: tenant.id, // Always override with actual tenant ID
            });
          } else if (functionName === "update_work_order") {
            result = toolImplementations.update_work_order(args);
          } else if (functionName === "complete_work_order") {
            result = toolImplementations.complete_work_order(args);
          } else if (functionName === "delete_work_order") {
            result = toolImplementations.delete_work_order(args);
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
