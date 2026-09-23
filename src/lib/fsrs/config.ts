/**
 * FSRS v4 Configuration Management
 * 
 * This module provides configuration interfaces and defaults for the FSRS v4
 * scheduling algorithm, including:
 * - Desired retention configuration (default 90%)
 * - 19 FSRS parameters optimized for vocabulary learning
 * - Parameter validation and overrides via environment variables
 * 
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

/**
 * FSRS Configuration Interface
 * Defines all configurable parameters for the FSRS v4 algorithm
 */
export interface FSRSConfig {
  /**
   * Desired retention rate: probability of successful recall at review time.
   * Must be between 0.7 (70%) and 0.98 (98%).
   * Default: 0.9 (90%)
   * 
   * Higher values = more frequent reviews, better retention
   * Lower values = less frequent reviews, more efficient but lower retention
   */
  desiredRetention: number;

  /**
   * 19 FSRS v4 parameters optimized for vocabulary learning.
   * 
   * Parameters breakdown:
   * - w[0-3]: Initial stability for grades Again, Hard, Good, Easy
   * - w[4]: Initial difficulty
   * - w[5-7]: Difficulty adjustment factors
   * - w[8-10]: Stability growth factors for successful reviews
   * - w[11-14]: Stability after lapse (failed review)
   * - w[15-16]: Grade-specific adjustment multipliers
   * - w[17-18]: Short-term memory factors
   */
  parameters: number[];
}

/**
 * Default FSRS parameters optimized for vocabulary learning.
 * 
 * These parameters are based on FSRS v4 research and optimized for
 * language learning patterns, specifically vocabulary retention.
 * 
 * Research source: https://expertium.github.io/Algorithm.html
 */
export const DEFAULT_FSRS_PARAMETERS: number[] = [
  // Initial stability: w[0-3] - Days until R drops to desired retention after first review
  0.4,   // w[0]: Again (failed first review) - very short initial stability
  0.6,   // w[1]: Hard - short stability, needs more practice
  2.4,   // w[2]: Good - moderate stability for standard learning
  5.8,   // w[3]: Easy - longer stability for easily recalled items

  // Initial difficulty: w[4] - Starting difficulty for new cards (1-10 scale)
  4.93,  // w[4]: Mid-range difficulty (vocabulary is moderately challenging)

  // Difficulty adjustment: w[5-7] - How difficulty changes based on performance
  0.94,  // w[5]: Difficulty weight (how much grades affect difficulty)
  0.86,  // w[6]: Difficulty change rate
  0.01,  // w[7]: Mean reversion to initial difficulty

  // Stability growth: w[8-10] - How stability increases on successful reviews
  1.49,  // w[8]: Base stability growth factor
  0.14,  // w[9]: Stability growth modifier based on difficulty
  0.94,  // w[10]: Retrievability influence on stability growth

  // Stability after lapse: w[11-14] - Stability calculation after failed review
  2.18,  // w[11]: Base lapse factor
  0.05,  // w[12]: Difficulty influence on lapse stability
  0.34,  // w[13]: Previous stability influence on lapse
  1.26,  // w[14]: Retrievability influence on lapse stability

  // Grade adjustment: w[15-16] - Fine-tuning for Hard/Easy grades
  0.29,  // w[15]: Hard grade adjustment (conservative stability increase)
  2.61,  // w[16]: Easy grade adjustment (optimistic stability increase)

  // Short-term factors: w[17-18] - Additional adjustments (currently unused in base FSRS)
  0.0,   // w[17]: Reserved for future use
  0.0,   // w[18]: Reserved for future use
];

/**
 * Default desired retention rate: 90%
 * This means intervals are calculated so that the user has a 90% probability
 * of successful recall when the card comes due.
 */
export const DEFAULT_DESIRED_RETENTION = 0.9;

/**
 * Minimum allowed desired retention: 70%
 * Below this threshold, intervals become too aggressive and learning suffers.
 */
export const MIN_DESIRED_RETENTION = 0.7;

/**
 * Maximum allowed desired retention: 98%
 * Above this threshold, reviews become inefficiently frequent.
 */
export const MAX_DESIRED_RETENTION = 0.98;

/**
 * Parameter validation ranges
 * Each FSRS parameter must fall within acceptable bounds to ensure
 * algorithm stability and reasonable scheduling behavior.
 */
const PARAMETER_RANGES: Array<[number, number]> = [
  // w[0-3]: Initial stability (must be positive, typically 0.1 to 30 days)
  [0.1, 30],   // w[0]: Again
  [0.1, 30],   // w[1]: Hard
  [0.1, 30],   // w[2]: Good
  [0.1, 30],   // w[3]: Easy
  
  // w[4]: Initial difficulty (1-10 scale)
  [1, 10],
  
  // w[5-7]: Difficulty factors (0 to 2, typically small values)
  [0, 2],      // w[5]
  [0, 2],      // w[6]
  [0, 0.5],    // w[7]: Mean reversion should be small
  
  // w[8-10]: Stability growth (0.1 to 5)
  [0.1, 5],    // w[8]
  [0.01, 1],   // w[9]
  [0.1, 5],    // w[10]
  
  // w[11-14]: Lapse factors (0.1 to 10)
  [0.1, 10],   // w[11]
  [0.01, 1],   // w[12]
  [0.1, 2],    // w[13]
  [0.1, 5],    // w[14]
  
  // w[15-16]: Grade adjustments (0.1 to 5)
  [0.1, 5],    // w[15]
  [0.1, 5],    // w[16]
  
  // w[17-18]: Reserved (allow any reasonable value)
  [0, 10],     // w[17]
  [0, 10],     // w[18]
];

/**
 * Environment variable names for parameter overrides
 */
const ENV_DESIRED_RETENTION = 'FSRS_DESIRED_RETENTION';
const ENV_PARAMETERS_PREFIX = 'FSRS_W';

/**
 * Validation error thrown when configuration parameters are invalid
 */
export class FSRSConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FSRSConfigError';
  }
}

/**
 * Validate that desired retention is within acceptable range [0.7, 0.98]
 * 
 * @param retention - Desired retention value to validate
 * @throws {FSRSConfigError} If retention is out of range
 */
export function validateDesiredRetention(retention: number): void {
  if (typeof retention !== 'number' || isNaN(retention)) {
    throw new FSRSConfigError(
      `Desired retention must be a number, got: ${typeof retention}`
    );
  }

  if (retention < MIN_DESIRED_RETENTION || retention > MAX_DESIRED_RETENTION) {
    throw new FSRSConfigError(
      `Desired retention must be between ${MIN_DESIRED_RETENTION} (70%) and ${MAX_DESIRED_RETENTION} (98%), got: ${retention}`
    );
  }
}

/**
 * Validate that all 19 FSRS parameters are within acceptable ranges
 * 
 * @param parameters - Array of 19 FSRS parameters to validate
 * @throws {FSRSConfigError} If parameters are invalid
 */
export function validateParameters(parameters: number[]): void {
  if (!Array.isArray(parameters)) {
    throw new FSRSConfigError(
      `Parameters must be an array, got: ${typeof parameters}`
    );
  }

  if (parameters.length !== 19) {
    throw new FSRSConfigError(
      `Parameters must contain exactly 19 values, got: ${parameters.length}`
    );
  }

  for (let i = 0; i < parameters.length; i++) {
    const param = parameters[i];
    const [min, max] = PARAMETER_RANGES[i];

    if (typeof param !== 'number' || isNaN(param)) {
      throw new FSRSConfigError(
        `Parameter w[${i}] must be a number, got: ${typeof param}`
      );
    }

    if (param < min || param > max) {
      throw new FSRSConfigError(
        `Parameter w[${i}] must be between ${min} and ${max}, got: ${param}`
      );
    }
  }
}

/**
 * Load desired retention from environment variable or return default
 * 
 * Environment variable: FSRS_DESIRED_RETENTION
 * 
 * @returns Validated desired retention value
 */
function loadDesiredRetentionFromEnv(): number {
  const envValue = process.env[ENV_DESIRED_RETENTION];
  
  if (!envValue) {
    return DEFAULT_DESIRED_RETENTION;
  }

  const parsed = parseFloat(envValue);
  
  if (isNaN(parsed)) {
    console.warn(
      `Invalid ${ENV_DESIRED_RETENTION} environment variable: "${envValue}". Using default: ${DEFAULT_DESIRED_RETENTION}`
    );
    return DEFAULT_DESIRED_RETENTION;
  }

  try {
    validateDesiredRetention(parsed);
    return parsed;
  } catch (error) {
    console.warn(
      `${ENV_DESIRED_RETENTION} validation failed: ${error instanceof Error ? error.message : String(error)}. Using default: ${DEFAULT_DESIRED_RETENTION}`
    );
    return DEFAULT_DESIRED_RETENTION;
  }
}

/**
 * Load FSRS parameters from environment variables or return defaults
 * 
 * Environment variables: FSRS_W0, FSRS_W1, ..., FSRS_W18
 * 
 * @returns Validated array of 19 FSRS parameters
 */
function loadParametersFromEnv(): number[] {
  const parameters = [...DEFAULT_FSRS_PARAMETERS];
  let hasOverrides = false;

  for (let i = 0; i < 19; i++) {
    const envKey = `${ENV_PARAMETERS_PREFIX}${i}`;
    const envValue = process.env[envKey];

    if (envValue) {
      const parsed = parseFloat(envValue);
      
      if (isNaN(parsed)) {
        console.warn(
          `Invalid ${envKey} environment variable: "${envValue}". Using default: ${parameters[i]}`
        );
        continue;
      }

      const [min, max] = PARAMETER_RANGES[i];
      if (parsed < min || parsed > max) {
        console.warn(
          `${envKey} out of range [${min}, ${max}]: ${parsed}. Using default: ${parameters[i]}`
        );
        continue;
      }

      parameters[i] = parsed;
      hasOverrides = true;
    }
  }

  if (hasOverrides) {
    console.log('FSRS parameters loaded with environment variable overrides');
  }

  return parameters;
}

/**
 * Get the default FSRS configuration
 * 
 * This configuration uses:
 * - Default desired retention of 90%
 * - Default 19 parameters optimized for vocabulary learning
 * 
 * @returns Default FSRS configuration
 */
export function getDefaultConfig(): FSRSConfig {
  return {
    desiredRetention: DEFAULT_DESIRED_RETENTION,
    parameters: [...DEFAULT_FSRS_PARAMETERS],
  };
}

/**
 * Load FSRS configuration from environment variables with fallback to defaults
 * 
 * Supports the following environment variables:
 * - FSRS_DESIRED_RETENTION: Desired retention rate (0.7 to 0.98)
 * - FSRS_W0 through FSRS_W18: Individual parameter overrides
 * 
 * Invalid values are logged as warnings and fall back to defaults.
 * 
 * @returns Validated FSRS configuration
 */
export function loadConfig(): FSRSConfig {
  const desiredRetention = loadDesiredRetentionFromEnv();
  const parameters = loadParametersFromEnv();

  return {
    desiredRetention,
    parameters,
  };
}

/**
 * Create a custom FSRS configuration with validation
 * 
 * @param config - Partial configuration with desired retention and/or parameters
 * @returns Validated FSRS configuration (merges with defaults)
 * @throws {FSRSConfigError} If validation fails
 */
export function createConfig(config: Partial<FSRSConfig>): FSRSConfig {
  const defaults = getDefaultConfig();

  const desiredRetention = config.desiredRetention ?? defaults.desiredRetention;
  const parameters = config.parameters ?? defaults.parameters;

  // Validate before returning
  validateDesiredRetention(desiredRetention);
  validateParameters(parameters);

  return {
    desiredRetention,
    parameters,
  };
}

/**
 * Global singleton configuration instance
 * Loaded once on module initialization
 */
let globalConfig: FSRSConfig | null = null;

/**
 * Get the global FSRS configuration
 * 
 * Loads configuration on first call, then caches for subsequent calls.
 * Configuration is loaded from environment variables with fallback to defaults.
 * 
 * @returns Global FSRS configuration
 */
export function getConfig(): FSRSConfig {
  if (!globalConfig) {
    globalConfig = loadConfig();
  }
  return globalConfig;
}

/**
 * Reset the global configuration (useful for testing)
 * 
 * @internal
 */
export function resetConfig(): void {
  globalConfig = null;
}
