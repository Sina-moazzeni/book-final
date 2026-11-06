/**
 * Global Polyfills for Node.js environments (especially Node 18 & 20 LTS on Ubuntu VPS)
 * Required by modern libraries like pdfjs-dist v4/v5/v6.
 */

if (typeof (Promise as any).withResolvers === 'undefined') {
  const withResolvers = function <T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: any) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
  (Promise as any).withResolvers = withResolvers;
  if (typeof globalThis !== 'undefined' && (globalThis as any).Promise) {
    (globalThis as any).Promise.withResolvers = withResolvers;
  }
  if (typeof global !== 'undefined' && (global as any).Promise) {
    (global as any).Promise.withResolvers = withResolvers;
  }
}

