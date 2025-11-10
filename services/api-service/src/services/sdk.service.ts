import * as path from 'path';
import * as fs from 'fs-extra';
import archiver from 'archiver';
import { exec } from 'child_process';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import { 
    SdkGenerationRequest, 
    SdkGenerationResponse, 
    SdkDownloadResponse, 
    SdkGenerationJob,
    SdkGenerationOptions,
    SupportedLanguage, 
    SdkGenerationStatus,
    LanguageConfig
} from '../interfaces/sdk.interface';
import { ISdkRepository } from '../repositories/sdk.repository';
import { apiServiceSwaggerDoc } from '../config/swagger.config';

const execAsync = promisify(exec);

export interface ISdkService {
    generateSdk(userId: string, request: SdkGenerationRequest): Promise<SdkGenerationResponse>;
    downloadSdk(jobId: string, userId: string): Promise<SdkDownloadResponse>;
    getGenerationStatus(jobId: string, userId: string): Promise<SdkGenerationJob | null>;
    getUserSdkJobs(userId: string): Promise<SdkGenerationJob[]>;
    cleanupExpiredJobs(): Promise<number>;
}

export class SdkService implements ISdkService {
    private readonly outputDir: string;
    private readonly tempDir: string;
    private readonly downloadDir: string;
    private readonly languageConfigs: Map<SupportedLanguage, LanguageConfig>;

    constructor(private sdkRepository: ISdkRepository) {
        this.outputDir = path.join(process.cwd(), 'sdk-generation', 'output');
        this.tempDir = path.join(process.cwd(), 'sdk-generation', 'temp');
        this.downloadDir = path.join(process.cwd(), 'sdk-generation', 'downloads');
        
        this.languageConfigs = this.initializeLanguageConfigs();
        this.ensureDirectories();
    }

    public async generateSdk(userId: string, request: SdkGenerationRequest): Promise<SdkGenerationResponse> {
        const jobId = uuidv4();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24); // 24-hour expiration

        const options: SdkGenerationOptions = {
            version: request.version || '1.0.0',
            clientName: request.clientName || this.getDefaultClientName(request.language),
            namespace: request.namespace,
            additionalProperties: this.getLanguageConfig(request.language).additionalProperties
        };

        const job = await this.sdkRepository.createJob({
            userId,
            language: request.language,
            packageName: request.packageName,
            options,
            status: SdkGenerationStatus.PENDING,
            expiresAt
        });

        // Start generation process in background
        this.processGeneration(job).catch(error => {
            console.error(`[SdkService] Generation failed for job ${job.id}:`, error);
            this.sdkRepository.updateJobStatus(
                job.id, 
                SdkGenerationStatus.FAILED, 
                undefined, 
                error.message
            );
        });

        return {
            id: job.id,
            language: request.language,
            packageName: request.packageName,
            downloadUrl: `/api/v1/sdks/${job.id}/download`,
            expiresAt: job.expiresAt,
            generatedAt: job.createdAt,
            status: job.status
        };
    }

    public async downloadSdk(jobId: string, userId: string): Promise<SdkDownloadResponse> {
        const job = await this.sdkRepository.getJobById(jobId);
        
        if (!job || job.userId !== userId) {
            throw new Error('SDK generation job not found');
        }

        if (job.status !== SdkGenerationStatus.COMPLETED) {
            throw new Error(`SDK generation not completed. Current status: ${job.status}`);
        }

        if (!job.filePath || !await fs.pathExists(job.filePath)) {
            throw new Error('SDK file not found');
        }

        if (new Date() > job.expiresAt) {
            await this.sdkRepository.updateJobStatus(jobId, SdkGenerationStatus.EXPIRED);
            throw new Error('SDK download has expired');
        }

        const buffer = await fs.readFile(job.filePath);
        const fileName = `${job.packageName}-${job.language}-sdk.zip`;

        return {
            fileName,
            contentType: 'application/zip',
            buffer
        };
    }

    public async getGenerationStatus(jobId: string, userId: string): Promise<SdkGenerationJob | null> {
        const job = await this.sdkRepository.getJobById(jobId);
        
        if (!job || job.userId !== userId) {
            return null;
        }

        return job;
    }

    public async getUserSdkJobs(userId: string): Promise<SdkGenerationJob[]> {
        return this.sdkRepository.getJobsByUserId(userId);
    }

    public async cleanupExpiredJobs(): Promise<number> {
        const deletedCount = await this.sdkRepository.deleteExpiredJobs();
        
        // Clean up associated files
        try {
            const downloadFiles = await fs.readdir(this.downloadDir);
            const expiredFiles = downloadFiles.filter(file => {
                const filePath = path.join(this.downloadDir, file);
                const stats = fs.statSync(filePath);
                const ageHours = (Date.now() - stats.ctime.getTime()) / (1000 * 60 * 60);
                return ageHours > 24; // Remove files older than 24 hours
            });

            for (const file of expiredFiles) {
                await fs.remove(path.join(this.downloadDir, file));
            }
        } catch (error) {
            console.error('[SdkService] Cleanup error:', error);
        }

        return deletedCount;
    }

    private async processGeneration(job: SdkGenerationJob): Promise<void> {
        await this.sdkRepository.updateJobStatus(job.id, SdkGenerationStatus.GENERATING);

        try {
            const tempJobDir = path.join(this.tempDir, job.id);
            await fs.ensureDir(tempJobDir);

            // Write OpenAPI spec to temp file
            const specPath = path.join(tempJobDir, 'api-spec.json');
            await fs.writeJson(specPath, apiServiceSwaggerDoc, { spaces: 2 });

            // Generate SDK using OpenAPI Generator
            const outputPath = path.join(tempJobDir, 'generated');
            await this.generateWithOpenApiTools(job, specPath, outputPath);

            // Create configuration files
            await this.addConfigurationFiles(job, outputPath);

            // Package the SDK
            const zipPath = await this.packageSdk(job, outputPath);

            await this.sdkRepository.updateJobStatus(
                job.id, 
                SdkGenerationStatus.COMPLETED, 
                zipPath
            );

        } catch (error) {
            await this.sdkRepository.updateJobStatus(
                job.id, 
                SdkGenerationStatus.FAILED, 
                undefined, 
                error instanceof Error ? error.message : 'Unknown error'
            );
            throw error;
        }
    }

    private async generateWithOpenApiTools(
        job: SdkGenerationJob, 
        specPath: string, 
        outputPath: string
    ): Promise<void> {
        const config = this.getLanguageConfig(job.language);
        
        const additionalProperties = [
            `packageName=${job.packageName}`,
            `packageVersion=${job.options.version}`,
            `clientPackage=${job.packageName}`,
            ...Object.entries(config.additionalProperties).map(([key, value]) => `${key}=${value}`)
        ];

        if (job.options.namespace) {
            additionalProperties.push(`packageCompany=${job.options.namespace}`);
        }

        const command = [
            'npx @openapitools/openapi-generator-cli generate',
            `-i ${specPath}`,
            `-g ${config.generator}`,
            `-o ${outputPath}`,
            `--additional-properties ${additionalProperties.join(',')}`
        ].join(' ');

        console.log(`[SdkService] Generating SDK with command: ${command}`);
        
        const { stdout, stderr } = await execAsync(command);
        
        if (stderr && stderr.includes('ERROR')) {
            throw new Error(`OpenAPI Generator error: ${stderr}`);
        }

        console.log(`[SdkService] SDK generated successfully for job ${job.id}`);
    }

    private async addConfigurationFiles(job: SdkGenerationJob, outputPath: string): Promise<void> {
        const config = this.getLanguageConfig(job.language);
        const templates = config.templateFiles;

        for (const [fileName, template] of Object.entries(templates)) {
            const filePath = path.join(outputPath, fileName);
            const content = this.processTemplate(template, job);
            await fs.writeFile(filePath, content);
        }
    }

    private async packageSdk(job: SdkGenerationJob, outputPath: string): Promise<string> {
        const zipFileName = `${job.packageName}-${job.language}-sdk-${job.id}.zip`;
        const zipPath = path.join(this.downloadDir, zipFileName);

        await fs.ensureDir(this.downloadDir);

        return new Promise<string>((resolve, reject) => {
            const output = fs.createWriteStream(zipPath);
            const archive = archiver('zip', { zlib: { level: 9 } });

            output.on('close', () => resolve(zipPath));
            archive.on('error', reject);

            archive.pipe(output);
            archive.directory(outputPath, false);
            archive.finalize();
        });
    }

    private processTemplate(template: string, job: SdkGenerationJob): string {
        return template
            .replace(/\{\{packageName\}\}/g, job.packageName)
            .replace(/\{\{version\}\}/g, job.options.version)
            .replace(/\{\{clientName\}\}/g, job.options.clientName)
            .replace(/\{\{namespace\}\}/g, job.options.namespace || job.packageName)
            .replace(/\{\{language\}\}/g, job.language);
    }

    private getDefaultClientName(language: SupportedLanguage): string {
        const names: Record<SupportedLanguage, string> = {
            [SupportedLanguage.JAVASCRIPT]: 'QRSaaSClient',
            [SupportedLanguage.TYPESCRIPT]: 'QRSaaSClient',
            [SupportedLanguage.PYTHON]: 'QRSaaSClient',
            [SupportedLanguage.PHP]: 'QRSaaSClient',
            [SupportedLanguage.JAVA]: 'QRSaaSClient',
            [SupportedLanguage.CSHARP]: 'QRSaaSClient',
            [SupportedLanguage.GO]: 'qrsaasclient'
        };
        return names[language];
    }

    private getLanguageConfig(language: SupportedLanguage): LanguageConfig {
        const config = this.languageConfigs.get(language);
        if (!config) {
            throw new Error(`Unsupported language: ${language}`);
        }
        return config;
    }

    private initializeLanguageConfigs(): Map<SupportedLanguage, LanguageConfig> {
        return new Map([
            [SupportedLanguage.JAVASCRIPT, {
                generator: 'javascript',
                packageManager: 'npm',
                configFile: 'package.json',
                additionalProperties: {
                    usePromises: 'true',
                    moduleName: 'QRSaaSAPI'
                },
                templateFiles: {
                    'package.json': JSON.stringify({
                        name: '{{packageName}}',
                        version: '{{version}}',
                        description: 'QR SaaS API Client for JavaScript',
                        main: 'src/index.js',
                        scripts: {
                            test: 'echo "Error: no test specified" && exit 1'
                        },
                        dependencies: {
                            'superagent': '^8.0.0'
                        },
                        keywords: ['qr', 'saas', 'api', 'client'],
                        author: 'QR SaaS',
                        license: 'MIT'
                    }, null, 2),
                    'README.md': this.getReadmeTemplate('JavaScript')
                }
            }],
            [SupportedLanguage.TYPESCRIPT, {
                generator: 'typescript-fetch',
                packageManager: 'npm',
                configFile: 'package.json',
                additionalProperties: {
                    npmName: '{{packageName}}',
                    supportsES6: 'true'
                },
                templateFiles: {
                    'package.json': JSON.stringify({
                        name: '{{packageName}}',
                        version: '{{version}}',
                        description: 'QR SaaS API Client for TypeScript',
                        main: 'dist/index.js',
                        types: 'dist/index.d.ts',
                        scripts: {
                            build: 'tsc',
                            test: 'echo "Error: no test specified" && exit 1'
                        },
                        devDependencies: {
                            typescript: '^5.0.0',
                            '@types/node': '^20.0.0'
                        },
                        keywords: ['qr', 'saas', 'api', 'client', 'typescript'],
                        author: 'QR SaaS',
                        license: 'MIT'
                    }, null, 2),
                    'README.md': this.getReadmeTemplate('TypeScript')
                }
            }],
            [SupportedLanguage.PYTHON, {
                generator: 'python',
                packageManager: 'pip',
                configFile: 'setup.py',
                additionalProperties: {
                    packageName: '{{packageName}}',
                    projectName: '{{packageName}}',
                    packageVersion: '{{version}}'
                },
                templateFiles: {
                    'setup.py': `from setuptools import setup, find_packages

setup(
    name="{{packageName}}",
    version="{{version}}",
    description="QR SaaS API Client for Python",
    long_description="Python client library for QR SaaS API",
    author="QR SaaS",
    author_email="support@qrsaas.com",
    url="https://github.com/qrsaas/{{packageName}}-python",
    packages=find_packages(),
    install_requires=[
        "urllib3 >= 1.25.3",
        "python-dateutil",
        "certifi"
    ],
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
    python_requires='>=3.6',
)`,
                    'README.md': this.getReadmeTemplate('Python')
                }
            }],
            [SupportedLanguage.PHP, {
                generator: 'php',
                packageManager: 'composer',
                configFile: 'composer.json',
                additionalProperties: {
                    packagePath: '{{packageName}}',
                    composerVendorName: '{{namespace}}',
                    composerProjectName: '{{packageName}}'
                },
                templateFiles: {
                    'composer.json': JSON.stringify({
                        name: '{{namespace}}/{{packageName}}',
                        version: '{{version}}',
                        description: 'QR SaaS API Client for PHP',
                        keywords: ['qr', 'saas', 'api', 'client'],
                        type: 'library',
                        license: 'MIT',
                        require: {
                            php: '>=7.4',
                            'ext-curl': '*',
                            'ext-json': '*',
                            'ext-mbstring': '*',
                            'guzzlehttp/guzzle': '^7.3'
                        },
                        autoload: {
                            'psr-4': {
                                '{{namespace}}\\{{clientName}}\\': 'lib/'
                            }
                        }
                    }, null, 2),
                    'README.md': this.getReadmeTemplate('PHP')
                }
            }],
            [SupportedLanguage.JAVA, {
                generator: 'java',
                packageManager: 'maven',
                configFile: 'pom.xml',
                additionalProperties: {
                    groupId: 'com.qrsaas',
                    artifactId: '{{packageName}}',
                    apiPackage: 'com.qrsaas.api',
                    modelPackage: 'com.qrsaas.model',
                    clientPackage: 'com.qrsaas.client'
                },
                templateFiles: {
                    'pom.xml': `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 
         http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <groupId>com.qrsaas</groupId>
    <artifactId>{{packageName}}</artifactId>
    <version>{{version}}</version>
    <packaging>jar</packaging>
    <name>{{packageName}}</name>
    <description>QR SaaS API Client for Java</description>
    
    <properties>
        <maven.compiler.source>11</maven.compiler.source>
        <maven.compiler.target>11</maven.compiler.target>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    </properties>
    
    <dependencies>
        <dependency>
            <groupId>com.squareup.okhttp3</groupId>
            <artifactId>okhttp</artifactId>
            <version>4.9.3</version>
        </dependency>
        <dependency>
            <groupId>com.google.code.gson</groupId>
            <artifactId>gson</artifactId>
            <version>2.8.9</version>
        </dependency>
    </dependencies>
</project>`,
                    'README.md': this.getReadmeTemplate('Java')
                }
            }],
            [SupportedLanguage.CSHARP, {
                generator: 'csharp-netcore',
                packageManager: 'nuget',
                configFile: 'QRSaaS.csproj',
                additionalProperties: {
                    packageName: '{{packageName}}',
                    clientPackage: 'QRSaaS.Client',
                    packageVersion: '{{version}}'
                },
                templateFiles: {
                    'QRSaaS.csproj': `<Project Sdk="Microsoft.NET.Sdk">
    <PropertyGroup>
        <TargetFramework>netstandard2.1</TargetFramework>
        <PackageId>{{packageName}}</PackageId>
        <PackageVersion>{{version}}</PackageVersion>
        <Description>QR SaaS API Client for .NET</Description>
        <Authors>QR SaaS</Authors>
        <Company>QR SaaS</Company>
        <PackageLicenseExpression>MIT</PackageLicenseExpression>
    </PropertyGroup>
    
    <ItemGroup>
        <PackageReference Include="Newtonsoft.Json" Version="13.0.1" />
        <PackageReference Include="System.Net.Http" Version="4.3.4" />
    </ItemGroup>
</Project>`,
                    'README.md': this.getReadmeTemplate('C#')
                }
            }],
            [SupportedLanguage.GO, {
                generator: 'go',
                packageManager: 'go modules',
                configFile: 'go.mod',
                additionalProperties: {
                    packageName: '{{packageName}}',
                    isGoSubmodule: 'true'
                },
                templateFiles: {
                    'go.mod': `module github.com/qrsaas/{{packageName}}-go

go 1.19

require (
    github.com/stretchr/testify v1.7.1
)`,
                    'README.md': this.getReadmeTemplate('Go')
                }
            }]
        ] as Array<[SupportedLanguage, LanguageConfig]>);
    }

    private getReadmeTemplate(language: string): string {
        return `# QR SaaS API Client - ${language}

Official ${language} client library for the QR SaaS API.

## Installation

${this.getInstallationInstructions(language)}

## Usage

\`\`\`${language.toLowerCase()}
${this.getUsageExample(language)}
\`\`\`

## API Documentation

For detailed API documentation, visit: https://your-api-docs.com

## Support

- Email: support@qrsaas.com
- Documentation: https://docs.qrsaas.com

## License

MIT License`;
    }

    private getInstallationInstructions(language: string): string {
        const instructions: Record<string, string> = {
            'JavaScript': 'npm install {{packageName}}',
            'TypeScript': 'npm install {{packageName}}',
            'Python': 'pip install {{packageName}}',
            'PHP': 'composer require {{namespace}}/{{packageName}}',
            'Java': 'Add dependency to your pom.xml or build.gradle',
            'C#': 'dotnet add package {{packageName}}',
            'Go': 'go get github.com/qrsaas/{{packageName}}-go'
        };
        return instructions[language] || '';
    }

    private getUsageExample(language: string): string {
        const examples: Record<string, string> = {
            'JavaScript': `const QRSaaSAPI = require('{{packageName}}');
const client = new QRSaaSAPI.ApiClient();
client.defaultHeaders['Authorization'] = 'Bearer YOUR_API_KEY';`,
            'TypeScript': `import { Configuration, DefaultApi } from '{{packageName}}';
const config = new Configuration({
    headers: { 'Authorization': 'Bearer YOUR_API_KEY' }
});
const api = new DefaultApi(config);`,
            'Python': `import {{packageName}}
from {{packageName}}.rest import ApiException

configuration = {{packageName}}.Configuration()
configuration.api_key['Authorization'] = 'Bearer YOUR_API_KEY'`,
            'PHP': `<?php
require_once(__DIR__ . '/vendor/autoload.php');
use {{namespace}}\\{{clientName}}\\Configuration;
use {{namespace}}\\{{clientName}}\\ApiClient;`,
            'Java': `import com.qrsaas.ApiClient;
import com.qrsaas.api.DefaultApi;
ApiClient client = new ApiClient();
client.setApiKey("YOUR_API_KEY");`,
            'C#': `using QRSaaS.Client;
var config = new Configuration();
config.ApiKey.Add("Authorization", "Bearer YOUR_API_KEY");`,
            'Go': `package main
import "github.com/qrsaas/{{packageName}}-go"
client := qrsaas.NewAPIClient(qrsaas.NewConfiguration())`
        };
        return examples[language] || '';
    }

    private async ensureDirectories(): Promise<void> {
        await fs.ensureDir(this.outputDir);
        await fs.ensureDir(this.tempDir);
        await fs.ensureDir(this.downloadDir);
    }
}