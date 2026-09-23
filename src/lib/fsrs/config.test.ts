/**
 * Tests for FSRS v4 Configuration Management
 * 
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  FSRSConfig,
  FSRSConfigError,
  DEFAULT_DESIRED_RETENTION,
  MIN_DESIRED_RETENTION,
  MAX_DESIRED_RETENTION,
  DEFAULT_FSRS_PARAMETERS,
  validateDesiredRetention,
  validateParameters,
  getDefaultConfig,
  loadConfig,
  createConfig,
  getConfig,
  resetConfig,
} from './config';

describe('FSRS Configuration Management', () => {
  beforeEach(() => {
    // Reset global config before each test
    resetConfig();
  });

  afterEach(() => {
    // Clean up environment variables after each test
    delete process.env.FSRS_DESIRED_RETENTION;
    for (let i = 0; i < 19; i++) {
      delete process.env[`FSRS_W${i}`];
    }
  });

  describe('Default Configuration', () => {
    it('should have default desired retention of 90%', () => {
      expect(DEFAULT_DESIRED_RETENTION).toBe(0.9);
    });

    it('should have 19 default FSRS parameters', () => {
      expect(DEFAULT_FSRS_PARAMETERS).toHaveLength(19);
    });

    it('should have all positive parameter values', () => {
      DEFAULT_FSRS_PARAMETERS.forEach((param) => {
        expect(param).toBeGreaterThanOrEqual(0);
      });
    });

    it('should return default config with correct structure', () => {
      const config = getDefaultConfig();
      
      expect(config).toHaveProperty('desiredRetention');
      expect(config).toHaveProperty('parameters');
      expect(config.desiredRetention).toBe(DEFAULT_DESIRED_RETENTION);
      expect(config.parameters).toHaveLength(19);
    });
  });

  describe('Desired Retention Validation', () => {
    it('should accept 90% retention (default)', () => {
      expect(() => validateDesiredRetention(0.9)).not.toThrow();
    });

    it('should accept minimum retention (70%)', () => {
      expect(() => validateDesiredRetention(MIN_DESIRED_RETENTION)).not.toThrow();
    });

    it('should accept maximum retention (98%)', () => {
      expect(() => validateDesiredRetention(MAX_DESIRED_RETENTION)).not.toThrow();
    });

    it('should accept retention between min and max', () => {
      expect(() => validateDesiredRetention(0.85)).not.toThrow();
      expect(() => validateDesiredRetention(0.95)).not.toThrow();
    });

    it('should reject retention below 70%', () => {
      expect(() => validateDesiredRetention(0.69)).toThrow(FSRSConfigError);
      expect(() => validateDesiredRetention(0.5)).toThrow(FSRSConfigError);
    });

    it('should reject retention above 98%', () => {
      expect(() => validateDesiredRetention(0.99)).toThrow(FSRSConfigError);
      expect(() => validateDesiredRetention(1.0)).toThrow(FSRSConfigError);
    });

    it('should reject non-number values', () => {
      expect(() => validateDesiredRetention(NaN)).toThrow(FSRSConfigError);
      expect(() => validateDesiredRetention('0.9' as unknown as number)).toThrow(FSRSConfigError);
    });

    it('should provide helpful error messages', () => {
      expect(() => validateDesiredRetention(0.5)).toThrow(/must be between/);
      expect(() => validateDesiredRetention(1.0)).toThrow(/must be between/);
    });
  });

  describe('Parameters Validation', () => {
    it('should accept default parameters', () => {
      expect(() => validateParameters(DEFAULT_FSRS_PARAMETERS)).not.toThrow();
    });

    it('should require exactly 19 parameters', () => {
      expect(() => validateParameters([1, 2, 3])).toThrow(FSRSConfigError);
      expect(() => validateParameters([...DEFAULT_FSRS_PARAMETERS, 0.5])).toThrow(FSRSConfigError);
    });

    it('should reject non-array input', () => {
      expect(() => validateParameters('not an array' as unknown as number[])).toThrow(FSRSConfigError);
      expect(() => validateParameters(null as unknown as number[])).toThrow(FSRSConfigError);
    });

    it('should reject parameters with non-number values', () => {
      const invalidParams = [...DEFAULT_FSRS_PARAMETERS];
      invalidParams[5] = NaN;
      expect(() => validateParameters(invalidParams)).toThrow(FSRSConfigError);
    });

    it('should reject parameters outside acceptable ranges', () => {
      // Test w[0] (initial stability) - should be [0.1, 30]
      const tooLowParams = [...DEFAULT_FSRS_PARAMETERS];
      tooLowParams[0] = 0.05; // Below minimum
      expect(() => validateParameters(tooLowParams)).toThrow(FSRSConfigError);

      const tooHighParams = [...DEFAULT_FSRS_PARAMETERS];
      tooHighParams[0] = 35; // Above maximum
      expect(() => validateParameters(tooHighParams)).toThrow(FSRSConfigError);
    });

    it('should provide helpful error messages with parameter index', () => {
      const invalidParams = [...DEFAULT_FSRS_PARAMETERS];
      invalidParams[4] = 15; // w[4] should be [1, 10]
      
      expect(() => validateParameters(invalidParams)).toThrow(/w\[4\]/);
      expect(() => validateParameters(invalidParams)).toThrow(/must be between/);
    });
  });

  describe('Load Configuration', () => {
    it('should load default config when no environment variables set', () => {
      const config = loadConfig();
      
      expect(config.desiredRetention).toBe(DEFAULT_DESIRED_RETENTION);
      expect(config.parameters).toEqual(DEFAULT_FSRS_PARAMETERS);
    });

    it('should load desired retention from environment variable', () => {
      process.env.FSRS_DESIRED_RETENTION = '0.85';
      const config = loadConfig();
      
      expect(config.desiredRetention).toBe(0.85);
    });

    it('should load parameter overrides from environment variables', () => {
      process.env.FSRS_W0 = '0.5';
      process.env.FSRS_W1 = '0.7';
      const config = loadConfig();
      
      expect(config.parameters[0]).toBe(0.5);
      expect(config.parameters[1]).toBe(0.7);
      // Other parameters should remain default
      expect(config.parameters[2]).toBe(DEFAULT_FSRS_PARAMETERS[2]);
    });

    it('should fall back to default for invalid environment variable', () => {
      process.env.FSRS_DESIRED_RETENTION = 'invalid';
      const config = loadConfig();
      
      expect(config.desiredRetention).toBe(DEFAULT_DESIRED_RETENTION);
    });

    it('should fall back to default for out-of-range environment variable', () => {
      process.env.FSRS_DESIRED_RETENTION = '0.5'; // Below minimum
      const config = loadConfig();
      
      expect(config.desiredRetention).toBe(DEFAULT_DESIRED_RETENTION);
    });

    it('should handle partial parameter overrides', () => {
      process.env.FSRS_W5 = '1.0';
      const config = loadConfig();
      
      expect(config.parameters[5]).toBe(1.0);
      expect(config.parameters[0]).toBe(DEFAULT_FSRS_PARAMETERS[0]);
      expect(config.parameters[18]).toBe(DEFAULT_FSRS_PARAMETERS[18]);
    });
  });

  describe('Create Custom Configuration', () => {
    it('should create config with custom desired retention', () => {
      const config = createConfig({ desiredRetention: 0.85 });
      
      expect(config.desiredRetention).toBe(0.85);
      expect(config.parameters).toEqual(DEFAULT_FSRS_PARAMETERS);
    });

    it('should create config with custom parameters', () => {
      const customParams = [...DEFAULT_FSRS_PARAMETERS];
      customParams[0] = 0.5;
      
      const config = createConfig({ parameters: customParams });
      
      expect(config.desiredRetention).toBe(DEFAULT_DESIRED_RETENTION);
      expect(config.parameters[0]).toBe(0.5);
    });

    it('should create config with both custom retention and parameters', () => {
      const customParams = [...DEFAULT_FSRS_PARAMETERS];
      customParams[1] = 0.8;
      
      const config = createConfig({
        desiredRetention: 0.88,
        parameters: customParams,
      });
      
      expect(config.desiredRetention).toBe(0.88);
      expect(config.parameters[1]).toBe(0.8);
    });

    it('should throw on invalid desired retention', () => {
      expect(() => createConfig({ desiredRetention: 0.5 })).toThrow(FSRSConfigError);
    });

    it('should throw on invalid parameters', () => {
      const invalidParams = [1, 2, 3]; // Too few
      expect(() => createConfig({ parameters: invalidParams })).toThrow(FSRSConfigError);
    });

    it('should merge with defaults for partial config', () => {
      const config = createConfig({});
      
      expect(config.desiredRetention).toBe(DEFAULT_DESIRED_RETENTION);
      expect(config.parameters).toEqual(DEFAULT_FSRS_PARAMETERS);
    });
  });

  describe('Global Configuration', () => {
    it('should return global config instance', () => {
      const config1 = getConfig();
      const config2 = getConfig();
      
      expect(config1).toBe(config2); // Same instance
    });

    it('should load config on first call', () => {
      process.env.FSRS_DESIRED_RETENTION = '0.87';
      const config = getConfig();
      
      expect(config.desiredRetention).toBe(0.87);
    });

    it('should cache config after first call', () => {
      const config1 = getConfig();
      
      // Change environment variable
      process.env.FSRS_DESIRED_RETENTION = '0.95';
      
      const config2 = getConfig();
      
      // Should still return cached config
      expect(config2.desiredRetention).toBe(config1.desiredRetention);
    });

    it('should reset config when resetConfig is called', () => {
      const config1 = getConfig();
      
      resetConfig();
      process.env.FSRS_DESIRED_RETENTION = '0.95';
      
      const config2 = getConfig();
      
      expect(config2.desiredRetention).not.toBe(config1.desiredRetention);
      expect(config2.desiredRetention).toBe(0.95);
    });
  });

  describe('Configuration Interface', () => {
    it('should have correct TypeScript interface structure', () => {
      const config: FSRSConfig = {
        desiredRetention: 0.9,
        parameters: DEFAULT_FSRS_PARAMETERS,
      };
      
      expect(config).toHaveProperty('desiredRetention');
      expect(config).toHaveProperty('parameters');
      expect(typeof config.desiredRetention).toBe('number');
      expect(Array.isArray(config.parameters)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle boundary values for desired retention', () => {
      expect(() => validateDesiredRetention(0.7)).not.toThrow();
      expect(() => validateDesiredRetention(0.98)).not.toThrow();
      expect(() => validateDesiredRetention(0.7 - 0.001)).toThrow();
      expect(() => validateDesiredRetention(0.98 + 0.001)).toThrow();
    });

    it('should handle empty environment variables', () => {
      process.env.FSRS_DESIRED_RETENTION = '';
      const config = loadConfig();
      
      expect(config.desiredRetention).toBe(DEFAULT_DESIRED_RETENTION);
    });

    it('should handle whitespace in environment variables', () => {
      process.env.FSRS_DESIRED_RETENTION = '  0.85  ';
      const config = loadConfig();
      
      // parseFloat should handle whitespace
      expect(config.desiredRetention).toBe(0.85);
    });

    it('should not mutate default parameters array', () => {
      const originalParams = [...DEFAULT_FSRS_PARAMETERS];
      const config = getDefaultConfig();
      
      config.parameters[0] = 999;
      
      expect(DEFAULT_FSRS_PARAMETERS).toEqual(originalParams);
    });
  });

  describe('Requirements Validation', () => {
    it('should satisfy Requirement 3.1: Use desired retention configuration parameter', () => {
      const config = getConfig();
      expect(config).toHaveProperty('desiredRetention');
      expect(typeof config.desiredRetention).toBe('number');
    });

    it('should satisfy Requirement 3.2: Default desired retention to 90%', () => {
      const config = getDefaultConfig();
      expect(config.desiredRetention).toBe(0.9);
    });

    it('should satisfy Requirement 3.3: Accept desired retention between 70% and 98%', () => {
      expect(() => createConfig({ desiredRetention: 0.7 })).not.toThrow();
      expect(() => createConfig({ desiredRetention: 0.85 })).not.toThrow();
      expect(() => createConfig({ desiredRetention: 0.98 })).not.toThrow();
    });

    it('should satisfy Requirement 3.4: Use 19 FSRS parameter values', () => {
      const config = getConfig();
      expect(config.parameters).toHaveLength(19);
      expect(DEFAULT_FSRS_PARAMETERS).toHaveLength(19);
    });

    it('should satisfy Requirement 3.5: Allow parameter overrides via configuration', () => {
      const customParams = [...DEFAULT_FSRS_PARAMETERS];
      customParams[0] = 0.5;
      
      const config = createConfig({ parameters: customParams });
      expect(config.parameters[0]).toBe(0.5);

      // Test environment variable override
      process.env.FSRS_W10 = '1.5';
      resetConfig();
      const envConfig = getConfig();
      expect(envConfig.parameters[10]).toBe(1.5);
    });

    it('should satisfy Requirement 3.6: Validate parameter ranges on load', () => {
      const invalidParams = [...DEFAULT_FSRS_PARAMETERS];
      invalidParams[4] = 15; // Out of range [1, 10]
      
      expect(() => createConfig({ parameters: invalidParams })).toThrow(FSRSConfigError);
      
      // Environment variable with invalid range should fall back to default
      process.env.FSRS_W4 = '15';
      resetConfig();
      const config = getConfig();
      expect(config.parameters[4]).toBe(DEFAULT_FSRS_PARAMETERS[4]);
    });
  });
});
