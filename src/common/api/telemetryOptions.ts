/**
 * Optional configuration for `getRedHatService()` to use an independent telemetry pipeline.
 *
 * When `telemetryNamespace` is set, `<namespace>.telemetry.enabled` is used as the enablement
 * gate instead of `redhat.telemetry.enabled`. The two pipelines are completely independent.
 *
 * **Important:** the calling extension must declare `<namespace>.telemetry.enabled` as a boolean
 * in `package.json` `contributes.configuration`; omitting it causes VS Code to silently return
 * `undefined`, which defaults to `false` and permanently disables telemetry.
 */
export interface TelemetryOptions {
  /**
   * Namespace prefix for the custom VS Code setting. The library reads/writes
   * `<telemetryNamespace>.telemetry.enabled`. Must be declared in `contributes.configuration`.
   */
  telemetryNamespace?: string;

  /** Custom opt-in dialog message. Falls back to the default Red Hat message when absent. */
  optInMessage?: string;

  /** Overrides the privacy statement URL in the opt-in dialog. */
  privacyStatementUrl?: string;

  /** Overrides the opt-out instructions URL in the opt-in dialog. */
  optOutInstructionsUrl?: string;
}
