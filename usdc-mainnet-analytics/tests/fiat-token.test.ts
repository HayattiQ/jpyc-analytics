import { assert, clearStore, describe, test, beforeEach, afterEach } from "matchstick-as/assembly/index"
import { Address, BigInt } from "@graphprotocol/graph-ts"
import { handleTransfer } from "../src/fiat-token"
import { createTransferEvent } from "./fiat-token-utils"

describe("FiatToken transfer handler", () => {
  beforeEach(() => {
    clearStore()
  })

  afterEach(() => {
    clearStore()
  })

  test("creates Transfer entity", () => {
    let from = Address.fromString("0x00000000000000000000000000000000000000a0")
    let to = Address.fromString("0x00000000000000000000000000000000000000b0")
    let value = BigInt.fromI32(1000)
    let event = createTransferEvent(from, to, value)

    handleTransfer(event)

    assert.entityCount("Transfer", 1)
    let id = event.transaction.hash.concatI32(event.logIndex.toI32()).toHexString()
    assert.fieldEquals("Transfer", id, "from", from.toHexString())
    assert.fieldEquals("Transfer", id, "to", to.toHexString())
    assert.fieldEquals("Transfer", id, "value", value.toString())
  })
})
