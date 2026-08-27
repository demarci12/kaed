#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createClient } from "@supabase/supabase-js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in kead/.env"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Service-role key bypasses RLS, so we restrict operations to this known
// table set rather than allowing arbitrary/system table access.
const TABLES = [
  "projects",
  "project_logs",
  "open_points",
  "goals",
  "investments",
  "knowledge_cards",
  "clients",
  "client_notes",
  "business_ideas",
  "system_actors",
  "system_goals",
  "system_use_cases",
  "system_requirements",
  "finance_categories",
  "finance_transactions",
  "finance_budgets",
  "finance_limits",
];

function assertTable(table) {
  if (!TABLES.includes(table)) {
    throw new Error(
      `Unknown table "${table}". Known tables: ${TABLES.join(", ")}`
    );
  }
}

const server = new Server(
  { name: "kead-mcp", version: "0.0.1" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "list_tables",
      description: "List the tables available in the kead Supabase database.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "select_rows",
      description:
        "Select rows from a kead table, with optional equality filters, ordering, and limit.",
      inputSchema: {
        type: "object",
        properties: {
          table: { type: "string", enum: TABLES },
          columns: {
            type: "string",
            description: "Comma-separated columns, default '*'",
          },
          filters: {
            type: "object",
            description: "Column: value pairs matched with equality",
          },
          order_by: { type: "string" },
          ascending: { type: "boolean", default: true },
          limit: { type: "number", default: 50 },
        },
        required: ["table"],
      },
    },
    {
      name: "insert_row",
      description: "Insert one row into a kead table. Returns the inserted row.",
      inputSchema: {
        type: "object",
        properties: {
          table: { type: "string", enum: TABLES },
          values: { type: "object" },
        },
        required: ["table", "values"],
      },
    },
    {
      name: "update_rows",
      description:
        "Update rows in a kead table matching equality filters. Filters are required to avoid accidental full-table updates.",
      inputSchema: {
        type: "object",
        properties: {
          table: { type: "string", enum: TABLES },
          filters: { type: "object" },
          values: { type: "object" },
        },
        required: ["table", "filters", "values"],
      },
    },
    {
      name: "delete_rows",
      description:
        "Delete rows from a kead table matching equality filters. Filters are required to avoid accidental full-table deletes.",
      inputSchema: {
        type: "object",
        properties: {
          table: { type: "string", enum: TABLES },
          filters: { type: "object" },
        },
        required: ["table", "filters"],
      },
    },
  ],
}));

function textResult(data) {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

function errorResult(message) {
  return {
    content: [{ type: "text", text: `Error: ${message}` }],
    isError: true,
  };
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    switch (name) {
      case "list_tables":
        return textResult(TABLES);

      case "select_rows": {
        assertTable(args.table);
        let q = supabase.from(args.table).select(args.columns || "*");
        if (args.filters) q = q.match(args.filters);
        if (args.order_by)
          q = q.order(args.order_by, { ascending: args.ascending ?? true });
        q = q.limit(args.limit ?? 50);
        const { data, error } = await q;
        if (error) return errorResult(error.message);
        return textResult(data);
      }

      case "insert_row": {
        assertTable(args.table);
        const { data, error } = await supabase
          .from(args.table)
          .insert(args.values)
          .select();
        if (error) return errorResult(error.message);
        return textResult(data);
      }

      case "update_rows": {
        assertTable(args.table);
        if (!args.filters || Object.keys(args.filters).length === 0)
          return errorResult("filters must be a non-empty object");
        const { data, error } = await supabase
          .from(args.table)
          .update(args.values)
          .match(args.filters)
          .select();
        if (error) return errorResult(error.message);
        return textResult(data);
      }

      case "delete_rows": {
        assertTable(args.table);
        if (!args.filters || Object.keys(args.filters).length === 0)
          return errorResult("filters must be a non-empty object");
        const { data, error } = await supabase
          .from(args.table)
          .delete()
          .match(args.filters)
          .select();
        if (error) return errorResult(error.message);
        return textResult(data);
      }

      default:
        return errorResult(`Unknown tool: ${name}`);
    }
  } catch (err) {
    return errorResult(err.message);
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
