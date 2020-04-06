import {issue, issueCommand} from './command'

import * as os from 'os'
import * as path from 'path'

/**
 * Interface for getInput options
 */
export interface InputOptions {
  /** Optional. Whether the input is required. If required and not present, will throw. Defaults to false */
  required?: boolean
}

/**
 * The code to exit an action
 */
export enum ExitCode {
  /**
   * A code indicating that the action was successful
   */
  Success = 0,

  /**
   * A code indicating that the action was a failure
   */
  Failure = 1
}

//-----------------------------------------------------------------------
// Variables
//-----------------------------------------------------------------------

/**
 * Sets env variable for this action and future actions in the job
 * @param name the name of the variable to set
 * @param val the value of the variable
 */
export function exportVariable(
  name: string,
  val: string | boolean | number
): void {
  const convertedVal = sanitizeInput(val)
  process.env[name] = convertedVal
  issueCommand('set-env', {name}, convertedVal)
}

/**
 * Registers a secret which will get masked from logs
 * @param secret value of the secret
 */
export function setSecret(secret: string): void {
  issueCommand('add-mask', {}, secret)
}

/**
 * Prepends inputPath to the PATH (for this action and future actions)
 * @param inputPath
 */
export function addPath(inputPath: string): void {
  issueCommand('add-path', {}, inputPath)
  process.env['PATH'] = `${inputPath}${path.delimiter}${process.env['PATH']}`
}

/**
 * Gets the value of an input.  The value is also trimmed.
 *
 * @param     name     name of the input to get
 * @param     options  optional. See InputOptions.
 * @returns   string
 */
export function getInput(name: string, options?: InputOptions): string {
  const val: string =
    process.env[`INPUT_${name.replace(/ /g, '_').toUpperCase()}`] || ''
  if (options && options.required && !val) {
    throw new Error(`Input required and not supplied: ${name}`)
  }

  return val.trim()
}

/**
 * Sets the value of an output.
 *
 * @param     name     name of the output to set
 * @param     value    value to store
 */
export function setOutput(
  name: string,
  value: string | boolean | number
): void {
  issueCommand('set-output', {name}, sanitizeInput(value))
}

//-----------------------------------------------------------------------
// Results
//-----------------------------------------------------------------------

/**
 * Sets the action status to failed.
 * When the action exits it will be with an exit code of 1
 * @param message add error issue message
 */
export function setFailed(message: string | Error): void {
  process.exitCode = ExitCode.Failure
  error(sanitizeInput(message))
}

//-----------------------------------------------------------------------
// Logging Commands
//-----------------------------------------------------------------------

/**
 * Gets whether Actions Step Debug is on or not
 */
export function isDebug(): boolean {
  return process.env['RUNNER_DEBUG'] === '1'
}

/**
 * Writes debug message to user log
 * @param message debug message
 */
export function debug(message: string): void {
  issueCommand('debug', {}, message)
}

/**
 * Adds an error issue
 * @param message error issue message
 */
export function error(message: string | Error): void {
  issue('error', sanitizeInput(message))
}

/**
 * Adds an warning issue
 * @param message warning issue message
 */
export function warning(message: string): void {
  issue('warning', message)
}

/**
 * Writes info to log with console.log.
 * @param message info message
 */
export function info(message: string): void {
  process.stdout.write(message + os.EOL)
}

/**
 * Begin an output group.
 *
 * Output until the next `groupEnd` will be foldable in this group
 *
 * @param name The name of the output group
 */
export function startGroup(name: string): void {
  issue('group', name)
}

/**
 * End an output group.
 */
export function endGroup(): void {
  issue('endgroup')
}

/**
 * Wrap an asynchronous function call in a group.
 *
 * Returns the same type as the function itself.
 *
 * @param name The name of the group
 * @param fn The function to wrap in the group
 */
export async function group<T>(name: string, fn: () => Promise<T>): Promise<T> {
  startGroup(name)

  let result: T

  try {
    result = await fn()
  } finally {
    endGroup()
  }

  return result
}

//-----------------------------------------------------------------------
// Wrapper action state
//-----------------------------------------------------------------------

/**
 * Saves state for current action, the state can only be retrieved by this action's post job execution.
 *
 * @param     name     name of the state to store
 * @param     value    value to store
 */
export function saveState(
  name: string,
  value: string | number | boolean
): void {
  issueCommand('save-state', {name}, sanitizeInput(value))
}

/**
 * Gets the value of an state set by this action's main execution.
 *
 * @param     name     name of the state to get
 * @returns   string
 */
export function getState(name: string): string {
  return process.env[`STATE_${name}`] || ''
}

/**
 * Sanatizes an input into a string so it can be passed into issueCommand
 * @param input Input parameter to sanitize into a string
 */
function sanitizeInput(input: any): string {
  if (input == null) {
    return ''
  } else if (typeof input === 'string' || input instanceof String) {
    return input as string
  } else if (input instanceof Error) {
    return (input as Error).toString()
  } else {
    return JSON.stringify(input)
  }
}
