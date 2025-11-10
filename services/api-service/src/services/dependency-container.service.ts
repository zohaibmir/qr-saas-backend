export class DependencyContainerService {
    private static instance: DependencyContainerService;
    private dependencies = new Map<string, any>();

    private constructor() {}

    public static getInstance(): DependencyContainerService {
        if (!DependencyContainerService.instance) {
            DependencyContainerService.instance = new DependencyContainerService();
        }
        return DependencyContainerService.instance;
    }

    public register<T>(token: string, dependency: T): void {
        console.log(`[DependencyContainer] Registering: ${token}`);
        this.dependencies.set(token, dependency);
    }

    public resolve<T>(token: string): T {
        const dependency = this.dependencies.get(token);
        if (!dependency) {
            throw new Error(`Dependency not found: ${token}`);
        }
        console.log(`[DependencyContainer] Resolving: ${token}`);
        return dependency as T;
    }

    public clear(): void {
        this.dependencies.clear();
    }

    public getRegisteredDependencies(): string[] {
        return Array.from(this.dependencies.keys());
    }
}