"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// apps/api/src/main.ts
var import_fastify = __toESM(require("fastify"));
var import_cors = __toESM(require("@fastify/cors"));
var import_websocket3 = __toESM(require("@fastify/websocket"));
var import_client5 = require("@prisma/client");

// apps/api/src/routes/auth.ts
var import_bcryptjs = __toESM(require("bcryptjs"));
var import_jsonwebtoken = __toESM(require("jsonwebtoken"));
var JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
var JWT_EXPIRES_IN = 60 * 60 * 24 * 7;
async function authRoutes(server2) {
  const prisma2 = server2.prisma;
  server2.post(
    "/login",
    async (request, reply) => {
      const { email, password } = request.body;
      if (!email || !password) {
        return reply.status(400).send({ error: "Email ve \u015Fifre gerekli" });
      }
      const user = await prisma2.user.findUnique({
        where: { email }
      });
      if (!user || !user.active) {
        return reply.status(401).send({ error: "Ge\xE7ersiz email veya \u015Fifre" });
      }
      const validPassword = await import_bcryptjs.default.compare(password, user.password);
      if (!validPassword) {
        return reply.status(401).send({ error: "Ge\xE7ersiz email veya \u015Fifre" });
      }
      const token = import_jsonwebtoken.default.sign({ userId: user.id, role: user.role }, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN
      });
      const expiresAt = /* @__PURE__ */ new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      await prisma2.session.create({
        data: {
          userId: user.id,
          token,
          expiresAt
        }
      });
      await prisma2.activityLog.create({
        data: {
          userId: user.id,
          action: "LOGIN",
          details: { method: "email" },
          ipAddress: request.ip
        }
      });
      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatar: user.avatar
        }
      };
    }
  );
  server2.post(
    "/pin-login",
    async (request, reply) => {
      const { pin } = request.body;
      if (!pin || pin.length !== 4) {
        return reply.status(400).send({ error: "Ge\xE7erli bir PIN giriniz" });
      }
      const user = await prisma2.user.findFirst({
        where: { pin, active: true }
      });
      if (!user) {
        return reply.status(401).send({ error: "Ge\xE7ersiz PIN" });
      }
      const token = import_jsonwebtoken.default.sign(
        { userId: user.id, role: user.role },
        JWT_SECRET,
        { expiresIn: 60 * 60 * 12 }
        // 12 hours in seconds
      );
      const expiresAt = /* @__PURE__ */ new Date();
      expiresAt.setHours(expiresAt.getHours() + 12);
      await prisma2.session.create({
        data: {
          userId: user.id,
          token,
          expiresAt
        }
      });
      await prisma2.activityLog.create({
        data: {
          userId: user.id,
          action: "LOGIN",
          details: { method: "pin" },
          ipAddress: request.ip
        }
      });
      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatar: user.avatar
        }
      };
    }
  );
  server2.post(
    "/logout",
    async (request, reply) => {
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        return reply.status(401).send({ error: "Token gerekli" });
      }
      const token = authHeader.replace("Bearer ", "");
      await prisma2.session.deleteMany({
        where: { token }
      });
      return { success: true };
    }
  );
  server2.get("/me", async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return reply.status(401).send({ error: "Token gerekli" });
    }
    const token = authHeader.replace("Bearer ", "");
    try {
      const decoded = import_jsonwebtoken.default.verify(token, JWT_SECRET);
      const user = await prisma2.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          avatar: true,
          active: true
        }
      });
      if (!user || !user.active) {
        return reply.status(401).send({ error: "Kullan\u0131c\u0131 bulunamad\u0131" });
      }
      return { user };
    } catch (err) {
      return reply.status(401).send({ error: "Ge\xE7ersiz token" });
    }
  });
  server2.post(
    "/change-password",
    async (request, reply) => {
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        return reply.status(401).send({ error: "Token gerekli" });
      }
      const token = authHeader.replace("Bearer ", "");
      const { currentPassword, newPassword } = request.body;
      if (!currentPassword || !newPassword) {
        return reply.status(400).send({ error: "Mevcut ve yeni \u015Fifre gerekli" });
      }
      try {
        const decoded = import_jsonwebtoken.default.verify(token, JWT_SECRET);
        const user = await prisma2.user.findUnique({
          where: { id: decoded.userId }
        });
        if (!user) {
          return reply.status(401).send({ error: "Kullan\u0131c\u0131 bulunamad\u0131" });
        }
        const validPassword = await import_bcryptjs.default.compare(
          currentPassword,
          user.password
        );
        if (!validPassword) {
          return reply.status(401).send({ error: "Mevcut \u015Fifre yanl\u0131\u015F" });
        }
        const hashedPassword = await import_bcryptjs.default.hash(newPassword, 10);
        await prisma2.user.update({
          where: { id: user.id },
          data: { password: hashedPassword }
        });
        await prisma2.activityLog.create({
          data: {
            userId: user.id,
            action: "PASSWORD_CHANGE",
            ipAddress: request.ip
          }
        });
        return { success: true };
      } catch (err) {
        return reply.status(401).send({ error: "Ge\xE7ersiz token" });
      }
    }
  );
}

// apps/api/src/routes/users.ts
var import_client2 = require("@prisma/client");
var import_bcryptjs2 = __toESM(require("bcryptjs"));

// apps/api/src/middleware/auth.ts
var import_jsonwebtoken2 = __toESM(require("jsonwebtoken"));
var import_client = require("@prisma/client");
var JWT_SECRET2 = process.env.JWT_SECRET || "your-secret-key";
async function verifyAuth(request, reply) {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return reply.status(401).send({ error: "Token gerekli" });
  }
  const token = authHeader.replace("Bearer ", "");
  try {
    const decoded = import_jsonwebtoken2.default.verify(token, JWT_SECRET2);
    request.user = decoded;
  } catch (err) {
    return reply.status(401).send({ error: "Ge\xE7ersiz token" });
  }
}
async function verifyAdmin(request, reply) {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return reply.status(401).send({ error: "Token gerekli" });
  }
  const token = authHeader.replace("Bearer ", "");
  try {
    const decoded = import_jsonwebtoken2.default.verify(token, JWT_SECRET2);
    if (decoded.role !== import_client.UserRole.ADMIN && decoded.role !== import_client.UserRole.MANAGER) {
      return reply.status(403).send({ error: "Bu i\u015Flem i\xE7in yetkiniz yok" });
    }
    request.user = decoded;
  } catch (err) {
    return reply.status(401).send({ error: "Ge\xE7ersiz token" });
  }
}
async function verifyKitchen(request, reply) {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return reply.status(401).send({ error: "Token gerekli" });
  }
  const token = authHeader.replace("Bearer ", "");
  try {
    const decoded = import_jsonwebtoken2.default.verify(token, JWT_SECRET2);
    const allowedRoles = [import_client.UserRole.ADMIN, import_client.UserRole.MANAGER, import_client.UserRole.KITCHEN];
    if (!allowedRoles.includes(decoded.role)) {
      return reply.status(403).send({ error: "Bu i\u015Flem i\xE7in yetkiniz yok" });
    }
    request.user = decoded;
  } catch (err) {
    return reply.status(401).send({ error: "Ge\xE7ersiz token" });
  }
}

// apps/api/src/routes/users.ts
async function userRoutes(server2) {
  const prisma2 = server2.prisma;
  server2.get("/", { preHandler: verifyAdmin }, async (request) => {
    const users = await prisma2.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        active: true,
        createdAt: true
      },
      orderBy: { createdAt: "desc" }
    });
    return { users };
  });
  server2.get("/:id", { preHandler: verifyAdmin }, async (request, reply) => {
    const { id } = request.params;
    const user = await prisma2.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        active: true,
        createdAt: true,
        updatedAt: true
      }
    });
    if (!user) {
      return reply.status(404).send({ error: "Kullan\u0131c\u0131 bulunamad\u0131" });
    }
    return { user };
  });
  server2.post("/", { preHandler: verifyAdmin }, async (request, reply) => {
    const { email, password, name, role, pin } = request.body;
    if (!email || !password || !name) {
      return reply.status(400).send({ error: "Email, \u015Fifre ve isim gerekli" });
    }
    const existing = await prisma2.user.findUnique({ where: { email } });
    if (existing) {
      return reply.status(400).send({ error: "Bu email zaten kullan\u0131l\u0131yor" });
    }
    if (pin) {
      const existingPin = await prisma2.user.findFirst({ where: { pin } });
      if (existingPin) {
        return reply.status(400).send({ error: "Bu PIN zaten kullan\u0131l\u0131yor" });
      }
    }
    const hashedPassword = await import_bcryptjs2.default.hash(password, 10);
    const user = await prisma2.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role || import_client2.UserRole.WAITER,
        pin
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true
      }
    });
    return { user };
  });
  server2.put("/:id", { preHandler: verifyAdmin }, async (request, reply) => {
    const { id } = request.params;
    const { email, name, role, pin, active, password } = request.body;
    const user = await prisma2.user.findUnique({ where: { id } });
    if (!user) {
      return reply.status(404).send({ error: "Kullan\u0131c\u0131 bulunamad\u0131" });
    }
    if (email && email !== user.email) {
      const existing = await prisma2.user.findUnique({ where: { email } });
      if (existing) {
        return reply.status(400).send({ error: "Bu email zaten kullan\u0131l\u0131yor" });
      }
    }
    if (pin && pin !== user.pin) {
      const existingPin = await prisma2.user.findFirst({ where: { pin } });
      if (existingPin) {
        return reply.status(400).send({ error: "Bu PIN zaten kullan\u0131l\u0131yor" });
      }
    }
    const updateData = {};
    if (email)
      updateData.email = email;
    if (name)
      updateData.name = name;
    if (role)
      updateData.role = role;
    if (pin !== void 0)
      updateData.pin = pin;
    if (active !== void 0)
      updateData.active = active;
    if (password)
      updateData.password = await import_bcryptjs2.default.hash(password, 10);
    const updatedUser = await prisma2.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        updatedAt: true
      }
    });
    return { user: updatedUser };
  });
  server2.delete("/:id", { preHandler: verifyAdmin }, async (request, reply) => {
    const { id } = request.params;
    const user = await prisma2.user.findUnique({ where: { id } });
    if (!user) {
      return reply.status(404).send({ error: "Kullan\u0131c\u0131 bulunamad\u0131" });
    }
    await prisma2.user.update({
      where: { id },
      data: { active: false }
    });
    return { success: true };
  });
  server2.get("/:id/activity", { preHandler: verifyAdmin }, async (request) => {
    const { id } = request.params;
    const logs = await prisma2.activityLog.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 100
    });
    return { logs };
  });
}

// apps/api/src/websocket/index.ts
var clients = /* @__PURE__ */ new Map();
var CHANNELS = {
  ORDERS: "orders",
  KITCHEN: "kitchen",
  TABLES: "tables",
  NOTIFICATIONS: "notifications"
};
function setupWebSocket(server2) {
  server2.get("/ws", { websocket: true }, (socket, req) => {
    const clientId = Math.random().toString(36).substring(7);
    console.log(`Client connected: ${clientId}`);
    let subscribedChannels = /* @__PURE__ */ new Set([CHANNELS.NOTIFICATIONS]);
    socket.on("message", (rawMessage) => {
      try {
        const message = JSON.parse(rawMessage.toString());
        switch (message.type) {
          case "subscribe":
            if (message.channel && Object.values(CHANNELS).includes(message.channel)) {
              subscribedChannels.add(message.channel);
              if (!clients.has(message.channel)) {
                clients.set(message.channel, /* @__PURE__ */ new Set());
              }
              clients.get(message.channel).add(socket);
              socket.send(
                JSON.stringify({
                  type: "subscribed",
                  channel: message.channel
                })
              );
            }
            break;
          case "unsubscribe":
            if (message.channel) {
              subscribedChannels.delete(message.channel);
              clients.get(message.channel)?.delete(socket);
              socket.send(
                JSON.stringify({
                  type: "unsubscribed",
                  channel: message.channel
                })
              );
            }
            break;
          case "ping":
            socket.send(JSON.stringify({ type: "pong" }));
            break;
        }
      } catch (err) {
        console.error("WebSocket message error:", err);
      }
    });
    socket.on("close", () => {
      console.log(`Client disconnected: ${clientId}`);
      subscribedChannels.forEach((channel) => {
        clients.get(channel)?.delete(socket);
      });
    });
    socket.on("error", (err) => {
      console.error("WebSocket error:", err);
    });
  });
}
function broadcast(channel, data) {
  const channelClients = clients.get(channel);
  if (!channelClients)
    return;
  const message = JSON.stringify({
    type: "message",
    channel,
    data,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
  channelClients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(message);
    }
  });
}
function broadcastOrderUpdate(order) {
  broadcast(CHANNELS.ORDERS, { action: "update", order });
  broadcast(CHANNELS.KITCHEN, { action: "update", order });
}
function broadcastNewOrder(order) {
  broadcast(CHANNELS.ORDERS, { action: "new", order });
  broadcast(CHANNELS.KITCHEN, { action: "new", order });
  broadcast(CHANNELS.NOTIFICATIONS, {
    action: "new_order",
    message: `Yeni sipari\u015F: #${order.orderNumber}`,
    order
  });
}
function broadcastTableUpdate(table) {
  broadcast(CHANNELS.TABLES, { action: "update", table });
}

// apps/api/src/routes/tables.ts
async function tableRoutes(server2) {
  const prisma2 = server2.prisma;
  server2.get("/", { preHandler: verifyAuth }, async () => {
    const tables = await prisma2.table.findMany({
      where: { active: true },
      include: {
        orders: {
          where: {
            status: { notIn: ["COMPLETED", "CANCELLED"] }
          },
          include: {
            items: {
              include: {
                menuItem: true
              }
            }
          }
        }
      },
      orderBy: { number: "asc" }
    });
    return { tables };
  });
  server2.get("/:id", { preHandler: verifyAuth }, async (request, reply) => {
    const { id } = request.params;
    const table = await prisma2.table.findUnique({
      where: { id },
      include: {
        orders: {
          where: {
            status: { notIn: ["COMPLETED", "CANCELLED"] }
          },
          include: {
            items: {
              include: {
                menuItem: true
              }
            },
            user: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });
    if (!table) {
      return reply.status(404).send({ error: "Masa bulunamad\u0131" });
    }
    return { table };
  });
  server2.post("/", { preHandler: verifyAuth }, async (request, reply) => {
    const { number, name, capacity, positionX, positionY, floor } = request.body;
    if (!number) {
      return reply.status(400).send({ error: "Masa numaras\u0131 gerekli" });
    }
    const existing = await prisma2.table.findUnique({ where: { number } });
    if (existing) {
      return reply.status(400).send({ error: "Bu masa numaras\u0131 zaten kullan\u0131l\u0131yor" });
    }
    const table = await prisma2.table.create({
      data: {
        number,
        name: name || `Masa ${number}`,
        capacity: capacity || 4,
        positionX,
        positionY,
        floor: floor || 1
      }
    });
    broadcastTableUpdate(table);
    return { table };
  });
  server2.put("/:id", { preHandler: verifyAuth }, async (request, reply) => {
    const { id } = request.params;
    const { number, name, capacity, status, positionX, positionY, floor, active } = request.body;
    const table = await prisma2.table.findUnique({ where: { id } });
    if (!table) {
      return reply.status(404).send({ error: "Masa bulunamad\u0131" });
    }
    if (number && number !== table.number) {
      const existing = await prisma2.table.findUnique({ where: { number } });
      if (existing) {
        return reply.status(400).send({ error: "Bu masa numaras\u0131 zaten kullan\u0131l\u0131yor" });
      }
    }
    const updatedTable = await prisma2.table.update({
      where: { id },
      data: {
        number,
        name,
        capacity,
        status,
        positionX,
        positionY,
        floor,
        active
      }
    });
    broadcastTableUpdate(updatedTable);
    return { table: updatedTable };
  });
  server2.patch("/:id/status", { preHandler: verifyAuth }, async (request, reply) => {
    const { id } = request.params;
    const { status } = request.body;
    if (!status) {
      return reply.status(400).send({ error: "Durum gerekli" });
    }
    const table = await prisma2.table.findUnique({ where: { id } });
    if (!table) {
      return reply.status(404).send({ error: "Masa bulunamad\u0131" });
    }
    const updatedTable = await prisma2.table.update({
      where: { id },
      data: { status }
    });
    broadcastTableUpdate(updatedTable);
    return { table: updatedTable };
  });
  server2.delete("/:id", { preHandler: verifyAuth }, async (request, reply) => {
    const { id } = request.params;
    const table = await prisma2.table.findUnique({ where: { id } });
    if (!table) {
      return reply.status(404).send({ error: "Masa bulunamad\u0131" });
    }
    const activeOrders = await prisma2.order.count({
      where: {
        tableId: id,
        status: { notIn: ["COMPLETED", "CANCELLED"] }
      }
    });
    if (activeOrders > 0) {
      return reply.status(400).send({ error: "Bu masada aktif sipari\u015F var" });
    }
    await prisma2.table.update({
      where: { id },
      data: { active: false }
    });
    return { success: true };
  });
  server2.get("/floor/:floor", { preHandler: verifyAuth }, async (request) => {
    const { floor } = request.params;
    const tables = await prisma2.table.findMany({
      where: {
        floor: parseInt(floor, 10),
        active: true
      },
      include: {
        orders: {
          where: {
            status: { notIn: ["COMPLETED", "CANCELLED"] }
          },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            total: true
          }
        }
      },
      orderBy: { number: "asc" }
    });
    return { tables };
  });
}

// apps/api/src/routes/categories.ts
async function categoryRoutes(server2) {
  const prisma2 = server2.prisma;
  server2.get("/", async () => {
    const categories = await prisma2.category.findMany({
      where: { active: true },
      include: {
        _count: {
          select: { items: true }
        }
      },
      orderBy: { sortOrder: "asc" }
    });
    return { categories };
  });
  server2.get("/:id", async (request, reply) => {
    const { id } = request.params;
    const category = await prisma2.category.findUnique({
      where: { id },
      include: {
        items: {
          where: { available: true },
          orderBy: { sortOrder: "asc" }
        }
      }
    });
    if (!category) {
      return reply.status(404).send({ error: "Kategori bulunamad\u0131" });
    }
    return { category };
  });
  server2.post("/", { preHandler: verifyAdmin }, async (request, reply) => {
    const { name, icon, sortOrder } = request.body;
    if (!name) {
      return reply.status(400).send({ error: "Kategori ad\u0131 gerekli" });
    }
    const category = await prisma2.category.create({
      data: {
        name,
        icon,
        sortOrder: sortOrder || 0
      }
    });
    return { category };
  });
  server2.put("/:id", { preHandler: verifyAdmin }, async (request, reply) => {
    const { id } = request.params;
    const { name, icon, sortOrder, active } = request.body;
    const category = await prisma2.category.findUnique({ where: { id } });
    if (!category) {
      return reply.status(404).send({ error: "Kategori bulunamad\u0131" });
    }
    const updatedCategory = await prisma2.category.update({
      where: { id },
      data: {
        name,
        icon,
        sortOrder,
        active
      }
    });
    return { category: updatedCategory };
  });
  server2.delete("/:id", { preHandler: verifyAdmin }, async (request, reply) => {
    const { id } = request.params;
    const category = await prisma2.category.findUnique({ where: { id } });
    if (!category) {
      return reply.status(404).send({ error: "Kategori bulunamad\u0131" });
    }
    const itemCount = await prisma2.menuItem.count({ where: { categoryId: id } });
    if (itemCount > 0) {
      await prisma2.category.update({
        where: { id },
        data: { active: false }
      });
    } else {
      await prisma2.category.delete({ where: { id } });
    }
    return { success: true };
  });
  server2.post("/reorder", { preHandler: verifyAdmin }, async (request) => {
    const { order } = request.body;
    await Promise.all(
      order.map(
        ({ id, sortOrder }) => prisma2.category.update({
          where: { id },
          data: { sortOrder }
        })
      )
    );
    return { success: true };
  });
}

// apps/api/src/routes/menu.ts
async function menuRoutes(server2) {
  const prisma2 = server2.prisma;
  server2.get("/", async (request) => {
    const { category, available, search } = request.query;
    const where = {};
    if (category) {
      where.categoryId = category;
    }
    if (available !== void 0) {
      where.available = available === "true";
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } }
      ];
    }
    const items = await prisma2.menuItem.findMany({
      where,
      include: {
        category: true,
        modifiers: true
      },
      orderBy: [
        { category: { sortOrder: "asc" } },
        { sortOrder: "asc" }
      ]
    });
    return { items };
  });
  server2.get("/:id", async (request, reply) => {
    const { id } = request.params;
    const item = await prisma2.menuItem.findUnique({
      where: { id },
      include: {
        category: true,
        modifiers: true
      }
    });
    if (!item) {
      return reply.status(404).send({ error: "\xDCr\xFCn bulunamad\u0131" });
    }
    return { item };
  });
  server2.post("/", { preHandler: verifyAdmin }, async (request, reply) => {
    const {
      categoryId,
      name,
      description,
      price,
      image,
      badges,
      prepTime,
      modifiers
    } = request.body;
    if (!categoryId || !name || price === void 0) {
      return reply.status(400).send({ error: "Kategori, ad ve fiyat gerekli" });
    }
    const item = await prisma2.menuItem.create({
      data: {
        categoryId,
        name,
        description,
        price,
        image,
        badges: badges || [],
        prepTime,
        modifiers: modifiers ? {
          create: modifiers.map((m) => ({
            name: m.name,
            price: m.price
          }))
        } : void 0
      },
      include: {
        category: true,
        modifiers: true
      }
    });
    return { item };
  });
  server2.put("/:id", { preHandler: verifyAdmin }, async (request, reply) => {
    const { id } = request.params;
    const {
      categoryId,
      name,
      description,
      price,
      image,
      badges,
      prepTime,
      available,
      sortOrder
    } = request.body;
    const item = await prisma2.menuItem.findUnique({ where: { id } });
    if (!item) {
      return reply.status(404).send({ error: "\xDCr\xFCn bulunamad\u0131" });
    }
    const updatedItem = await prisma2.menuItem.update({
      where: { id },
      data: {
        categoryId,
        name,
        description,
        price,
        image,
        badges,
        prepTime,
        available,
        sortOrder
      },
      include: {
        category: true,
        modifiers: true
      }
    });
    return { item: updatedItem };
  });
  server2.patch("/:id/availability", { preHandler: verifyAuth }, async (request, reply) => {
    const { id } = request.params;
    const { available } = request.body;
    const item = await prisma2.menuItem.findUnique({ where: { id } });
    if (!item) {
      return reply.status(404).send({ error: "\xDCr\xFCn bulunamad\u0131" });
    }
    const updatedItem = await prisma2.menuItem.update({
      where: { id },
      data: { available }
    });
    return { item: updatedItem };
  });
  server2.delete("/:id", { preHandler: verifyAdmin }, async (request, reply) => {
    const { id } = request.params;
    const item = await prisma2.menuItem.findUnique({ where: { id } });
    if (!item) {
      return reply.status(404).send({ error: "\xDCr\xFCn bulunamad\u0131" });
    }
    const orderItemCount = await prisma2.orderItem.count({
      where: { menuItemId: id }
    });
    if (orderItemCount > 0) {
      await prisma2.menuItem.update({
        where: { id },
        data: { available: false }
      });
    } else {
      await prisma2.modifier.deleteMany({ where: { menuItemId: id } });
      await prisma2.menuItem.delete({ where: { id } });
    }
    return { success: true };
  });
  server2.post("/:id/modifiers", { preHandler: verifyAdmin }, async (request, reply) => {
    const { id } = request.params;
    const { name, price } = request.body;
    if (!name) {
      return reply.status(400).send({ error: "Se\xE7enek ad\u0131 gerekli" });
    }
    const modifier = await prisma2.modifier.create({
      data: {
        menuItemId: id,
        name,
        price: price || 0
      }
    });
    return { modifier };
  });
  server2.delete("/:id/modifiers/:modifierId", { preHandler: verifyAdmin }, async (request, reply) => {
    const { modifierId } = request.params;
    await prisma2.modifier.delete({
      where: { id: modifierId }
    });
    return { success: true };
  });
}

// apps/api/src/routes/orders.ts
var import_client3 = require("@prisma/client");
async function orderRoutes(server2) {
  const prisma2 = server2.prisma;
  server2.get("/", { preHandler: verifyAuth }, async (request) => {
    const { status, type, date, tableId, limit } = request.query;
    const where = {};
    if (status) {
      where.status = status;
    }
    if (type) {
      where.type = type;
    }
    if (tableId) {
      where.tableId = tableId;
    }
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      where.createdAt = {
        gte: startOfDay,
        lte: endOfDay
      };
    }
    const orders = await prisma2.order.findMany({
      where,
      include: {
        table: true,
        user: {
          select: { id: true, name: true }
        },
        items: {
          include: {
            menuItem: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: limit ? parseInt(limit, 10) : 100
    });
    return { orders };
  });
  server2.get("/active", { preHandler: verifyAuth }, async () => {
    const orders = await prisma2.order.findMany({
      where: {
        status: {
          in: [import_client3.OrderStatus.PENDING, import_client3.OrderStatus.CONFIRMED, import_client3.OrderStatus.PREPARING, import_client3.OrderStatus.READY]
        }
      },
      include: {
        table: true,
        user: {
          select: { id: true, name: true }
        },
        items: {
          include: {
            menuItem: true
          }
        }
      },
      orderBy: { createdAt: "asc" }
    });
    return { orders };
  });
  server2.get("/:id", { preHandler: verifyAuth }, async (request, reply) => {
    const { id } = request.params;
    const order = await prisma2.order.findUnique({
      where: { id },
      include: {
        table: true,
        user: {
          select: { id: true, name: true }
        },
        items: {
          include: {
            menuItem: true
          }
        },
        payments: true,
        invoice: true
      }
    });
    if (!order) {
      return reply.status(404).send({ error: "Sipari\u015F bulunamad\u0131" });
    }
    return { order };
  });
  server2.post("/", { preHandler: verifyAuth }, async (request, reply) => {
    const {
      tableId,
      customerName,
      customerPhone,
      type,
      items,
      notes,
      source
    } = request.body;
    if (!items || items.length === 0) {
      return reply.status(400).send({ error: "En az bir \xFCr\xFCn gerekli" });
    }
    const user = request.user;
    let subtotal = 0;
    const orderItems = [];
    for (const item of items) {
      const menuItem = await prisma2.menuItem.findUnique({
        where: { id: item.menuItemId }
      });
      if (!menuItem || !menuItem.available) {
        return reply.status(400).send({ error: `\xDCr\xFCn mevcut de\u011Fil: ${item.menuItemId}` });
      }
      const itemTotal = Number(menuItem.price) * item.quantity;
      subtotal += itemTotal;
      orderItems.push({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        unitPrice: menuItem.price,
        total: itemTotal,
        notes: item.notes,
        modifiers: item.modifiers || []
      });
    }
    const settings = await prisma2.settings.findUnique({ where: { key: "restaurant" } });
    const taxRate = settings?.value?.taxRate || 10;
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;
    const order = await prisma2.order.create({
      data: {
        tableId,
        userId: user.userId,
        customerName,
        customerPhone,
        type: type || (tableId ? import_client3.OrderType.DINE_IN : import_client3.OrderType.TAKEAWAY),
        status: import_client3.OrderStatus.PENDING,
        subtotal,
        tax,
        total,
        notes,
        source: source || "POS",
        items: {
          create: orderItems
        }
      },
      include: {
        table: true,
        user: {
          select: { id: true, name: true }
        },
        items: {
          include: {
            menuItem: true
          }
        }
      }
    });
    if (tableId) {
      const table = await prisma2.table.update({
        where: { id: tableId },
        data: { status: import_client3.TableStatus.OCCUPIED }
      });
      broadcastTableUpdate(table);
    }
    broadcastNewOrder(order);
    return { order };
  });
  server2.patch("/:id/status", { preHandler: verifyAuth }, async (request, reply) => {
    const { id } = request.params;
    const { status } = request.body;
    if (!status) {
      return reply.status(400).send({ error: "Durum gerekli" });
    }
    const order = await prisma2.order.findUnique({
      where: { id },
      include: { table: true }
    });
    if (!order) {
      return reply.status(404).send({ error: "Sipari\u015F bulunamad\u0131" });
    }
    const updateData = { status };
    if (status === import_client3.OrderStatus.COMPLETED) {
      updateData.completedAt = /* @__PURE__ */ new Date();
      if (order.tableId) {
        const table = await prisma2.table.update({
          where: { id: order.tableId },
          data: { status: import_client3.TableStatus.CLEANING }
        });
        broadcastTableUpdate(table);
      }
    }
    const updatedOrder = await prisma2.order.update({
      where: { id },
      data: updateData,
      include: {
        table: true,
        user: {
          select: { id: true, name: true }
        },
        items: {
          include: {
            menuItem: true
          }
        }
      }
    });
    if (status === import_client3.OrderStatus.PREPARING || status === import_client3.OrderStatus.READY || status === import_client3.OrderStatus.SERVED) {
      await prisma2.orderItem.updateMany({
        where: { orderId: id },
        data: { status }
      });
    }
    broadcastOrderUpdate(updatedOrder);
    return { order: updatedOrder };
  });
  server2.patch("/:id/items/:itemId/status", { preHandler: verifyKitchen }, async (request, reply) => {
    const { id, itemId } = request.params;
    const { status } = request.body;
    const orderItem = await prisma2.orderItem.update({
      where: { id: itemId },
      data: { status }
    });
    const order = await prisma2.order.findUnique({
      where: { id },
      include: {
        items: true,
        table: true,
        user: {
          select: { id: true, name: true }
        }
      }
    });
    if (order) {
      const allSameStatus = order.items.every((item) => item.status === status);
      if (allSameStatus && order.status !== status) {
        await prisma2.order.update({
          where: { id },
          data: { status }
        });
      }
      broadcastOrderUpdate(order);
    }
    return { item: orderItem };
  });
  server2.post("/:id/items", { preHandler: verifyAuth }, async (request, reply) => {
    const { id } = request.params;
    const { items } = request.body;
    const order = await prisma2.order.findUnique({ where: { id } });
    if (!order) {
      return reply.status(404).send({ error: "Sipari\u015F bulunamad\u0131" });
    }
    if (order.status === import_client3.OrderStatus.COMPLETED || order.status === import_client3.OrderStatus.CANCELLED) {
      return reply.status(400).send({ error: "Bu sipari\u015Fe \xFCr\xFCn eklenemez" });
    }
    let additionalTotal = 0;
    const newItems = [];
    for (const item of items) {
      const menuItem = await prisma2.menuItem.findUnique({
        where: { id: item.menuItemId }
      });
      if (!menuItem || !menuItem.available) {
        return reply.status(400).send({ error: `\xDCr\xFCn mevcut de\u011Fil: ${item.menuItemId}` });
      }
      const itemTotal = Number(menuItem.price) * item.quantity;
      additionalTotal += itemTotal;
      newItems.push({
        orderId: id,
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        unitPrice: menuItem.price,
        total: itemTotal,
        notes: item.notes,
        modifiers: item.modifiers || [],
        status: import_client3.OrderStatus.PENDING
      });
    }
    await prisma2.orderItem.createMany({
      data: newItems
    });
    const settings = await prisma2.settings.findUnique({ where: { key: "restaurant" } });
    const taxRate = settings?.value?.taxRate || 10;
    const newSubtotal = Number(order.subtotal) + additionalTotal;
    const newTax = newSubtotal * (taxRate / 100);
    const newTotal = newSubtotal + newTax;
    const updatedOrder = await prisma2.order.update({
      where: { id },
      data: {
        subtotal: newSubtotal,
        tax: newTax,
        total: newTotal
      },
      include: {
        table: true,
        user: {
          select: { id: true, name: true }
        },
        items: {
          include: {
            menuItem: true
          }
        }
      }
    });
    broadcastOrderUpdate(updatedOrder);
    return { order: updatedOrder };
  });
  server2.post("/:id/payment", { preHandler: verifyAuth }, async (request, reply) => {
    const { id } = request.params;
    const { amount, method, tip } = request.body;
    const order = await prisma2.order.findUnique({
      where: { id },
      include: { payments: true }
    });
    if (!order) {
      return reply.status(404).send({ error: "Sipari\u015F bulunamad\u0131" });
    }
    const paidAmount = order.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalWithTip = Number(order.total) + (tip || 0);
    const remaining = totalWithTip - paidAmount;
    if (amount > remaining) {
      return reply.status(400).send({ error: "\xD6deme tutar\u0131 kalan tutardan fazla olamaz" });
    }
    await prisma2.payment.create({
      data: {
        orderId: id,
        amount,
        method
      }
    });
    const newPaidAmount = paidAmount + amount;
    const isPaid = newPaidAmount >= totalWithTip;
    const newPaymentStatus = isPaid ? import_client3.PaymentStatus.PAID : import_client3.PaymentStatus.PARTIAL;
    const updatedOrder = await prisma2.order.update({
      where: { id },
      data: {
        paymentStatus: newPaymentStatus,
        paymentMethod: method,
        tip: tip || order.tip,
        status: isPaid ? import_client3.OrderStatus.COMPLETED : order.status,
        completedAt: isPaid ? /* @__PURE__ */ new Date() : order.completedAt
      },
      include: {
        table: true,
        user: {
          select: { id: true, name: true }
        },
        items: {
          include: {
            menuItem: true
          }
        },
        payments: true
      }
    });
    if (isPaid && order.tableId) {
      const table = await prisma2.table.update({
        where: { id: order.tableId },
        data: { status: import_client3.TableStatus.CLEANING }
      });
      broadcastTableUpdate(table);
    }
    broadcastOrderUpdate(updatedOrder);
    return { order: updatedOrder };
  });
  server2.post("/:id/cancel", { preHandler: verifyAuth }, async (request, reply) => {
    const { id } = request.params;
    const { reason } = request.body;
    const order = await prisma2.order.findUnique({
      where: { id },
      include: { table: true }
    });
    if (!order) {
      return reply.status(404).send({ error: "Sipari\u015F bulunamad\u0131" });
    }
    if (order.status === import_client3.OrderStatus.COMPLETED) {
      return reply.status(400).send({ error: "Tamamlanm\u0131\u015F sipari\u015F iptal edilemez" });
    }
    const updatedOrder = await prisma2.order.update({
      where: { id },
      data: {
        status: import_client3.OrderStatus.CANCELLED,
        notes: reason ? `${order.notes || ""}
\u0130ptal nedeni: ${reason}` : order.notes
      },
      include: {
        table: true,
        user: {
          select: { id: true, name: true }
        },
        items: {
          include: {
            menuItem: true
          }
        }
      }
    });
    if (order.tableId) {
      const table = await prisma2.table.update({
        where: { id: order.tableId },
        data: { status: import_client3.TableStatus.FREE }
      });
      broadcastTableUpdate(table);
    }
    broadcastOrderUpdate(updatedOrder);
    return { order: updatedOrder };
  });
}

// apps/api/src/routes/reports.ts
var import_client4 = require("@prisma/client");
async function reportRoutes(server2) {
  const prisma2 = server2.prisma;
  server2.get("/daily", { preHandler: verifyAdmin }, async (request) => {
    const { date } = request.query;
    const targetDate = date ? new Date(date) : /* @__PURE__ */ new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);
    const orders = await prisma2.order.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay
        },
        status: import_client4.OrderStatus.COMPLETED
      },
      include: {
        items: {
          include: {
            menuItem: true
          }
        },
        payments: true
      }
    });
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total), 0);
    const cashAmount = orders.filter((o) => o.paymentMethod === import_client4.PaymentMethod.CASH).reduce((sum, o) => sum + Number(o.total), 0);
    const cardAmount = orders.filter((o) => o.paymentMethod === import_client4.PaymentMethod.CREDIT_CARD || o.paymentMethod === import_client4.PaymentMethod.DEBIT_CARD).reduce((sum, o) => sum + Number(o.total), 0);
    const otherAmount = totalRevenue - cashAmount - cardAmount;
    const cancelledOrders = await prisma2.order.count({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay
        },
        status: import_client4.OrderStatus.CANCELLED
      }
    });
    const itemSales = {};
    for (const order of orders) {
      for (const item of order.items) {
        const key = item.menuItemId;
        if (!itemSales[key]) {
          itemSales[key] = {
            id: item.menuItemId,
            name: item.menuItem.name,
            count: 0,
            revenue: 0
          };
        }
        itemSales[key].count += item.quantity;
        itemSales[key].revenue += Number(item.total);
      }
    }
    const topItems = Object.values(itemSales).sort((a, b) => b.count - a.count).slice(0, 10);
    const orderTimes = orders.filter((o) => o.completedAt).map((o) => (o.completedAt.getTime() - o.createdAt.getTime()) / 6e4);
    const avgOrderTime = orderTimes.length > 0 ? Math.round(orderTimes.reduce((sum, t) => sum + t, 0) / orderTimes.length) : null;
    const hourlyBreakdown = {};
    for (let i = 0; i < 24; i++) {
      hourlyBreakdown[i] = { orders: 0, revenue: 0 };
    }
    for (const order of orders) {
      const hour = order.createdAt.getHours();
      hourlyBreakdown[hour].orders += 1;
      hourlyBreakdown[hour].revenue += Number(order.total);
    }
    return {
      date: targetDate.toISOString().split("T")[0],
      summary: {
        totalOrders,
        totalRevenue,
        cashAmount,
        cardAmount,
        otherAmount,
        cancelledOrders,
        avgOrderTime
      },
      topItems,
      hourlyBreakdown
    };
  });
  server2.get("/weekly", { preHandler: verifyAdmin }, async (request) => {
    const { startDate } = request.query;
    const start2 = startDate ? new Date(startDate) : /* @__PURE__ */ new Date();
    start2.setDate(start2.getDate() - start2.getDay());
    start2.setHours(0, 0, 0, 0);
    const end = new Date(start2);
    end.setDate(end.getDate() + 7);
    end.setHours(23, 59, 59, 999);
    const orders = await prisma2.order.findMany({
      where: {
        createdAt: {
          gte: start2,
          lt: end
        },
        status: import_client4.OrderStatus.COMPLETED
      }
    });
    const dailyBreakdown = {};
    const days = ["Pazar", "Pazartesi", "Sal\u0131", "\xC7ar\u015Famba", "Per\u015Fembe", "Cuma", "Cumartesi"];
    for (let i = 0; i < 7; i++) {
      const date = new Date(start2);
      date.setDate(date.getDate() + i);
      dailyBreakdown[days[i]] = { orders: 0, revenue: 0 };
    }
    for (const order of orders) {
      const dayName = days[order.createdAt.getDay()];
      dailyBreakdown[dayName].orders += 1;
      dailyBreakdown[dayName].revenue += Number(order.total);
    }
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0);
    const avgDailyOrders = Math.round(totalOrders / 7);
    const avgDailyRevenue = Math.round(totalRevenue / 7);
    return {
      weekStart: start2.toISOString().split("T")[0],
      weekEnd: new Date(end.getTime() - 1).toISOString().split("T")[0],
      summary: {
        totalOrders,
        totalRevenue,
        avgDailyOrders,
        avgDailyRevenue
      },
      dailyBreakdown
    };
  });
  server2.get("/monthly", { preHandler: verifyAdmin }, async (request) => {
    const { year, month } = request.query;
    const now = /* @__PURE__ */ new Date();
    const targetYear = year ? parseInt(year, 10) : now.getFullYear();
    const targetMonth = month ? parseInt(month, 10) - 1 : now.getMonth();
    const start2 = new Date(targetYear, targetMonth, 1);
    const end = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);
    const orders = await prisma2.order.findMany({
      where: {
        createdAt: {
          gte: start2,
          lte: end
        },
        status: import_client4.OrderStatus.COMPLETED
      },
      include: {
        items: {
          include: {
            menuItem: {
              include: {
                category: true
              }
            }
          }
        }
      }
    });
    const categoryBreakdown = {};
    for (const order of orders) {
      for (const item of order.items) {
        const catId = item.menuItem.categoryId;
        if (!categoryBreakdown[catId]) {
          categoryBreakdown[catId] = {
            name: item.menuItem.category.name,
            orders: 0,
            revenue: 0
          };
        }
        categoryBreakdown[catId].orders += item.quantity;
        categoryBreakdown[catId].revenue += Number(item.total);
      }
    }
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0);
    const daysInMonth = end.getDate();
    const avgDailyOrders = Math.round(totalOrders / daysInMonth);
    const avgDailyRevenue = Math.round(totalRevenue / daysInMonth);
    return {
      year: targetYear,
      month: targetMonth + 1,
      summary: {
        totalOrders,
        totalRevenue,
        avgDailyOrders,
        avgDailyRevenue,
        daysInMonth
      },
      categoryBreakdown: Object.values(categoryBreakdown).sort((a, b) => b.revenue - a.revenue)
    };
  });
  server2.get("/staff", { preHandler: verifyAdmin }, async (request) => {
    const { startDate, endDate } = request.query;
    const start2 = startDate ? new Date(startDate) : new Date((/* @__PURE__ */ new Date()).setDate((/* @__PURE__ */ new Date()).getDate() - 30));
    start2.setHours(0, 0, 0, 0);
    const end = endDate ? new Date(endDate) : /* @__PURE__ */ new Date();
    end.setHours(23, 59, 59, 999);
    const orders = await prisma2.order.findMany({
      where: {
        createdAt: {
          gte: start2,
          lte: end
        },
        status: import_client4.OrderStatus.COMPLETED,
        userId: { not: null }
      },
      include: {
        user: {
          select: { id: true, name: true, role: true }
        }
      }
    });
    const staffStats = {};
    for (const order of orders) {
      if (!order.userId)
        continue;
      if (!staffStats[order.userId]) {
        staffStats[order.userId] = {
          id: order.userId,
          name: order.user?.name || "Bilinmiyor",
          role: order.user?.role || "WAITER",
          orderCount: 0,
          totalRevenue: 0,
          avgOrderValue: 0
        };
      }
      staffStats[order.userId].orderCount += 1;
      staffStats[order.userId].totalRevenue += Number(order.total);
    }
    for (const staff of Object.values(staffStats)) {
      staff.avgOrderValue = staff.orderCount > 0 ? Math.round(staff.totalRevenue / staff.orderCount) : 0;
    }
    return {
      period: {
        start: start2.toISOString().split("T")[0],
        end: end.toISOString().split("T")[0]
      },
      staff: Object.values(staffStats).sort((a, b) => b.totalRevenue - a.totalRevenue)
    };
  });
}

// apps/api/src/routes/settings.ts
async function settingsRoutes(server2) {
  const prisma2 = server2.prisma;
  server2.get("/", { preHandler: verifyAdmin }, async () => {
    const settings = await prisma2.settings.findMany();
    const result = {};
    for (const setting of settings) {
      result[setting.key] = setting.value;
    }
    return { settings: result };
  });
  server2.get("/:key", async (request, reply) => {
    const { key } = request.params;
    const setting = await prisma2.settings.findUnique({
      where: { key }
    });
    if (!setting) {
      return reply.status(404).send({ error: "Ayar bulunamad\u0131" });
    }
    return { [key]: setting.value };
  });
  server2.put("/:key", { preHandler: verifyAdmin }, async (request) => {
    const { key } = request.params;
    const { value } = request.body;
    const setting = await prisma2.settings.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    });
    return { [key]: setting.value };
  });
  server2.get("/public/restaurant", async () => {
    const restaurantSetting = await prisma2.settings.findUnique({
      where: { key: "restaurant" }
    });
    const whatsappSetting = await prisma2.settings.findUnique({
      where: { key: "whatsapp" }
    });
    return {
      restaurant: restaurantSetting?.value || {},
      whatsapp: whatsappSetting?.value || {}
    };
  });
  server2.get("/backup", { preHandler: verifyAdmin }, async () => {
    const settings = await prisma2.settings.findMany();
    const categories = await prisma2.category.findMany({
      include: { items: { include: { modifiers: true } } }
    });
    const tables = await prisma2.table.findMany();
    const users = await prisma2.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        pin: true,
        active: true
      }
    });
    return {
      exportDate: (/* @__PURE__ */ new Date()).toISOString(),
      settings,
      categories,
      tables,
      users
    };
  });
  server2.post("/restore", { preHandler: verifyAdmin }, async (request, reply) => {
    const backup = request.body;
    if (!backup || !backup.settings) {
      return reply.status(400).send({ error: "Ge\xE7ersiz yedek dosyas\u0131" });
    }
    try {
      for (const setting of backup.settings) {
        await prisma2.settings.upsert({
          where: { key: setting.key },
          update: { value: setting.value },
          create: { key: setting.key, value: setting.value }
        });
      }
      return { success: true, message: "Ayarlar ba\u015Far\u0131yla geri y\xFCklendi" };
    } catch (err) {
      return reply.status(500).send({ error: "Geri y\xFCkleme ba\u015Far\u0131s\u0131z" });
    }
  });
}

// apps/api/src/main.ts
var prisma = new import_client5.PrismaClient();
var server = (0, import_fastify.default)({
  logger: {
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
    transport: process.env.NODE_ENV !== "production" ? {
      target: "pino-pretty",
      options: {
        colorize: true
      }
    } : void 0
  }
});
server.register(import_cors.default, {
  origin: true,
  credentials: true
});
server.register(import_websocket3.default);
server.decorate("prisma", prisma);
server.get("/health", async () => {
  return { status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() };
});
server.register(authRoutes, { prefix: "/api/auth" });
server.register(userRoutes, { prefix: "/api/users" });
server.register(tableRoutes, { prefix: "/api/tables" });
server.register(categoryRoutes, { prefix: "/api/categories" });
server.register(menuRoutes, { prefix: "/api/menu" });
server.register(orderRoutes, { prefix: "/api/orders" });
server.register(reportRoutes, { prefix: "/api/reports" });
server.register(settingsRoutes, { prefix: "/api/settings" });
setupWebSocket(server);
var start = async () => {
  try {
    const port = parseInt(process.env.PORT || "3000", 10);
    await server.listen({ port, host: "0.0.0.0" });
    console.log(`\u{1F680} HighFive API running on http://localhost:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};
var shutdown = async () => {
  console.log("Shutting down...");
  await prisma.$disconnect();
  await server.close();
  process.exit(0);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
start();
//# sourceMappingURL=main.js.map
