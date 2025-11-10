export interface SdkGenerationRequest {
    language: SupportedLanguage;
    packageName: string;
    version?: string;
    clientName?: string;
    namespace?: string;
}

export interface SdkGenerationResponse {
    id: string;
    language: SupportedLanguage;
    packageName: string;
    downloadUrl: string;
    expiresAt: Date;
    generatedAt: Date;
    status: SdkGenerationStatus;
}

export interface SdkDownloadResponse {
    fileName: string;
    contentType: string;
    buffer: Buffer;
}

export interface SdkGenerationJob {
    id: string;
    userId: string;
    language: SupportedLanguage;
    packageName: string;
    options: SdkGenerationOptions;
    status: SdkGenerationStatus;
    filePath?: string;
    errorMessage?: string;
    createdAt: Date;
    completedAt?: Date;
    expiresAt: Date;
}

export interface SdkGenerationOptions {
    version: string;
    clientName: string;
    namespace?: string;
    packageUrl?: string;
    additionalProperties?: Record<string, string>;
}

export enum SupportedLanguage {
    JAVASCRIPT = 'javascript',
    TYPESCRIPT = 'typescript-fetch',
    PYTHON = 'python',
    PHP = 'php',
    JAVA = 'java',
    CSHARP = 'csharp-netcore',
    GO = 'go'
}

export enum SdkGenerationStatus {
    PENDING = 'pending',
    GENERATING = 'generating',
    COMPLETED = 'completed',
    FAILED = 'failed',
    EXPIRED = 'expired'
}

export interface LanguageConfig {
    generator: string;
    packageManager: string;
    configFile: string;
    additionalProperties: Record<string, string>;
    templateFiles: Record<string, string>;
}