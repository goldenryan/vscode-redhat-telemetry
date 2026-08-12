import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildOptInMessage, onDidChangeTelemetryEnabled } from '../../common/vscode/redhatServiceInitializer';

// ---------------------------------------------------------------------------
// Mock 'vscode'
// ---------------------------------------------------------------------------
type ChangeListener = (e: { affectsConfiguration: (s: string) => boolean }) => void;
let registeredListener: ChangeListener | undefined;

vi.mock('vscode', () => {
  return {
    workspace: {
      onDidChangeConfiguration: vi.fn((cb: ChangeListener) => {
        registeredListener = cb;
        return { dispose: vi.fn() };
      }),
    },
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fireConfigChange(changed: string[]) {
  registeredListener?.({
    affectsConfiguration: (section: string) => changed.includes(section),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('onDidChangeTelemetryEnabled', () => {
  let flushQueue: ReturnType<typeof vi.fn>;
  let telemetryService: any;

  beforeEach(() => {
    registeredListener = undefined;
    flushQueue = vi.fn();
    telemetryService = { flushQueue };
  });

  describe('default behavior (no custom namespace)', () => {
    it('flushes queue when redhat.telemetry changes', () => {
      onDidChangeTelemetryEnabled(telemetryService);
      fireConfigChange(['redhat.telemetry']);
      expect(flushQueue).toHaveBeenCalledTimes(1);
    });

    it('flushes queue when VS Code global telemetry changes', () => {
      onDidChangeTelemetryEnabled(telemetryService);
      fireConfigChange(['telemetry']);
      expect(flushQueue).toHaveBeenCalledTimes(1);
    });

    it('does NOT flush queue when an unrelated config changes', () => {
      onDidChangeTelemetryEnabled(telemetryService);
      fireConfigChange(['some.other.setting']);
      expect(flushQueue).not.toHaveBeenCalled();
    });
  });

  describe('custom namespace (e.g. "myext.telemetry")', () => {
    it('flushes queue when the custom namespace config changes', () => {
      onDidChangeTelemetryEnabled(telemetryService, 'myext.telemetry');
      fireConfigChange(['myext.telemetry']);
      expect(flushQueue).toHaveBeenCalledTimes(1);
    });

    it('does NOT flush queue when redhat.telemetry changes (custom pipeline is isolated)', () => {
      onDidChangeTelemetryEnabled(telemetryService, 'myext.telemetry');
      fireConfigChange(['redhat.telemetry']);
      expect(flushQueue).not.toHaveBeenCalled();
    });

    it('does NOT flush queue when VS Code global telemetry changes (custom pipeline is isolated)', () => {
      onDidChangeTelemetryEnabled(telemetryService, 'myext.telemetry');
      fireConfigChange(['telemetry']);
      expect(flushQueue).not.toHaveBeenCalled();
    });

    it('does NOT flush queue when an unrelated config changes', () => {
      onDidChangeTelemetryEnabled(telemetryService, 'myext.telemetry');
      fireConfigChange(['some.other.setting']);
      expect(flushQueue).not.toHaveBeenCalled();
    });
  });
});

describe('buildOptInMessage', () => {
  const EXT_ID = 'my.extension';

  it('returns the custom message verbatim when optInMessage is set', () => {
    const msg = buildOptInMessage({ optInMessage: 'Custom message.' }, EXT_ID);
    expect(msg).toBe('Custom message.');
  });

  it('uses custom privacyStatementUrl in the default message', () => {
    const msg = buildOptInMessage({ privacyStatementUrl: 'https://example.com/privacy' }, EXT_ID);
    expect(msg).toContain('https://example.com/privacy');
  });

  it('uses custom optOutInstructionsUrl in the default message', () => {
    const msg = buildOptInMessage({ optOutInstructionsUrl: 'https://example.com/opt-out' }, EXT_ID);
    expect(msg).toContain('https://example.com/opt-out');
  });

  it('falls back to Red Hat defaults when no URLs are provided', () => {
    const msg = buildOptInMessage(undefined, EXT_ID);
    expect(msg).toContain('redhat.com');
    expect(msg).toContain(EXT_ID);
  });

  it('ignores optInMessage when empty string; falls back to default', () => {
    // empty string is falsy — treated as absent
    const msg = buildOptInMessage({ optInMessage: '' }, EXT_ID);
    expect(msg).toContain('Help Red Hat');
  });
});
