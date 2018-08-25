import { BotpressEvent, HttpAPI, MiddlewareDefinition } from 'botpress-module-sdk'
import { inject, injectable, tagged } from 'inversify'

import { container } from './app.inversify'
import Database from './database'
import { Logger } from './misc/interfaces'
import { TYPES } from './misc/types'
import { ModuleLoader } from './module-loader'
import { BotRepository } from './repositories/bot-repository'
import { BotRouter } from './router/bot-router'
import ActionService from './services/action/action-service'
import { CMSService } from './services/cms/cms-service'
import { DialogEngine } from './services/dialog/engine'
import FlowService from './services/dialog/flow-service'
import { EventEngine } from './services/middleware/event-engine'
import { MiddlewareService } from './services/middleware/middleware-service'

// TODO: The UI doesn't support multi-bots yet
const BOT_ID = 'bot123'

const http = (botRouter: BotRouter): HttpAPI => {
  return {
    createShortLink: () => {}
  }
}

const event = (eventEngine: EventEngine): EventAPI => {
  return {
    register(middleware: MiddlewareDefinition) {
      eventEngine.register(middleware)
    },
    sendIncoming(event: BotpressEvent) {
      eventEngine.sendIncoming(BOT_ID, event)
    },
    sendOutgoing(event: BotpressEvent) {
      eventEngine.sendOutgoing(BOT_ID, event)
    }
  }
}

export class DialogAPI {
  constructor(private dialogEngine: DialogEngine) {}

  processMessage(sessionID: string, event: BotpressEvent) {
    return this.dialogEngine.forBot(BOT_ID).processMessage(sessionID, event)
  }
}

export class ConfigAPI {
  constructor(private moduleLoader: ModuleLoader) {}

  getModuleConfig(moduleId: string): Promise<any> {
    return this.moduleLoader.configReader.getGlobal(moduleId)
  }

  getModuleConfigForBot(moduleId: string, botId: string): Promise<any> {
    return this.moduleLoader.configReader.getForBot(moduleId, botId)
  }
}

export class ConsoleAPI {
  constructor(private logger: Logger) {}

  debug(msg) {
    this.logger.debug(msg)
  }

  info(msg) {
    this.logger.info(msg)
  }
}

/**
 * Socket.IO API to emit events and listen
 */
export class RealTimeAPI {
  emit() {}
}

@injectable()
export class BotpressAPI {
  console: ConsoleAPI
  http: HttpAPI
  events: EventAPI
  dialog: DialogAPI
  config: ConfigAPI
  realtime: RealTimeAPI
  database: Database

  constructor(
    @inject(TYPES.BotRepository) botRepository: BotRepository,
    @inject(TYPES.CMSService) cmsService: CMSService,
    @inject(TYPES.DialogEngine) dialogEngine: DialogEngine,
    @inject(TYPES.Database) db: Database,
    @inject(TYPES.FlowService) flowService: FlowService,
    @inject(TYPES.EventEngine) eventEngine: EventEngine,
    @inject(TYPES.MiddlewareService) middlewareService: MiddlewareService,
    @inject(TYPES.ModuleLoader) moduleLoader: ModuleLoader,
    @inject(TYPES.ActionService) actionService: ActionService,
    @inject(TYPES.Logger) logger: Logger
  ) {
    const botRouter = new BotRouter({ botRepository, middlewareService, cmsService, flowService, actionService })

    this.http = http(botRouter)
    this.events = event(eventEngine)
    this.dialog = new DialogAPI(dialogEngine)
    this.config = new ConfigAPI(moduleLoader)
    this.realtime = new RealTimeAPI()
    this.console = new ConsoleAPI(logger)
    this.database = db
  }
}

export default () => {
  return container.get<BotpressAPI>(TYPES.BotpressAPI)
}
