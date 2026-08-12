import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CustomVSCodeSettings } from '../../common/vscode/settings';

// ---------------------------------------------------------------------------
// Mock the 'vscode' module
// ---------------------------------------------------------------------------
vi.mock('vscode', () => {
  const configStore: Record<string, Record<string, unknown>> = {};

  const getConfiguration = vi.fn((section?: string) => {
    const sectionKey = section ?? '';
    if (!configStore[sectionKey]) {
      configStore[sectionKey] = {};
    }
    return {
      get: vi.fn((key: string, defaultValue?: unknown) => {
        const value = configStore[sectionKey][key];
        return value !== undefined ? value : defaultValue;
      }),
      update: vi.fn((key: string, value: unknown) => {
        configStore[sectionKey][key] = value;
        return Promise.resolve();
      }),
      inspect: vi.fn((key: string) => configStore[sectionKey]?.[`__inspect__${key}`]),
    };
  });

  // Helper exposed on workspace to let tests set values
  const __setConfig = (section: string, key: string, value: unknown) => {
    if (!configStore[section]) configStore[section] = {};
    configStore[section][key] = value;
  };

  const __setInspect = (section: string, fullKey: string, inspectResult: unknown) => {
    if (!configStore[section]) configStore[section] = {};
    (configStore[section] as any)[`__inspect__${fullKey}`] = inspectResult;
  };

  const __reset = () => {
    for (const k of Object.keys(configStore)) delete configStore[k];
  };

  return {
    workspace: {
      getConfiguration,
      __setConfig,
      __setInspect,
      __reset,
    },
    env: { appName: 'Visual Studio Code' },
  };
});

// ---------------------------------------------------------------------------
// Helpers to control the stub
// ---------------------------------------------------------------------------
import { workspace } from 'vscode';

const ws = workspace as any;

beforeEach(() => ws.__reset());

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('CustomVSCodeSettings', () => {
  const NS = 'myext';
  let settings: CustomVSCodeSettings;

  beforeEach(() => {
    settings = new CustomVSCodeSettings(NS);
  });

  describe('isTelemetryEnabled()', () => {
    it('returns true when namespace enabled=true', () => {
      ws.__setConfig(`${NS}.telemetry`, 'enabled', true);
      expect(settings.isTelemetryEnabled()).toBe(true);
    });

    it('returns false when namespace enabled=false', () => {
      ws.__setConfig(`${NS}.telemetry`, 'enabled', false);
      expect(settings.isTelemetryEnabled()).toBe(false);
    });

    it('returns true when namespace enabled=true even when global telemetryLevel is off', () => {
      // global level must not affect the custom pipeline
      ws.__setConfig('', 'telemetry.telemetryLevel', 'off');
      ws.__setConfig(`${NS}.telemetry`, 'enabled', true);
      expect(settings.isTelemetryEnabled()).toBe(true);
    });

    it('returns false when namespace key is not set (defaults to false)', () => {
      // do NOT set myext.telemetry.enabled → get() returns defaultValue=false
      expect(settings.isTelemetryEnabled()).toBe(false);
    });

    it('is unaffected by redhat.telemetry.enabled being true', () => {
      ws.__setConfig('redhat.telemetry', 'enabled', true); // should be ignored
      ws.__setConfig(`${NS}.telemetry`, 'enabled', false);
      expect(settings.isTelemetryEnabled()).toBe(false);
    });
  });

  describe('isTelemetryConfigured()', () => {
    it('returns false when inspect returns all-undefined (never set)', () => {
      ws.__setInspect('', `${NS}.telemetry.enabled`, {
        globalValue: undefined,
        workspaceValue: undefined,
        workspaceFolderValue: undefined,
        globalLanguageValue: undefined,
        workspaceLanguageValue: undefined,
        workspaceFolderLanguageValue: undefined,
      });
      expect(settings.isTelemetryConfigured()).toBe(false);
    });

    it('returns true when globalValue is set', () => {
      ws.__setInspect('', `${NS}.telemetry.enabled`, { globalValue: true });
      expect(settings.isTelemetryConfigured()).toBe(true);
    });
  });

  describe('updateTelemetryEnabledConfig()', () => {
    it('writes enabled=true to the custom namespace config, not redhat.*', async () => {
      const mockUpdate = vi.fn().mockResolvedValue(undefined);
      (workspace.getConfiguration as any).mockImplementation((section?: string) => ({
        get: vi.fn(),
        update: section === `${NS}.telemetry` ? mockUpdate : vi.fn(),
        inspect: vi.fn(),
      }));

      await settings.updateTelemetryEnabledConfig(true);
      expect(mockUpdate).toHaveBeenCalledWith('enabled', true, true);
    });

    it('writes enabled=false to the custom namespace config on deny', async () => {
      const mockUpdate = vi.fn().mockResolvedValue(undefined);
      (workspace.getConfiguration as any).mockImplementation((section?: string) => ({
        get: vi.fn(),
        update: section === `${NS}.telemetry` ? mockUpdate : vi.fn(),
        inspect: vi.fn(),
      }));

      await settings.updateTelemetryEnabledConfig(false);
      expect(mockUpdate).toHaveBeenCalledWith('enabled', false, true);
    });
  });

  describe('configSection getter', () => {
    it('returns "<namespace>.telemetry"', () => {
      expect(settings.configSection).toBe(`${NS}.telemetry`);
    });
  });
});
