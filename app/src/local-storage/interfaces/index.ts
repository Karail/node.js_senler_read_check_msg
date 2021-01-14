// Resolvers
import { BaseQueueResolver } from "../../shared/resolvers";
// Cron
import { BaseCron } from "../../shared/cron";

export interface QueueInterface { resolver: BaseQueueResolver; crons?: BaseCron[] }