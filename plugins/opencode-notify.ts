import type { Plugin } from "@opencode-ai/plugin"
import { appendFileSync } from "node:fs"

const BIN = "@agent-notify@"
const DEBUG_LOG = "/tmp/opencode-plugin-debug.log"

const dbg = (msg: string) => {
  try {
    appendFileSync(DEBUG_LOG, `${new Date().toISOString()} ${msg}\n`)
  } catch {}
}

export const AgentNotifyPlugin: Plugin = async ({ $, client, directory }) => {
  const dir = directory.split("/").pop() ?? ""

  const isMainSession = async (sessionID: string) => {
    try {
      const session = await client.session.get({ path: { id: sessionID } })
      dbg(`session.get ${sessionID} -> parentID=${JSON.stringify(session?.parentID)}`)
      return !session?.parentID
    } catch (e) {
      dbg(`session.get ${sessionID} FAILED: ${String(e)}`)
      return true
    }
  }

  return {
    event: async ({ event }) => {
      const props = (event.properties ?? {}) as any
      dbg(`event ${event.type} sessionID=${JSON.stringify(props.sessionID)} props=${JSON.stringify(props)}`)
      if (event.type === "session.idle" || (event.type === "session.status" && props.status?.type === "idle")) {
        const ok = await isMainSession(props.sessionID)
        dbg(`idle ${props.sessionID} isMain=${ok}`)
        if (!ok) return
        await $`${BIN} opencode complete "" ${dir}`.nothrow().quiet()
      }
      if (event.type === "permission.asked") {
        if (!(await isMainSession(props.sessionID))) return
        const what = props.patterns.join(", ") || props.permission
        await $`${BIN} opencode permission ${what} ${dir}`.nothrow().quiet()
      }
    },
  }
}
