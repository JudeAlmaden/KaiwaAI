import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { prisma } from "@/lib/prisma";
import * as authHelpers from "@/lib/auth-helpers";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    group: { findUnique: vi.fn() },
    groupMember: { findFirst: vi.fn() },
    groupMessage: { findMany: vi.fn(), findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/auth-helpers", () => ({
  getCurrentUser: vi.fn(),
}));

describe("/api/groups/[id] GET - polling with 'after' parameter", () => {
  const mockUser = { id: "user1", email: "test@example.com", name: "Test User" };
  const mockGroup = {
    id: "group1",
    name: "Test Group",
    kind: "dm",
    ownerId: "user1",
    apiKeyEnc: null,
    members: [
      {
        id: "member1",
        kind: "user",
        userId: "user1",
        status: "accepted",
        user: { id: "user1", name: "Test User", email: "test@example.com" },
        persona: null,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return new messages when 'after' parameter is provided", async () => {
    vi.mocked(authHelpers.getCurrentUser).mockResolvedValue(mockUser as never);
    vi.mocked(prisma.groupMember.findFirst).mockResolvedValue({ id: "member1" } as never);
    vi.mocked(prisma.group.findUnique).mockResolvedValue(mockGroup as never);

    const afterMessage = {
      id: "msg1",
      createdAt: new Date("2026-01-01T10:00:00Z"),
    };

    const newMessages = [
      {
        id: "msg2",
        groupId: "group1",
        senderUserId: "user2",
        senderName: "User 2",
        senderKind: "user",
        content: "New message 1",
        english: null,
        tokens: null,
        correction: null,
        createdAt: new Date("2026-01-01T10:05:00Z"),
      },
      {
        id: "msg3",
        groupId: "group1",
        senderUserId: "user2",
        senderName: "User 2",
        senderKind: "user",
        content: "New message 2",
        english: null,
        tokens: null,
        correction: null,
        createdAt: new Date("2026-01-01T10:06:00Z"),
      },
    ];

    vi.mocked(prisma.groupMessage.findUnique).mockResolvedValue(afterMessage as never);
    vi.mocked(prisma.groupMessage.findMany).mockResolvedValue(newMessages as never);

    const req = new Request("http://localhost/api/groups/group1?after=msg1");
    const params = Promise.resolve({ id: "group1" });

    const res = await GET(req, { params });
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.messages).toHaveLength(2);
    expect(data.messages[0].id).toBe("msg2");
    expect(data.messages[1].id).toBe("msg3");
    expect(data.messages[0].isMe).toBe(false); // user2 sent it, not user1

    // Should query for messages after the specified ID
    expect(prisma.groupMessage.findMany).toHaveBeenCalledWith({
      where: {
        groupId: "group1",
        createdAt: { gt: afterMessage.createdAt },
      },
      orderBy: { createdAt: "asc" },
      take: 50,
    });
  });

  it("should return empty array when no new messages after specified ID", async () => {
    vi.mocked(authHelpers.getCurrentUser).mockResolvedValue(mockUser as never);
    vi.mocked(prisma.groupMember.findFirst).mockResolvedValue({ id: "member1" } as never);
    vi.mocked(prisma.group.findUnique).mockResolvedValue(mockGroup as never);

    const afterMessage = {
      id: "msg1",
      createdAt: new Date("2026-01-01T10:00:00Z"),
    };

    vi.mocked(prisma.groupMessage.findUnique).mockResolvedValue(afterMessage as never);
    vi.mocked(prisma.groupMessage.findMany).mockResolvedValue([]);

    const req = new Request("http://localhost/api/groups/group1?after=msg1");
    const params = Promise.resolve({ id: "group1" });

    const res = await GET(req, { params });
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.messages).toHaveLength(0);
  });

  it("should limit new messages to 50 when polling", async () => {
    vi.mocked(authHelpers.getCurrentUser).mockResolvedValue(mockUser as never);
    vi.mocked(prisma.groupMember.findFirst).mockResolvedValue({ id: "member1" } as never);
    vi.mocked(prisma.group.findUnique).mockResolvedValue(mockGroup as never);

    const afterMessage = {
      id: "msg1",
      createdAt: new Date("2026-01-01T10:00:00Z"),
    };

    vi.mocked(prisma.groupMessage.findUnique).mockResolvedValue(afterMessage as never);
    vi.mocked(prisma.groupMessage.findMany).mockResolvedValue([]);

    const req = new Request("http://localhost/api/groups/group1?after=msg1");
    const params = Promise.resolve({ id: "group1" });

    await GET(req, { params });

    expect(prisma.groupMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 50,
      })
    );
  });

  it("should not return group details when 'after' is provided (only messages)", async () => {
    vi.mocked(authHelpers.getCurrentUser).mockResolvedValue(mockUser as never);
    vi.mocked(prisma.groupMember.findFirst).mockResolvedValue({ id: "member1" } as never);
    vi.mocked(prisma.group.findUnique).mockResolvedValue(mockGroup as never);

    const afterMessage = {
      id: "msg1",
      createdAt: new Date("2026-01-01T10:00:00Z"),
    };

    vi.mocked(prisma.groupMessage.findUnique).mockResolvedValue(afterMessage as never);
    vi.mocked(prisma.groupMessage.findMany).mockResolvedValue([]);

    const req = new Request("http://localhost/api/groups/group1?after=msg1");
    const params = Promise.resolve({ id: "group1" });

    const res = await GET(req, { params });
    const data = await res.json();

    // When polling with 'after', only messages are returned, not full group details
    expect(data.group).toBeUndefined();
    expect(data.hasMore).toBeUndefined();
    expect(data.messages).toBeDefined();
  });

  it("should still require authorization for polling", async () => {
    vi.mocked(authHelpers.getCurrentUser).mockResolvedValue(null);

    const req = new Request("http://localhost/api/groups/group1?after=msg1");
    const params = Promise.resolve({ id: "group1" });

    const res = await GET(req, { params });
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Unauthorized");
  });

  it("should still require membership for polling", async () => {
    vi.mocked(authHelpers.getCurrentUser).mockResolvedValue(mockUser as never);
    vi.mocked(prisma.group.findUnique).mockResolvedValue(mockGroup as never);
    vi.mocked(prisma.groupMember.findFirst).mockResolvedValue(null);

    const req = new Request("http://localhost/api/groups/group1?after=msg1");
    const params = Promise.resolve({ id: "group1" });

    const res = await GET(req, { params });
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("Not a member.");
  });
});
