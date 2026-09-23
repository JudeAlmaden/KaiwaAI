import { describe, it, expect } from "vitest";
import { StateParser, StateFormatter, type FSRSState } from "./state";

describe("StateParser", () => {
  const parser = new StateParser();

  describe("parseFSRS", () => {
    it("parses valid FSRS state from JSON", () => {
      const json = JSON.stringify({
        difficulty: 5.5,
        stability: 10.2,
        retrievability: 0.85,
      });

      const result = parser.parseFSRS(json);

      expect(result).toEqual({
        difficulty: 5.5,
        stability: 10.2,
        retrievability: 0.85,
      });
    });

    it("throws error when JSON is malformed", () => {
      const malformedJson = "{ difficulty: 5.5, stability: 10 ";

      expect(() => parser.parseFSRS(malformedJson)).toThrow(
        /Failed to parse FSRS state JSON/
      );
    });

    it("throws error when difficulty field is missing", () => {
      const json = JSON.stringify({
        stability: 10.2,
        retrievability: 0.85,
      });

      expect(() => parser.parseFSRS(json)).toThrow(
        /Missing required FSRS fields: difficulty/
      );
    });

    it("throws error when stability field is missing", () => {
      const json = JSON.stringify({
        difficulty: 5.5,
        retrievability: 0.85,
      });

      expect(() => parser.parseFSRS(json)).toThrow(
        /Missing required FSRS fields: stability/
      );
    });

    it("throws error when retrievability field is missing", () => {
      const json = JSON.stringify({
        difficulty: 5.5,
        stability: 10.2,
      });

      expect(() => parser.parseFSRS(json)).toThrow(
        /Missing required FSRS fields: retrievability/
      );
    });

    it("throws error when multiple fields are missing", () => {
      const json = JSON.stringify({
        difficulty: 5.5,
      });

      expect(() => parser.parseFSRS(json)).toThrow(
        /Missing required FSRS fields: stability, retrievability/
      );
    });

    it("throws error when difficulty is not a number", () => {
      const json = JSON.stringify({
        difficulty: "5.5",
        stability: 10.2,
        retrievability: 0.85,
      });

      expect(() => parser.parseFSRS(json)).toThrow(
        /Invalid difficulty field: expected number, got string/
      );
    });

    it("throws error when stability is not a number", () => {
      const json = JSON.stringify({
        difficulty: 5.5,
        stability: "10.2",
        retrievability: 0.85,
      });

      expect(() => parser.parseFSRS(json)).toThrow(
        /Invalid stability field: expected number, got string/
      );
    });

    it("throws error when retrievability is not a number", () => {
      const json = JSON.stringify({
        difficulty: 5.5,
        stability: 10.2,
        retrievability: "0.85",
      });

      expect(() => parser.parseFSRS(json)).toThrow(
        /Invalid retrievability field: expected number, got string/
      );
    });

    it("parses FSRS state with extra fields (ignores them)", () => {
      const json = JSON.stringify({
        difficulty: 5.5,
        stability: 10.2,
        retrievability: 0.85,
        extraField: "should be ignored",
      });

      const result = parser.parseFSRS(json);

      expect(result).toEqual({
        difficulty: 5.5,
        stability: 10.2,
        retrievability: 0.85,
      });
    });

    it("handles zero values correctly", () => {
      const json = JSON.stringify({
        difficulty: 0,
        stability: 0,
        retrievability: 0,
      });

      const result = parser.parseFSRS(json);

      expect(result).toEqual({
        difficulty: 0,
        stability: 0,
        retrievability: 0,
      });
    });

    it("handles boundary values correctly", () => {
      const json = JSON.stringify({
        difficulty: 10,
        stability: 365,
        retrievability: 1,
      });

      const result = parser.parseFSRS(json);

      expect(result).toEqual({
        difficulty: 10,
        stability: 365,
        retrievability: 1,
      });
    });
  });

  describe("parseSM2", () => {
    it("parses valid SM-2 state from JSON", () => {
      const json = JSON.stringify({
        easeFactor: 2.5,
        interval: 10,
        repetitions: 3,
      });

      const result = parser.parseSM2(json);

      expect(result).toEqual({
        easeFactor: 2.5,
        interval: 10,
        repetitions: 3,
      });
    });

    it("returns null when JSON is malformed", () => {
      const malformedJson = "{ easeFactor: 2.5, interval: 10 ";

      const result = parser.parseSM2(malformedJson);

      expect(result).toBeNull();
    });

    it("returns null when easeFactor is missing", () => {
      const json = JSON.stringify({
        interval: 10,
        repetitions: 3,
      });

      const result = parser.parseSM2(json);

      expect(result).toBeNull();
    });

    it("returns null when interval is missing", () => {
      const json = JSON.stringify({
        easeFactor: 2.5,
        repetitions: 3,
      });

      const result = parser.parseSM2(json);

      expect(result).toBeNull();
    });

    it("returns null when repetitions is missing", () => {
      const json = JSON.stringify({
        easeFactor: 2.5,
        interval: 10,
      });

      const result = parser.parseSM2(json);

      expect(result).toBeNull();
    });

    it("returns null when easeFactor is not a number", () => {
      const json = JSON.stringify({
        easeFactor: "2.5",
        interval: 10,
        repetitions: 3,
      });

      const result = parser.parseSM2(json);

      expect(result).toBeNull();
    });

    it("returns null when interval is not a number", () => {
      const json = JSON.stringify({
        easeFactor: 2.5,
        interval: "10",
        repetitions: 3,
      });

      const result = parser.parseSM2(json);

      expect(result).toBeNull();
    });

    it("returns null when repetitions is not a number", () => {
      const json = JSON.stringify({
        easeFactor: 2.5,
        interval: 10,
        repetitions: "3",
      });

      const result = parser.parseSM2(json);

      expect(result).toBeNull();
    });

    it("parses SM-2 state with extra fields (ignores them)", () => {
      const json = JSON.stringify({
        easeFactor: 2.5,
        interval: 10,
        repetitions: 3,
        extraField: "should be ignored",
      });

      const result = parser.parseSM2(json);

      expect(result).toEqual({
        easeFactor: 2.5,
        interval: 10,
        repetitions: 3,
      });
    });

    it("handles zero values correctly", () => {
      const json = JSON.stringify({
        easeFactor: 0,
        interval: 0,
        repetitions: 0,
      });

      const result = parser.parseSM2(json);

      expect(result).toEqual({
        easeFactor: 0,
        interval: 0,
        repetitions: 0,
      });
    });

    it("handles typical SM-2 values", () => {
      const json = JSON.stringify({
        easeFactor: 1.7,
        interval: 30,
        repetitions: 5,
      });

      const result = parser.parseSM2(json);

      expect(result).toEqual({
        easeFactor: 1.7,
        interval: 30,
        repetitions: 5,
      });
    });
  });
});

describe("StateFormatter", () => {
  const formatter = new StateFormatter();

  describe("formatFSRS", () => {
    it("formats valid FSRS state to JSON", () => {
      const state: FSRSState = {
        difficulty: 5.5,
        stability: 10.2,
        retrievability: 0.85,
      };

      const result = formatter.formatFSRS(state);
      const parsed = JSON.parse(result);

      expect(parsed).toEqual({
        difficulty: 5.5,
        stability: 10.2,
        retrievability: 0.85,
      });
    });

    it("throws error when difficulty is not a number", () => {
      const state = {
        difficulty: "5.5" as unknown as number,
        stability: 10.2,
        retrievability: 0.85,
      };

      expect(() => formatter.formatFSRS(state)).toThrow(
        /Invalid difficulty: expected number, got string/
      );
    });

    it("throws error when stability is not a number", () => {
      const state = {
        difficulty: 5.5,
        stability: "10.2" as unknown as number,
        retrievability: 0.85,
      };

      expect(() => formatter.formatFSRS(state)).toThrow(
        /Invalid stability: expected number, got string/
      );
    });

    it("throws error when retrievability is not a number", () => {
      const state = {
        difficulty: 5.5,
        stability: 10.2,
        retrievability: "0.85" as unknown as number,
      };

      expect(() => formatter.formatFSRS(state)).toThrow(
        /Invalid retrievability: expected number, got string/
      );
    });

    it("formats zero values correctly", () => {
      const state: FSRSState = {
        difficulty: 0,
        stability: 0,
        retrievability: 0,
      };

      const result = formatter.formatFSRS(state);
      const parsed = JSON.parse(result);

      expect(parsed).toEqual({
        difficulty: 0,
        stability: 0,
        retrievability: 0,
      });
    });

    it("formats boundary values correctly", () => {
      const state: FSRSState = {
        difficulty: 10,
        stability: 365,
        retrievability: 1,
      };

      const result = formatter.formatFSRS(state);
      const parsed = JSON.parse(result);

      expect(parsed).toEqual({
        difficulty: 10,
        stability: 365,
        retrievability: 1,
      });
    });

    it("preserves precision for decimal values", () => {
      const state: FSRSState = {
        difficulty: 5.123456789,
        stability: 10.987654321,
        retrievability: 0.123456789,
      };

      const result = formatter.formatFSRS(state);
      const parsed = JSON.parse(result);

      expect(parsed.difficulty).toBe(5.123456789);
      expect(parsed.stability).toBe(10.987654321);
      expect(parsed.retrievability).toBe(0.123456789);
    });
  });
});

describe("Round-trip property", () => {
  const parser = new StateParser();
  const formatter = new StateFormatter();

  it("formatting then parsing produces equivalent state", () => {
    const originalState: FSRSState = {
      difficulty: 5.5,
      stability: 10.2,
      retrievability: 0.85,
    };

    const formatted = formatter.formatFSRS(originalState);
    const parsed = parser.parseFSRS(formatted);

    expect(parsed).toEqual(originalState);
  });

  it("round-trip preserves exact values", () => {
    const states: FSRSState[] = [
      { difficulty: 1, stability: 0.5, retrievability: 0 },
      { difficulty: 5, stability: 10, retrievability: 0.5 },
      { difficulty: 10, stability: 365, retrievability: 1 },
      { difficulty: 3.14159, stability: 2.71828, retrievability: 0.61803 },
    ];

    for (const state of states) {
      const formatted = formatter.formatFSRS(state);
      const parsed = parser.parseFSRS(formatted);
      expect(parsed).toEqual(state);
    }
  });

  it("parsing and formatting again produces same JSON", () => {
    const json1 = JSON.stringify({
      difficulty: 5.5,
      stability: 10.2,
      retrievability: 0.85,
    });

    const parsed = parser.parseFSRS(json1);
    const json2 = formatter.formatFSRS(parsed);

    expect(JSON.parse(json2)).toEqual(JSON.parse(json1));
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Property tests (100 iterations each, § Correctness Properties)
// ─────────────────────────────────────────────────────────────────────────

const ITERATIONS = 100;

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

describe("Feature: fsrs-migration, Property 7: State Format/Parse Round-Trip", () => {
  const parser = new StateParser();
  const formatter = new StateFormatter();

  it(`for any valid FSRSState S, parse(format(S)) === S (${ITERATIONS} iters)`, () => {
    for (let i = 0; i < ITERATIONS; i++) {
      const original: FSRSState = {
        difficulty: rand(1, 10),
        stability: rand(0.1, 365),
        retrievability: rand(0, 1),
      };
      const formatted = formatter.formatFSRS(original);
      const parsed = parser.parseFSRS(formatted);
      expect(parsed).toEqual(original);
    }
  });

  it(`for any JSON J with valid numbers, format(parse(J)) round-trips to equivalent values (${ITERATIONS} iters)`, () => {
    for (let i = 0; i < ITERATIONS; i++) {
      const d = rand(1, 10);
      const s = rand(0.1, 365);
      const r = rand(0, 1);
      const j = JSON.stringify({ difficulty: d, stability: s, retrievability: r });
      const parsed = parser.parseFSRS(j);
      const reformatted = JSON.parse(formatter.formatFSRS(parsed));
      expect(reformatted.difficulty).toBeCloseTo(d, 10);
      expect(reformatted.stability).toBeCloseTo(s, 10);
      expect(reformatted.retrievability).toBeCloseTo(r, 10);
    }
  });
});

describe("Feature: fsrs-migration, Property 8: State Contains Required Fields", () => {
  const parser = new StateParser();
  const formatter = new StateFormatter();

  it(`formatter output JSON always contains the three required fields (${ITERATIONS} iters)`, () => {
    for (let i = 0; i < ITERATIONS; i++) {
      const state: FSRSState = {
        difficulty: rand(1, 10),
        stability: rand(0.1, 365),
        retrievability: rand(0, 1),
      };
      const formatted = formatter.formatFSRS(state);
      const parsed = JSON.parse(formatted);
      expect(parsed).toHaveProperty("difficulty");
      expect(parsed).toHaveProperty("stability");
      expect(parsed).toHaveProperty("retrievability");
      expect(typeof parsed.difficulty).toBe("number");
      expect(typeof parsed.stability).toBe("number");
      expect(typeof parsed.retrievability).toBe("number");
    }
  });

  it(`parser throws if any required field is missing, otherwise success (${ITERATIONS} iters)`, () => {
    const fields: Array<"difficulty" | "stability" | "retrievability"> = [
      "difficulty",
      "stability",
      "retrievability",
    ];
    for (let i = 0; i < ITERATIONS; i++) {
      for (const missing of fields) {
        const obj: Record<string, number> = {
          difficulty: rand(1, 10),
          stability: rand(0.1, 365),
          retrievability: rand(0, 1),
        };
        delete obj[missing];
        expect(() => parser.parseFSRS(JSON.stringify(obj))).toThrow(
          /Missing required FSRS fields/
        );
      }
      // Full object parses successfully
      const good: Record<string, number> = {
        difficulty: rand(1, 10),
        stability: rand(0.1, 365),
        retrievability: rand(0, 1),
      };
      expect(() => parser.parseFSRS(JSON.stringify(good))).not.toThrow();
    }
  });
});
