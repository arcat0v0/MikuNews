declare module 'node:fs/promises' {
  export function mkdir(path: string, opts?: unknown): Promise<void>
  export function writeFile(
    path: string,
    data: string,
    opts?: unknown,
  ): Promise<void>
}

declare module 'node:path' {
  export function resolve(...pathSegments: string[]): string
}
