import { readJSON, writeJSON } from "../db.js";
import { z } from "zod";

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
          "Create a new work order to dispatch a contractor. You must call get_available_contractors first to get the contractor ID.",
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
          },
          required: ["tenant_id", "issue_summary", "contractor_id", "priority"],
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

  create_work_order: ({
    tenant_id,
    issue_summary,
    contractor_id,
    priority,
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

    const newOrder = {
      id: `wo-${Date.now()}`,
      tenant_id,
      issue_summary,
      contractor_id: contractor.id, // Always use the actual ID
      contractor_name: contractor.name,
      trade: contractor.service,
      priority,
      status: "assigned",
      created_at: new Date().toISOString(),
    };

    workOrders.push(newOrder);
    writeJSON("work_orders.json", workOrders);

    return newOrder;
  },
};
