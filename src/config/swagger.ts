import swaggerJSDoc from "swagger-jsdoc";

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Finance Dashboard API",
      version: "1.0.0",
      description: "Role-based finance backend API.\n\nSwagger UI quick start:\n1) Call /auth/register to create the first admin (only if no users exist).\n2) Call /auth/login to get JWT + refresh token.\n3) Click Authorize and paste the JWT.\n4) Call the remaining endpoints."
    },
    servers: [{ url: "/" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      }
    },
    security: [{ bearerAuth: [] }],
    paths: {
      "/health": {
        get: {
          summary: "Health check",
          responses: {
            "200": { description: "OK" }
          }
        }
      },
      "/auth/register": {
        post: {
          summary: "Register user (bootstrap/admin only)",
          description: "Creates the first admin if no users exist. Otherwise, include an admin JWT.",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name", "email", "password"],
                  properties: {
                    name: { type: "string" },
                    email: { type: "string", format: "email" },
                    password: { type: "string" },
                    role: { type: "string", enum: ["viewer", "analyst", "admin"] }
                  }
                },
                example: {
                  name: "Admin",
                  email: "admin+{ts}@example.com",
                  password: "Str0ng!Password123",
                  role: "admin"
                }
              }
            }
          },
          responses: {
            "201": { description: "User created" },
            "403": { description: "Forbidden" }
          }
        }
      },
      "/auth/login": {
        post: {
          summary: "Login",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password"],
                  properties: {
                    email: { type: "string", format: "email" },
                    password: { type: "string" }
                  }
                },
                example: {
                  email: "admin@example.com",
                  password: "Str0ng!Password123"
                }
              }
            }
          },
          responses: {
            "200": { description: "JWT + refresh token" },
            "401": { description: "Invalid credentials" }
          }
        }
      },
      "/auth/refresh": {
        post: {
          summary: "Refresh token",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["refreshToken"],
                  properties: {
                    refreshToken: { type: "string" }
                  }
                },
                example: {
                  refreshToken: "<refreshToken>"
                }
              }
            }
          },
          responses: { "200": { description: "New access token" } }
        }
      },
      "/auth/logout": {
        post: {
          summary: "Logout",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["refreshToken"],
                  properties: {
                    refreshToken: { type: "string" }
                  }
                },
                example: {
                  refreshToken: "<refreshToken>"
                }
              }
            }
          },
          responses: { "200": { description: "Logged out" } }
        }
      },
      "/users": {
        get: { summary: "List users", responses: { "200": { description: "OK" } } },
        post: {
          summary: "Create user",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name", "email", "password"],
                  properties: {
                    name: { type: "string" },
                    email: { type: "string", format: "email" },
                    password: { type: "string" },
                    role: { type: "string", enum: ["viewer", "analyst", "admin"] }
                  }
                },
                example: {
                  name: "Analyst",
                  email: "analyst+{ts}@example.com",
                  password: "Str0ng!Password123",
                  role: "analyst"
                }
              }
            }
          },
          responses: { "201": { description: "Created" } }
        }
      },
      "/users/{id}": {
        get: {
          summary: "Get user",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "OK" }, "404": { description: "Not found" } }
        },
        patch: {
          summary: "Update user",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    role: { type: "string", enum: ["viewer", "analyst", "admin"] },
                    status: { type: "string", enum: ["active", "inactive", "locked"] }
                  }
                },
                example: {
                  role: "analyst",
                  status: "active"
                }
              }
            }
          },
          responses: { "200": { description: "Updated" } }
        }
      },
      "/records": {
        get: {
          summary: "List records",
          parameters: [
            { name: "dateFrom", in: "query", schema: { type: "string", format: "date-time" } },
            { name: "dateTo", in: "query", schema: { type: "string", format: "date-time" } },
            { name: "category", in: "query", schema: { type: "string" } },
            { name: "type", in: "query", schema: { type: "string", enum: ["income", "expense"] } },
            { name: "search", in: "query", schema: { type: "string" } },
            { name: "page", in: "query", schema: { type: "integer", minimum: 1 } },
            { name: "pageSize", in: "query", schema: { type: "integer", minimum: 1, maximum: 100 } },
            { name: "includeDeleted", in: "query", schema: { type: "boolean" } }
          ],
          responses: { "200": { description: "OK" } }
        },
        post: {
          summary: "Create record",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["amount", "type", "category", "date"],
                  properties: {
                    amount: { type: "number" },
                    type: { type: "string", enum: ["income", "expense"] },
                    category: { type: "string" },
                    date: { type: "string", format: "date-time" },
                    notes: { type: "string" }
                  }
                },
                example: {
                  amount: 1200,
                  type: "income",
                  category: "salary",
                  date: "2026-04-05T10:00:00.000Z",
                  notes: "Monthly payroll"
                }
              }
            }
          },
          responses: { "201": { description: "Created" } }
        }
      },
      "/records/{id}": {
        get: {
          summary: "Get record",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "OK" }, "404": { description: "Not found" } }
        },
        patch: {
          summary: "Update record",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    amount: { type: "number" },
                    type: { type: "string", enum: ["income", "expense"] },
                    category: { type: "string" },
                    date: { type: "string", format: "date-time" },
                    notes: { type: "string" }
                  }
                },
                example: {
                  notes: "Updated"
                }
              }
            }
          },
          responses: { "200": { description: "Updated" } }
        },
        delete: {
          summary: "Delete record (soft delete)",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "204": { description: "Deleted" } }
        }
      },
      "/summary": {
        get: { summary: "Summary totals", responses: { "200": { description: "OK" } } }
      },
      "/summary/recent": {
        get: {
          summary: "Recent activity",
          parameters: [{ name: "limit", in: "query", schema: { type: "integer" } }],
          responses: { "200": { description: "OK" } }
        }
      },
      "/summary/trends": {
        get: {
          summary: "Trends",
          parameters: [
            { name: "period", in: "query", schema: { type: "string", enum: ["monthly", "weekly"] } },
            { name: "dateFrom", in: "query", schema: { type: "string", format: "date-time" } },
            { name: "dateTo", in: "query", schema: { type: "string", format: "date-time" } }
          ],
          responses: { "200": { description: "OK" } }
        }
      }
    }
  },
  apis: []
});