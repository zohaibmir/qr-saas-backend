import { IDependencyContainer } from '../interfaces';

export class DependencyContainer implements IDependencyContainer {
  private dependencies = new Map<string, any>();

  register<T>(token: string, instance: T): void {
    this.dependencies.set(token, instance);
  }

  resolve<T>(token: string): T {
    const instance = this.dependencies.get(token);
    if (!instance) {
      throw new Error(`Dependency '${token}' not found. Available: ${Array.from(this.dependencies.keys()).join(', ')}`);
    }
    return instance;
  }

  getRegisteredTokens(): string[] {
    return Array.from(this.dependencies.keys());
  }
}