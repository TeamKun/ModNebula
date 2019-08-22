import { createHash } from 'crypto'
import { lstat, pathExists, readdir, readFile, Stats } from 'fs-extra'
import { resolve } from 'path'
import { Module } from '../../spec/module'
import { Type } from '../../spec/type'
import { BaseModelStructure } from '../basemodel.struct'

export abstract class ModuleStructure extends BaseModelStructure<Module> {

    constructor(
        absoluteRoot: string,
        relativeRoot: string,
        structRoot: string,
        baseUrl: string,
        protected type: Type
    ) {
        super(absoluteRoot, relativeRoot, structRoot, baseUrl)
    }

    public async getSpecModel(): Promise<Module[]> {
        if (this.resolvedModels == null) {
            this.resolvedModels = await this._doModuleRetrieval()
        }

        return this.resolvedModels
    }

    protected async abstract getModuleId(name: string, path: string, stats: Stats, buf: Buffer): Promise<string>
    protected async abstract getModuleName(name: string, path: string, stats: Stats, buf: Buffer): Promise<string>
    protected async abstract getModuleUrl(name: string, path: string, stats: Stats, buf: Buffer): Promise<string>
    protected async abstract getModulePath(name: string, path: string, stats: Stats, buf: Buffer): Promise<string>

    private async _doModuleRetrieval(): Promise<Module[]> {

        const accumulator: Module[] = []

        if (await pathExists(this.containerDirectory)) {
            const files = await readdir(this.containerDirectory)
            for (const file of files) {
                const filePath = resolve(this.containerDirectory, file)
                const stats = await lstat(filePath)
                const buf = await readFile(filePath)
                if (stats.isFile()) {
                    accumulator.push({
                        id: await this.getModuleId(file, filePath, stats, buf),
                        name: await this.getModuleName(file, filePath, stats, buf),
                        type: this.type,
                        required: {
                            value: false,
                            def: false
                        },
                        artifact: {
                            size: stats.size,
                            MD5: createHash('md5').update(buf).digest('hex'),
                            url: await this.getModuleUrl(file, filePath, stats, buf),
                            path: await this.getModulePath(file, filePath, stats, buf)
                        }
                    })
                }
            }
        }

        return accumulator

    }

}
