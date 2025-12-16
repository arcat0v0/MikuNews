import { Buffer } from "buffer";

if (!("Buffer" in globalThis)) {
	Object.defineProperty(globalThis, "Buffer", {
		value: Buffer,
		writable: true,
		configurable: true,
	});
}

