import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { prisma } from "@/lib/prisma";
import * as authHelpers from "@/lib/auth-helpers";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    kanji: { findUnique: vi.fn() },
    kanjiMnemonic: { upsert: vi.fn() },
  },
}));

vi.mock("@/lib/auth-helpers", () => ({
  getCurrentUser: vi.fn(),
}));

describe("/api/kanji/[character]/mnemonic/save", () => {
  const mockUser = { id: "user1", email: "test@example.com" };
  const mockKanji = {
    id: "kanji1",
    character: "ä¸€",
    strokes: 1,
    grade: 1,
    frequency: 2,
    jlptLevel: 5,
    wkLevel: 1,
    meanings: '["one"]',
    readingsOn: '["ã‚¤ãƒ","ã‚¤ãƒ„"]',
    readingsKun: '["ã²ã¨"]',
    radicals: '[]',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST", () => {
    it("should return 401 if not authenticated", async () => {
      vi.mocked(authHelpers.getCurrentUser).mockResolvedValue(null);

      const req = new Request("http://localhost/api/kanji/ä¸€/mnemonic/save", {
        method: "POST",
      });
      const params = Promise.resolve({ character: "ä¸€" });

      const res = await POST(req, { params });
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 if mnemonic is missing", async () => {
      vi.mocked(authHelpers.getCurrentUser).mockResolvedValue(mockUser as never);

      const req = new Request("http://localhost/api/kanji/ä¸€/mnemonic/save", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const params = Promise.resolve({ character: "ä¸€" });

      const res = await POST(req, { params });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Mnemonic text required");
    });

    it("should return 400 if mnemonic is not a string", async () => {
      vi.mocked(authHelpers.getCurrentUser).mockResolvedValue(mockUser as never);

      const req = new Request("http://localhost/api/kanji/ä¸€/mnemonic/save", {
        method: "POST",
        body: JSON.stringify({ mnemonic: 123 }),
      });
      const params = Promise.resolve({ character: "ä¸€" });

      const res = await POST(req, { params });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Mnemonic text required");
    });

    it("should return 404 if kanji not found", async () => {
      vi.mocked(authHelpers.getCurrentUser).mockResolvedValue(mockUser as never);
      vi.mocked(prisma.kanji.findUnique).mockResolvedValue(null);

      const req = new Request("http://localhost/api/kanji/ä¸å­˜åœ¨/mnemonic/save", {
        method: "POST",
        body: JSON.stringify({ mnemonic: "Test mnemonic" }),
      });
      const params = Promise.resolve({ character: "ä¸å­˜åœ¨" });

      const res = await POST(req, { params });
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("Kanji not found");
    });

    it("should save new mnemonic successfully", async () => {
      vi.mocked(authHelpers.getCurrentUser).mockResolvedValue(mockUser as never);
      vi.mocked(prisma.kanji.findUnique).mockResolvedValue(mockKanji as never);
      vi.mocked(prisma.kanjiMnemonic.upsert).mockResolvedValue({
        id: "mnemonic1",
        userId: mockUser.id,
        kanjiId: mockKanji.id,
        mnemonic: "One horizontal line, simple as that!",
        createdAt: new Date(),
      });

      const req = new Request("http://localhost/api/kanji/ä¸€/mnemonic/save", {
        method: "POST",
        body: JSON.stringify({ mnemonic: "One horizontal line, simple as that!" }),
      });
      const params = Promise.resolve({ character: "ä¸€" });

      const res = await POST(req, { params });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);

      expect(prisma.kanjiMnemonic.upsert).toHaveBeenCalledWith({
        where: { userId_kanjiId: { userId: mockUser.id, kanjiId: mockKanji.id } },
        update: { mnemonic: "One horizontal line, simple as that!" },
        create: {
          userId: mockUser.id,
          kanjiId: mockKanji.id,
          mnemonic: "One horizontal line, simple as that!",
        },
      });
    });

    it("should update existing mnemonic", async () => {
      vi.mocked(authHelpers.getCurrentUser).mockResolvedValue(mockUser as never);
      vi.mocked(prisma.kanji.findUnique).mockResolvedValue(mockKanji as never);
      vi.mocked(prisma.kanjiMnemonic.upsert).mockResolvedValue({
        id: "mnemonic1",
        userId: mockUser.id,
        kanjiId: mockKanji.id,
        mnemonic: "Updated mnemonic story",
        createdAt: new Date(),
      });

      const req = new Request("http://localhost/api/kanji/ä¸€/mnemonic/save", {
        method: "POST",
        body: JSON.stringify({ mnemonic: "Updated mnemonic story" }),
      });
      const params = Promise.resolve({ character: "ä¸€" });

      const res = await POST(req, { params });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });

    it("should handle URL-encoded characters", async () => {
      vi.mocked(authHelpers.getCurrentUser).mockResolvedValue(mockUser as never);
      vi.mocked(prisma.kanji.findUnique).mockResolvedValue(mockKanji as never);
      vi.mocked(prisma.kanjiMnemonic.upsert).mockResolvedValue({
        id: "mnemonic1",
        userId: mockUser.id,
        kanjiId: mockKanji.id,
        mnemonic: "Test",
        createdAt: new Date(),
      });

      const req = new Request("http://localhost/api/kanji/%E4%B8%80/mnemonic/save", {
        method: "POST",
        body: JSON.stringify({ mnemonic: "Test" }),
      });
      const params = Promise.resolve({ character: "%E4%B8%80" }); // URL-encoded 一

      const res = await POST(req, { params });
      expect(res.status).toBe(200);

      expect(prisma.kanji.findUnique).toHaveBeenCalledWith({
        where: { character: "一" }, // Decoded
      });
    });

    it("should return 500 on database error", async () => {
      vi.mocked(authHelpers.getCurrentUser).mockResolvedValue(mockUser as never);
      vi.mocked(prisma.kanji.findUnique).mockResolvedValue(mockKanji as never);
      vi.mocked(prisma.kanjiMnemonic.upsert).mockRejectedValue(
        new Error("Database error")
      );

      const req = new Request("http://localhost/api/kanji/ä¸€/mnemonic/save", {
        method: "POST",
        body: JSON.stringify({ mnemonic: "Test" }),
      });
      const params = Promise.resolve({ character: "ä¸€" });

      const res = await POST(req, { params });
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBe("Failed to save mnemonic");
    });

    it("should handle empty mnemonic string", async () => {
      vi.mocked(authHelpers.getCurrentUser).mockResolvedValue(mockUser as never);

      const req = new Request("http://localhost/api/kanji/ä¸€/mnemonic/save", {
        method: "POST",
        body: JSON.stringify({ mnemonic: "" }),
      });
      const params = Promise.resolve({ character: "ä¸€" });

      const res = await POST(req, { params });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Mnemonic text required");
    });

    it("should handle invalid JSON body", async () => {
      vi.mocked(authHelpers.getCurrentUser).mockResolvedValue(mockUser as never);

      const req = new Request("http://localhost/api/kanji/ä¸€/mnemonic/save", {
        method: "POST",
        body: "invalid json",
      });
      const params = Promise.resolve({ character: "ä¸€" });

      const res = await POST(req, { params });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid request body");
    });
  });
});
