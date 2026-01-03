import OpenAI from "openai";
import { tools, toolImplementations } from "./tools.js";
import { searchKnowledge } from "./knowledge.js";
import { readJSON } from "../db.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "mock-key",
});

const SYSTEM_PROMPT = `
You are a Maintenance Support Agent for a property management company.
Your goal is to assist tenants with maintenance issues by:
1. Collecting necessary information (what, where, urgency).
2. Attempting to auto-resolve simple issues using the knowledge base.
3. Escalating to a contractor or property manager if needed.

CONTEXT:
Tenant ID: {{TENANT_ID}}
Tenant: {{TENANT_NAME}}
Unit: {{TENANT_UNIT}}

GUIDELINES:
- EMERGENCY: If the issue involves fire, gas leak, active flooding, or immediate danger, advise the tenant to call emergency services immediately. Still create an escalation record if appropriate.
- KNOWLEDGE: Always search the knowledge base before suggesting a contractor. Summarize relevant guides for the tenant.
- TONE: Professional, empathetic, and efficient.
- ACTION: Use the 'create_work_order' tool to create work orders. You cannot create them by just saying it.

TOOL USAGE RULES:
- Use contractor ID (e.g., 'contractor-001'), NOT the contractor name.
- Use tenant_id: "{{TENANT_ID}}" from context.
- Wait for each tool's result before calling the next tool.

WORKFLOW FOR BOOKING A CONTRACTOR:
1. Call check_similar_issues first with tenant_id and new_issue_description
2. If similar issue found, ask tenant to confirm if it's the same or different
3. If no similar issues OR tenant confirms different, call get_available_contractors
4. Then call create_work_order with contractor_id (not name), tenant_id, issue_summary, and priority

DUPLICATE PREVENTION:
- ALWAYS call check_similar_issues BEFORE creating any work order
- If tenant confirms it's the same issue, reference existing work order instead

WORK ORDER MANAGEMENT:
- Use get_work_orders to check existing orders
- Use update_work_order to modify details, priority, or status
- Use complete_work_order when tenant confirms issue is resolved
- Use delete_work_order only for duplicates or errors (sparingly)

PHOTO ATTACHMENTS:
- Tenants can attach photos which will be included in work orders
- Mention to contractor that photos are available when creating the order
`;

export async function chatHandler(req, res) {
  try {
    const { messages, tenantId, attachments } = req.body;

    const tenants = readJSON("tenants.json");
    const tenant = tenants.find((t) => t.id === tenantId) || tenants[0];

    let systemPrompt = SYSTEM_PROMPT.replace(/\{\{TENANT_ID\}\}/g, tenant.id)
      .replace(/\{\{TENANT_NAME\}\}/g, tenant.name)
      .replace(/\{\{TENANT_UNIT\}\}/g, tenant.unit);

    if (attachments && attachments.length > 0) {
      systemPrompt += `\n\nNOTE: The tenant has attached ${attachments.length} photo(s) of the issue. These photos will be automatically included in any work order you create.`;
    }

    const MAX_HISTORY_MESSAGES = 4;
    const recentMessages =
      messages.length > MAX_HISTORY_MESSAGES
        ? messages.slice(-MAX_HISTORY_MESSAGES)
        : messages;

    if (messages.length > MAX_HISTORY_MESSAGES) {
      console.log(
        `[Chat] Trimmed conversation from ${messages.length} to ${recentMessages.length} messages`
      );
    }

    const conversation = [
      { role: "system", content: systemPrompt },
      ...recentMessages,
    ];

    const allToolCalls = [];
    const allToolResults = [];

    let loopCount = 0;
    const MAX_LOOPS = 5;

    while (loopCount < MAX_LOOPS) {
      loopCount++;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
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
        parallel_tool_calls: false,
      });

      const responseMessage = response.choices[0].message;

      if (!responseMessage.tool_calls) {
        return res.json({
          message: responseMessage,
          toolCalls: allToolCalls,
          toolResults: allToolResults,
        });
      }

      conversation.push(responseMessage);
      allToolCalls.push(...responseMessage.tool_calls);

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
              tenant_id: tenant.id,
            });
          } else if (functionName === "get_available_contractors") {
            result = toolImplementations.get_available_contractors(args);
          } else if (functionName === "create_work_order") {
            result = toolImplementations.create_work_order({
              ...args,
              tenant_id: tenant.id,
              attachments: attachments || [],
            });
          } else if (functionName === "get_work_orders") {
            result = toolImplementations.get_work_orders({
              ...args,
              tenant_id: tenant.id,
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
          console.error(`[Agent] Error executing tool ${functionName}:`, error);
          result = { error: error.message };
        }

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
    }

    return res.status(500).json({ error: "Agent loop limit exceeded" });
  } catch (error) {
    console.error("[Chat] Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
