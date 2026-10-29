// Session-only read cache. Never persist another student's private data to disk.
export class StudentDataCache {
  private scope = '';
  private values = new Map<string, unknown>();
  private requests = new Map<string, Promise<unknown>>();
  session(scope: string) {
    if (this.scope !== scope) { this.scope = scope; this.clear(); }
  }
  clear() { this.values.clear(); this.requests.clear(); }
  invalidate(key: string) { this.values.delete(key); this.requests.delete(key); }
  peek<T>(key: string): T | undefined { return this.values.get(key) as T | undefined; }
  get<T>(key: string, load: () => Promise<T>): Promise<T> {
    if (this.values.has(key)) return Promise.resolve(this.peek<T>(key)!);
    const pending = this.requests.get(key);
    if (pending) return pending as Promise<T>;
    const request = Promise.resolve().then(load).then(value => {
      if (this.requests.get(key) === request) this.values.set(key, value);
      return value;
    }).finally(() => { if (this.requests.get(key) === request) this.requests.delete(key); });
    this.requests.set(key, request);
    return request;
  }
}
export const studentDataCache = new StudentDataCache();
export const cachedStudentResource = (path: string) => [
  '/api/student/dashboard', '/api/student/drives', '/api/student/reports', '/api/student/readiness',
].includes(path);
