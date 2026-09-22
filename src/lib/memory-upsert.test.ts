import { describe, it, expect, vi, beforeEach } from "vitest";

const { findMany, update, create, findFirst } = vi.hoisted(() => ({
  findMany: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
  findFirst: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    memory: { findMany, update, create, findFirst },
  },
}));

import { upsertMemory } from "./memory-upsert";

describe("upsertMemory", () => {
  beforeEach(() => {
    findMany.mockReset();
    update.mockReset();
    create.mockReset();
    findFirst.mockReset();
  });

  it("creates when no near duplicate exists", async () => {
    findMany.mockResolvedValue([]);
    create.mockResolvedValue({ id: "new", content: "Has a dog", importance: 2 });

    const result = await upsertMemory({
      userId: "u1",
      personaId: "p1",
      content: "Has a dog",
      category: "fact",
      importance: 2,
    });

    expect(result.deduped).toBe(false);
    expect(create).toHaveBeenCalledOnce();
    expect(update).not.toHaveBeenCalled();
  });

  it("updates and marks deduped on near-duplicate", async () => {
    findMany.mockResolvedValue([
      { id: "old", content: "Has a dog named Mochi", importance: 1 },
    ]);
    update.mockResolvedValue({
      id: "old",
      content: "Has a dog named Mochi",
      importance: 3,
    });

    const result = await upsertMemory({
      userId: "u1",
      personaId: "p1",
      content: "Has a dog named mochi",
      category: "fact",
      importance: 3,
    });

    expect(result.deduped).toBe(true);
    expect(update).toHaveBeenCalledOnce();
    expect(create).not.toHaveBeenCalled();
    expect(update.mock.calls[0][0].data.importance).toBe(3);
  });

  it("keeps higher existing importance when bumping a duplicate", async () => {
    findMany.mockResolvedValue([
      { id: "old", content: "Likes ramen", importance: 5 },
    ]);
    update.mockResolvedValue({ id: "old", importance: 5 });

    await upsertMemory({
      userId: "u1",
      personaId: null,
      content: "Likes ramen",
      category: "preference",
      importance: 2,
    });

    expect(update.mock.calls[0][0].data.importance).toBe(5);
  });

  it("soft-supersedes an old memory when creating a replacement", async () => {
    findMany.mockResolvedValue([]);
    create.mockResolvedValue({ id: "new", content: "No longer has a cat" });
    findFirst.mockResolvedValue({ id: "stale" });
    update.mockResolvedValue({ id: "stale" });

    await upsertMemory({
      userId: "u1",
      personaId: "p1",
      content: "No longer has a cat",
      category: "fact",
      importance: 3,
      supersedesId: "stale",
    });

    expect(findFirst).toHaveBeenCalledWith({
      where: { id: "stale", userId: "u1" },
      select: { id: true },
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: "stale" },
      data: { supersededById: "new" },
    });
  });
});
