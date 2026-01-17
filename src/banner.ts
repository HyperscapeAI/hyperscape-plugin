/**
 * Hyperscape Plugin Settings Banner
 * Beautiful ANSI art display for configuration on startup
 */

import type { IAgentRuntime } from '@elizaos/core';

const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
};

export interface PluginSetting {
  name: string;
  value: unknown;
  defaultValue?: unknown;
  sensitive?: boolean;
  required?: boolean;
}

export interface BannerOptions {
  runtime: IAgentRuntime;
  settings: PluginSetting[];
}

function mask(v: string): string {
  if (!v || v.length <= 8) return '••••••••';
  return `${v.slice(0, 4)}${'•'.repeat(Math.min(12, v.length - 8))}${v.slice(-4)}`;
}

function fmtVal(value: unknown, sensitive: boolean, maxLen: number): string {
  let s: string;
  if (value === undefined || value === null || value === '') {
    s = '(not set)';
  } else if (sensitive) {
    s = mask(String(value));
  } else {
    s = String(value);
  }
  if (s.length > maxLen) s = `${s.slice(0, maxLen - 3)}...`;
  return s;
}

const ANSI_PATTERN = /\x1b\[[0-9;]*m/g;

function pad(s: string, n: number): string {
  const len = s.replace(ANSI_PATTERN, '').length;
  if (len >= n) return s;
  return s + ' '.repeat(n - len);
}

function line(content: string, width = 70): string {
  const len = content.replace(ANSI_PATTERN, '').length;
  if (len <= width) {
    return content + ' '.repeat(width - len);
  }
  // Truncate
  let visibleCount = 0;
  let result = '';
  let i = 0;
  while (i < content.length && visibleCount < width) {
    const remaining = content.slice(i);
    const match = remaining.match(/^\x1b\[[0-9;]*m/);
    if (match) {
      result += match[0];
      i += match[0].length;
    } else {
      result += content[i];
      visibleCount++;
      i++;
    }
  }
  return result + ANSI.reset;
}

/**
 * Print the Hyperscape plugin banner on startup
 */
export function printBanner(options: BannerOptions): void {
  const { settings, runtime } = options;
  const R = ANSI.reset;
  const D = ANSI.dim;
  const B = ANSI.bold;
  const c1 = ANSI.brightMagenta;
  const c2 = ANSI.brightCyan;
  const c3 = ANSI.brightYellow;

  const W = 70;
  const top = `${c1}╔${'═'.repeat(W)}╗${R}`;
  const mid = `${c1}╠${'═'.repeat(W)}╣${R}`;
  const bot = `${c1}╚${'═'.repeat(W)}╝${R}`;
  const row = (s: string) => `${c1}║${R}${line(s, W)}${c1}║${R}`;

  const lines: string[] = [''];
  lines.push(top);
  lines.push(row(` ${B}Character: ${runtime.character.name}${R}`));
  lines.push(mid);
  
  // Hyperscape ASCII art
  lines.push(row(`${c2}     ██╗  ██╗██╗   ██╗██████╗ ███████╗██████╗${R}`));
  lines.push(row(`${c2}     ██║  ██║╚██╗ ██╔╝██╔══██╗██╔════╝██╔══██╗${R}`));
  lines.push(row(`${c2}     ███████║ ╚████╔╝ ██████╔╝█████╗  ██████╔╝${R}`));
  lines.push(row(`${c2}     ██╔══██║  ╚██╔╝  ██╔═══╝ ██╔══╝  ██╔══██╗${R}`));
  lines.push(row(`${c2}     ██║  ██║   ██║   ██║     ███████╗██║  ██║${R}`));
  lines.push(row(`${c2}     ╚═╝  ╚═╝   ╚═╝   ╚═╝     ╚══════╝╚═╝  ╚═╝${R}`));
  lines.push(row(`${c3}              ███████╗ ██████╗ █████╗ ██████╗ ███████╗${R}`));
  lines.push(row(`${c3}              ██╔════╝██╔════╝██╔══██╗██╔══██╗██╔════╝${R}`));
  lines.push(row(`${c3}              ███████╗██║     ███████║██████╔╝█████╗${R}`));
  lines.push(row(`${c3}              ╚════██║██║     ██╔══██║██╔═══╝ ██╔══╝${R}`));
  lines.push(row(`${c3}              ███████║╚██████╗██║  ██║██║     ███████╗${R}`));
  lines.push(row(`${c3}              ╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝     ╚══════╝${R}`));
  lines.push(row(`${D}           3D Multiplayer RPG  •  WebSocket  •  Real-time${R}`));
  lines.push(mid);

  // Settings table
  const NW = 30;
  const VW = 22;
  const SW = 8;
  lines.push(row(` ${B}${pad('ENV VARIABLE', NW)} ${pad('VALUE', VW)} ${pad('STATUS', SW)}${R}`));
  lines.push(row(` ${D}${'-'.repeat(NW)} ${'-'.repeat(VW)} ${'-'.repeat(SW)}${R}`));

  for (const s of settings) {
    const set = s.value !== undefined && s.value !== null && s.value !== '';
    const isDefault = set && s.defaultValue !== undefined && String(s.value) === String(s.defaultValue);

    let ico: string;
    let st: string;
    if (!set && s.required) {
      ico = `${ANSI.brightRed}◆${R}`;
      st = `${ANSI.brightRed}REQUIRED${R}`;
    } else if (!set) {
      ico = `${D}○${R}`;
      st = `${D}unset${R}`;
    } else if (isDefault) {
      ico = `${ANSI.brightBlue}●${R}`;
      st = `${ANSI.brightBlue}default${R}`;
    } else {
      ico = `${ANSI.brightGreen}✓${R}`;
      st = `${ANSI.brightGreen}custom${R}`;
    }

    const name = pad(s.name, NW - 2);
    const val = pad(fmtVal(s.value ?? s.defaultValue, s.sensitive ?? false, VW), VW);
    const status = pad(st, SW);
    lines.push(row(` ${ico} ${c2}${name}${R} ${val} ${status}`));
  }

  lines.push(mid);
  lines.push(
    row(
      ` ${D}${ANSI.brightGreen}✓${D} custom  ${ANSI.brightBlue}●${D} default  ○ unset  ${ANSI.brightRed}◆${D} required${R}`
    )
  );
  lines.push(bot);
  lines.push('');

  runtime.logger.info(lines.join('\n'));
}

/**
 * Print the Hyperscape banner with current settings
 */
export function printHyperscapeBanner(runtime: IAgentRuntime): void {
  const serverUrl = runtime.getSetting('HYPERSCAPE_SERVER_URL');
  const autoReconnect = runtime.getSetting('HYPERSCAPE_AUTO_RECONNECT');

  printBanner({
    runtime,
    settings: [
      {
        name: 'HYPERSCAPE_SERVER_URL',
        value: serverUrl,
        defaultValue: 'ws://localhost:5555/ws',
        required: true,
      },
      {
        name: 'HYPERSCAPE_AUTO_RECONNECT',
        value: autoReconnect,
        defaultValue: 'true',
      },
    ],
  });
}
