import { RuleVoiceInterpreter } from './RuleVoiceInterpreter'
import type { VoiceInterpreter } from './types'

/**
 * v1: solo reglas. Cuando haya IA, este factory puede devolver
 * un intérprete que use reglas y, si el resultado es `needs_ai`, llame al modelo.
 */
export function createVoiceInterpreter(): VoiceInterpreter {
  return new RuleVoiceInterpreter()
}
