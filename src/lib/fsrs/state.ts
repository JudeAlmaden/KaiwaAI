/**
 * FSRS State Parser and Formatter
 * 
 * This module provides parsing and formatting functionality for FSRS (Free Spaced Repetition Scheduler)
 * state and legacy SM-2 state.
 * 
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.6, 2.7
 */

export interface FSRSState {
  difficulty: number;      // 1-10 scale
  stability: number;       // days until R drops to desired retention
  retrievability: number;  // 0-1 probability of successful recall
}

export interface SM2State {
  easeFactor: number;
  interval: number;
  repetitions: number;
}

/**
 * StateParser: Parses FSRS and SM-2 state from JSON strings
 */
export class StateParser {
  /**
   * Parse FSRS state from JSON string
   * Requirement 2.1: Parse FSRS state from JSON string format
   * Requirement 2.2: Validate that parsed state contains required fields
   * Requirement 2.3: Return an error when required FSRS fields are missing
   * 
   * @param json - JSON string containing FSRS state
   * @returns Parsed FSRS state object
   * @throws Error if JSON is malformed or required fields are missing
   */
  parseFSRS(json: string): FSRSState {
    let parsed: unknown;
    
    try {
      parsed = JSON.parse(json);
    } catch (_error) {
      throw new Error(`Failed to parse FSRS state JSON: ${_error instanceof Error ? _error.message : String(_error)}`);
    }

    if (parsed === null || typeof parsed !== "object") {
      throw new Error(`Missing required FSRS fields: difficulty, stability, retrievability`);
    }
    const obj = parsed as Record<string, unknown>;

    // Validate required fields
    const requiredFields = ['difficulty', 'stability', 'retrievability'] as const;
    const missingFields = requiredFields.filter(field => !(field in obj));
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required FSRS fields: ${missingFields.join(', ')}`);
    }

    // Validate field types
    if (typeof obj.difficulty !== 'number') {
      throw new Error(`Invalid difficulty field: expected number, got ${typeof obj.difficulty}`);
    }
    if (typeof obj.stability !== 'number') {
      throw new Error(`Invalid stability field: expected number, got ${typeof obj.stability}`);
    }
    if (typeof obj.retrievability !== 'number') {
      throw new Error(`Invalid retrievability field: expected number, got ${typeof obj.retrievability}`);
    }

    return {
      difficulty: obj.difficulty,
      stability: obj.stability,
      retrievability: obj.retrievability,
    };
  }

  /**
   * Parse legacy SM-2 state from JSON string
   * Requirement 2.7: Handle legacy SM-2 state format without errors
   * 
   * @param json - JSON string containing SM-2 state
   * @returns Parsed SM-2 state object or null if parsing fails
   */
  parseSM2(json: string): SM2State | null {
    let parsed: unknown;
    
    try {
      parsed = JSON.parse(json);
    } catch {
      // Return null instead of throwing for backward compatibility
      return null;
    }

    if (parsed === null || typeof parsed !== "object") {
      return null;
    }
    const obj = parsed as Record<string, unknown>;

    // Check for SM-2 fields
    const hasSM2Fields = 
      'easeFactor' in obj &&
      'interval' in obj &&
      'repetitions' in obj;

    if (!hasSM2Fields) {
      return null;
    }

    // Validate field types
    if (typeof obj.easeFactor !== 'number' ||
        typeof obj.interval !== 'number' ||
        typeof obj.repetitions !== 'number') {
      return null;
    }

    return {
      easeFactor: obj.easeFactor,
      interval: obj.interval,
      repetitions: obj.repetitions,
    };
  }
}

/**
 * StateFormatter: Formats FSRS state to JSON strings
 */
export class StateFormatter {
  /**
   * Format FSRS state to JSON string
   * Requirement 2.4: Format FSRS state into JSON string format
   * Requirement 2.6: Include difficulty, stability, and retrievability in formatted output
   * Requirement 2.5: Round-trip property - formatting then parsing should produce equivalent JSON
   * 
   * @param state - FSRS state object
   * @returns JSON string representation
   */
  formatFSRS(state: FSRSState): string {
    // Validate input before formatting
    if (typeof state.difficulty !== 'number') {
      throw new Error(`Invalid difficulty: expected number, got ${typeof state.difficulty}`);
    }
    if (typeof state.stability !== 'number') {
      throw new Error(`Invalid stability: expected number, got ${typeof state.stability}`);
    }
    if (typeof state.retrievability !== 'number') {
      throw new Error(`Invalid retrievability: expected number, got ${typeof state.retrievability}`);
    }

    // Create a clean object with only the required fields
    const cleanState = {
      difficulty: state.difficulty,
      stability: state.stability,
      retrievability: state.retrievability,
    };

    return JSON.stringify(cleanState);
  }
}
