import { type Server, createServer } from 'node:http'
import type { AddressInfo } from 'node:net'

// A stand-in for the Messages API of Anthropic on localhost, for the tests
// that run the real Claude Code of the Agent SDK with no key and no cost:
// each request of the agent loop gets the next call of `calls` as its
// answer, then a last text that ends the run. A request with no tools (a
// side call of Claude Code) gets a plain text.

export type Call = { name: string; input: Record<string, unknown> }

export type MessagesApi = { url: string; close: () => Promise<void> }

export const toolUseIdOf = (step: number): string => `toolu_${step}`

type Block =
  | { type: 'text'; text: string }
  | {
      type: 'tool_use'
      id: string
      name: string
      input: Record<string, unknown>
    }

const blockOf = (calls: Call[], step: number): Block => {
  const call = calls[step]
  return call === undefined
    ? { type: 'text', text: 'Done.' }
    : { type: 'tool_use', id: toolUseIdOf(step), ...call }
}

const eventsOf = (model: string, block: Block) => [
  {
    type: 'message_start',
    message: {
      id: 'msg_test',
      type: 'message',
      role: 'assistant',
      model,
      content: [],
      stop_reason: null,
      stop_sequence: null,
      usage: { input_tokens: 1, output_tokens: 1 },
    },
  },
  {
    type: 'content_block_start',
    index: 0,
    content_block:
      block.type === 'tool_use'
        ? { ...block, input: {} }
        : { type: 'text', text: '' },
  },
  {
    type: 'content_block_delta',
    index: 0,
    delta:
      block.type === 'tool_use'
        ? {
            type: 'input_json_delta',
            partial_json: JSON.stringify(block.input),
          }
        : { type: 'text_delta', text: block.text },
  },
  { type: 'content_block_stop', index: 0 },
  {
    type: 'message_delta',
    delta: {
      stop_reason: block.type === 'tool_use' ? 'tool_use' : 'end_turn',
      stop_sequence: null,
    },
    usage: { output_tokens: 1 },
  },
  { type: 'message_stop' },
]

const portOf = (address: AddressInfo | string | null): number =>
  typeof address === 'object' && address !== null ? address.port : 0

export const messagesApi = (calls: Call[]): Promise<MessagesApi> => {
  const state = { step: 0 }
  const server: Server = createServer((request, response) => {
    const chunks: Buffer[] = []
    request.on('data', (chunk: Buffer) => chunks.push(chunk))
    request.on('end', () => {
      const body: unknown = JSON.parse(Buffer.concat(chunks).toString() || '{}')
      const tools =
        typeof body === 'object' && body !== null && 'tools' in body
          ? body.tools
          : undefined
      const model =
        typeof body === 'object' && body !== null && 'model' in body
          ? String(body.model)
          : 'claude'
      const inLoop = Array.isArray(tools) && tools.length > 0
      const block: Block = inLoop
        ? blockOf(calls, state.step++)
        : { type: 'text', text: 'ok' }
      response.writeHead(200, { 'content-type': 'text/event-stream' })
      response.end(
        eventsOf(model, block)
          .map(
            (event) =>
              `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`,
          )
          .join(''),
      )
    })
  })
  return new Promise((resolve) =>
    server.listen(0, '127.0.0.1', () =>
      resolve({
        url: `http://127.0.0.1:${portOf(server.address())}`,
        close: () => new Promise((done) => server.close(() => done())),
      }),
    ),
  )
}
