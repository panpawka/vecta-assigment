import { readJSON, writeJSON } from "../db.js";
import { z } from "zod";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "mock-key",
});

// Tool Definitions
export const tools = {
  search_knowledge_base: {
    definition: {
      type: "function",
      function: {
        name: "search_knowledge_base",
        description:
          "Search the knowledge base for self-help guides and policies.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description:
                'The search query, e.g., "smoke alarm beeping" or "reset boiler".',
            },
          },
          required: ["query"],
        },
      },
    },
  },
  get_available_contractors: {
    definition: {
      type: "function",
      function: {
        name: "get_available_contractors",
        description:
          "Get a list of available contractors for a specific trade. Returns contractor details including their ID (e.g., 'contractor-001'), name, phone, email, rates, and availability.",
        parameters: {
          type: "object",
          properties: {
            trade: {
              type: "string",
              enum: ["plumbing", "electrical", "gas", "general", "locksmith"],
              description: "The trade needed.",
            },
          },
          required: ["trade"],
        },
      },
    },
  },
  create_work_order: {
    definition: {
      type: "function",
      function: {
        name: "create_work_order",
        description:
          "Create a new work order to dispatch a contractor. You must call check_similar_issues and get_available_contractors first before creating a work order.",
        parameters: {
          type: "object",
          properties: {
            tenant_id: {
              type: "string",
              description:
                "The ID of the tenant (e.g., 'tenant-001'). This is provided in the chat context.",
            },
            issue_summary: {
              type: "string",
              description: "Brief summary of the issue.",
            },
            contractor_id: {
              type: "string",
              description:
                "The ID of the contractor to assign (e.g., 'contractor-001', 'contractor-005'). Get this from get_available_contractors.",
            },
            priority: {
              type: "string",
              enum: ["Low", "Medium", "High", "Emergency"],
              description: "Priority level of the work order.",
            },
            attachments: {
              type: "array",
              description:
                "Optional array of photo attachments provided by the tenant.",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  url: { type: "string" },
                  filename: { type: "string" },
                  mediaType: { type: "string" },
                },
              },
            },
          },
          required: ["tenant_id", "issue_summary", "contractor_id", "priority"],
        },
      },
    },
  },
  check_similar_issues: {
    definition: {
      type: "function",
      function: {
        name: "check_similar_issues",
        description:
          "Check if a similar issue already has an active work order for this tenant. You MUST call this BEFORE creating a new work order to avoid duplicates. If similar issues are found, ask the tenant to confirm whether it's a new issue or the same one.",
        parameters: {
          type: "object",
          properties: {
            tenant_id: {
              type: "string",
              description:
                "The ID of the tenant (e.g., 'tenant-001'). This is provided in the chat context.",
            },
            new_issue_description: {
              type: "string",
              description:
                "The description of the new issue the tenant is reporting.",
            },
          },
          required: ["tenant_id", "new_issue_description"],
        },
      },
    },
  },
  get_work_orders: {
    definition: {
      type: "function",
      function: {
        name: "get_work_orders",
        description:
          "Get all work orders for a tenant, optionally filtered by status. Useful for checking existing orders or their current state.",
        parameters: {
          type: "object",
          properties: {
            tenant_id: {
              type: "string",
              description: "The ID of the tenant (e.g., 'tenant-001').",
            },
            status_filter: {
              type: "string",
              enum: [
                "assigned",
                "pending",
                "in_progress",
                "completed",
                "solved",
              ],
              description:
                "Optional: filter by status. Omit to get all orders.",
            },
          },
          required: ["tenant_id"],
        },
      },
    },
  },
  update_work_order: {
    definition: {
      type: "function",
      function: {
        name: "update_work_order",
        description:
          "Update details of an existing work order such as issue summary, priority, or status.",
        parameters: {
          type: "object",
          properties: {
            work_order_id: {
              type: "string",
              description:
                "The ID of the work order to update (e.g., 'wo-123').",
            },
            issue_summary: {
              type: "string",
              description: "New issue summary/description.",
            },
            priority: {
              type: "string",
              enum: ["Low", "Medium", "High", "Emergency"],
              description: "New priority level.",
            },
            status: {
              type: "string",
              enum: [
                "assigned",
                "pending",
                "in_progress",
                "completed",
                "solved",
              ],
              description: "New status.",
            },
          },
          required: ["work_order_id"],
        },
      },
    },
  },
  complete_work_order: {
    definition: {
      type: "function",
      function: {
        name: "complete_work_order",
        description:
          "Mark a work order as completed/solved. Use this when the issue has been resolved.",
        parameters: {
          type: "object",
          properties: {
            work_order_id: {
              type: "string",
              description:
                "The ID of the work order to complete (e.g., 'wo-123').",
            },
            resolution_notes: {
              type: "string",
              description: "Optional notes about how the issue was resolved.",
            },
          },
          required: ["work_order_id"],
        },
      },
    },
  },
  delete_work_order: {
    definition: {
      type: "function",
      function: {
        name: "delete_work_order",
        description:
          "Delete a work order. Use with caution - typically for duplicate or erroneous orders.",
        parameters: {
          type: "object",
          properties: {
            work_order_id: {
              type: "string",
              description:
                "The ID of the work order to delete (e.g., 'wo-123').",
            },
          },
          required: ["work_order_id"],
        },
      },
    },
  },
};

// Tool Implementations
export const toolImplementations = {
  get_available_contractors: ({ trade }) => {
    const contractors = readJSON("contractors.json");
    if (!contractors) return [];
    return contractors.filter(
      (c) =>
        (c.service || "").toLowerCase() === (trade || "").toLowerCase() ||
        (c.name || "").toLowerCase().includes((trade || "").toLowerCase())
    );
  },

  check_similar_issues: async ({ tenant_id, new_issue_description }) => {
    const workOrders = readJSON("work_orders.json") || [];

    // Get active work orders for this tenant
    const activeOrders = workOrders.filter((wo) => {
      const woTenantId = wo.tenant_id || wo.tenantId;
      const woStatus = (wo.status || "").toLowerCase();
      const isActiveStatus =
        woStatus === "assigned" ||
        woStatus === "pending" ||
        woStatus === "in_progress";
      return woTenantId === tenant_id && isActiveStatus;
    });

    // If no active orders, no duplicates possible
    if (activeOrders.length === 0) {
      return {
        has_similar: false,
        active_orders_count: 0,
        message:
          "No active work orders found for this tenant. Safe to create a new work order.",
      };
    }

    // Format existing issues for LLM comparison
    const existingIssues = activeOrders.map((wo) => ({
      id: wo.id,
      issue_summary: wo.issue_summary || wo.issueDescription,
      trade: wo.trade || "unknown",
      priority: wo.priority,
      status: wo.status,
      created_at: wo.created_at || wo.createdAt,
    }));

    // Use LLM to compare issues semantically
    try {
      const comparisonResult = await compareIssuesWithLLM(
        new_issue_description,
        existingIssues
      );

      if (comparisonResult.has_similar) {
        return {
          has_similar: true,
          similar_order: comparisonResult.similar_order,
          reasoning: comparisonResult.reasoning,
          message: `A similar issue was found: "${comparisonResult.similar_order.issue_summary}" (Work Order: ${comparisonResult.similar_order.id}). Please ask the tenant to confirm if this is the same issue or a genuinely different one before creating a new work order.`,
        };
      }

      return {
        has_similar: false,
        active_orders_count: activeOrders.length,
        existing_issues: existingIssues.map((o) => ({
          id: o.id,
          issue_summary: o.issue_summary,
          trade: o.trade,
        })),
        message:
          "No similar issues found among active work orders. Safe to create a new work order if needed.",
      };
    } catch (error) {
      console.error("[check_similar_issues] LLM comparison error:", error);
      // Fallback: return existing orders for manual review
      return {
        has_similar: false,
        error: "Could not perform semantic comparison",
        active_orders_count: activeOrders.length,
        existing_issues: existingIssues.map((o) => ({
          id: o.id,
          issue_summary: o.issue_summary,
          trade: o.trade,
        })),
        message:
          "Unable to automatically compare issues. Please review existing orders manually before creating a new one.",
      };
    }
  },

  create_work_order: ({
    tenant_id,
    issue_summary,
    contractor_id,
    priority,
    attachments,
  }) => {
    const workOrders = readJSON("work_orders.json") || [];
    const contractors = readJSON("contractors.json") || [];

    // Try to find contractor by ID first
    let contractor = contractors.find((c) => c.id === contractor_id);

    // If not found by ID, try to find by name (case-insensitive)
    if (!contractor) {
      contractor = contractors.find(
        (c) => c.name.toLowerCase() === contractor_id.toLowerCase()
      );
    }

    // If still not found, try partial name match
    if (!contractor) {
      contractor = contractors.find((c) =>
        c.name.toLowerCase().includes(contractor_id.toLowerCase())
      );
    }

    if (!contractor) {
      throw new Error(
        `Contractor with ID or name "${contractor_id}" not found. Available contractors: ${contractors
          .map((c) => `${c.id} (${c.name})`)
          .join(", ")}`
      );
    }

    // Note: Duplicate detection is now handled by check_similar_issues tool
    // which uses LLM-based semantic comparison for better accuracy

    const newOrder = {
      id: `wo-${Date.now()}`,
      tenant_id,
      issue_summary,
      contractor_id: contractor.id,
      contractor_name: contractor.name,
      trade: contractor.service,
      priority,
      status: "assigned",
      created_at: new Date().toISOString(),
      attachments: attachments || [],
    };

    workOrders.push(newOrder);
    writeJSON("work_orders.json", workOrders);

    console.log(`[create_work_order] Created work order: ${newOrder.id}`);

    // Return work order WITHOUT attachments to prevent token overflow in conversation
    // Attachments are saved in the work order file, but don't need to go back to LLM
    const { attachments: _, ...orderWithoutAttachments } = newOrder;
    return {
      ...orderWithoutAttachments,
      attachments_count: attachments?.length || 0,
      note:
        attachments?.length > 0
          ? `${attachments.length} photo(s) attached and saved with work order`
          : undefined,
    };
  },

  get_work_orders: ({ tenant_id, status_filter }) => {
    const workOrders = readJSON("work_orders.json") || [];

    // Filter by tenant
    let filtered = workOrders.filter(
      (wo) => (wo.tenant_id || wo.tenantId) === tenant_id
    );

    // Optionally filter by status
    if (status_filter) {
      filtered = filtered.filter(
        (wo) => (wo.status || "").toLowerCase() === status_filter.toLowerCase()
      );
    }

    // Normalize field names for consistency
    // Strip attachments to prevent token overflow in LLM conversation
    return filtered.map((wo) => ({
      id: wo.id,
      tenant_id: wo.tenant_id || wo.tenantId,
      issue_summary: wo.issue_summary || wo.issueDescription,
      contractor_id: wo.contractor_id || wo.contractorId,
      contractor_name: wo.contractor_name,
      trade: wo.trade,
      priority: wo.priority,
      status: wo.status,
      created_at: wo.created_at || wo.createdAt,
      attachments_count: (wo.attachments || []).length,
      has_photos: (wo.attachments || []).length > 0,
    }));
  },

  update_work_order: ({ work_order_id, issue_summary, priority, status }) => {
    const workOrders = readJSON("work_orders.json") || [];
    const orderIndex = workOrders.findIndex((wo) => wo.id === work_order_id);

    if (orderIndex === -1) {
      throw new Error(`Work order ${work_order_id} not found.`);
    }

    // Update only provided fields
    if (issue_summary !== undefined) {
      workOrders[orderIndex].issue_summary = issue_summary;
    }
    if (priority !== undefined) {
      workOrders[orderIndex].priority = priority;
    }
    if (status !== undefined) {
      workOrders[orderIndex].status = status;
    }

    workOrders[orderIndex].updated_at = new Date().toISOString();

    writeJSON("work_orders.json", workOrders);

    console.log(`[update_work_order] Updated work order: ${work_order_id}`);

    // Return without attachments to prevent token overflow
    const { attachments, ...orderWithoutAttachments } = workOrders[orderIndex];
    return {
      ...orderWithoutAttachments,
      attachments_count: (attachments || []).length,
    };
  },

  complete_work_order: ({ work_order_id, resolution_notes }) => {
    const workOrders = readJSON("work_orders.json") || [];
    const orderIndex = workOrders.findIndex((wo) => wo.id === work_order_id);

    if (orderIndex === -1) {
      throw new Error(`Work order ${work_order_id} not found.`);
    }

    workOrders[orderIndex].status = "solved";
    workOrders[orderIndex].updated_at = new Date().toISOString();
    workOrders[orderIndex].resolved_at = new Date().toISOString();

    if (resolution_notes) {
      workOrders[orderIndex].resolution_notes = resolution_notes;
    }

    writeJSON("work_orders.json", workOrders);

    console.log(`[complete_work_order] Completed work order: ${work_order_id}`);

    // Return without attachments to prevent token overflow
    const { attachments, ...orderWithoutAttachments } = workOrders[orderIndex];
    return {
      ...orderWithoutAttachments,
      attachments_count: (attachments || []).length,
    };
  },

  delete_work_order: ({ work_order_id }) => {
    const workOrders = readJSON("work_orders.json") || [];
    const orderIndex = workOrders.findIndex((wo) => wo.id === work_order_id);

    if (orderIndex === -1) {
      throw new Error(`Work order ${work_order_id} not found.`);
    }

    const deletedOrder = workOrders[orderIndex];
    workOrders.splice(orderIndex, 1);

    writeJSON("work_orders.json", workOrders);

    console.log(`[delete_work_order] Deleted work order: ${work_order_id}`);

    // Return without attachments to prevent token overflow
    const { attachments, ...orderWithoutAttachments } = deletedOrder;
    return {
      success: true,
      deleted_order: {
        ...orderWithoutAttachments,
        attachments_count: (attachments || []).length,
      },
      message: `Work order ${work_order_id} has been deleted.`,
    };
  },
};

// LLM-based semantic comparison of issues
async function compareIssuesWithLLM(newIssue, existingIssues) {
  const existingIssuesList = existingIssues
    .map(
      (o, i) =>
        `${i + 1}. [ID: ${o.id}] "${o.issue_summary}" (Trade: ${
          o.trade
        }, Priority: ${o.priority})`
    )
    .join("\n");

  const prompt = `You are a maintenance issue classifier. Compare a NEW issue against EXISTING active work orders to determine if they describe the same underlying problem.

EXISTING ACTIVE WORK ORDERS:
${existingIssuesList}

NEW ISSUE REPORTED:
"${newIssue}"

Determine if the NEW issue is essentially the SAME problem as any existing work order. Consider:
- Same root cause (e.g., "locked out" and "can't get into my flat" are the same)
- Same location/item being reported (e.g., "kitchen tap leaking" and "water from kitchen faucet" are the same)
- Ignore minor wording differences

Respond in JSON format:
{
  "is_similar": true/false,
  "matching_order_id": "wo-xxx" or null,
  "reasoning": "Brief explanation of why they are or aren't the same issue"
}

Only return the JSON, nothing else.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.1,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "issue_comparison",
        strict: true,
        schema: {
          type: "object",
          properties: {
            is_similar: { type: "boolean" },
            matching_order_id: { type: ["string", "null"] },
            reasoning: { type: "string" },
          },
          required: ["is_similar", "matching_order_id", "reasoning"],
          additionalProperties: false,
        },
      },
    },
  });

  const result = JSON.parse(response.choices[0].message.content);

  if (result.is_similar && result.matching_order_id) {
    const matchedOrder = existingIssues.find(
      (o) => o.id === result.matching_order_id
    );
    return {
      has_similar: true,
      similar_order: matchedOrder,
      reasoning: result.reasoning,
    };
  }

  return {
    has_similar: false,
    reasoning: result.reasoning,
  };
}
