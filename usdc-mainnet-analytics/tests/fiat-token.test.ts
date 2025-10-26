import { assert, clearStore, describe, test, beforeEach, afterEach } from "matchstick-as/assembly/index"
import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts"
import { handleTransfer } from "../src/fiat-token"
import { createTransferEvent } from "./fiat-token-utils"

const ZERO_ADDRESS = Address.fromString("0x0000000000000000000000000000000000000000")

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

  test("updates holder count when balances cross zero boundary", () => {
    let holder = Address.fromString("0x00000000000000000000000000000000000000c0")
    let mintValue = BigInt.fromI32(500)
    let burnValue = BigInt.fromI32(500)

    // Mint to holder (from zero address)
    let mintEvent = createTransferEvent(ZERO_ADDRESS, holder, mintValue)
    handleTransfer(mintEvent)

    assert.fieldEquals("Account", holder.toHexString(), "balance", mintValue.toString())
    let statId = Bytes.fromUTF8("global").toHexString()
    assert.fieldEquals("GlobalStat", statId, "holderCount", "1")

    // Burn entire balance (to zero address)
    let burnEvent = createTransferEvent(holder, ZERO_ADDRESS, burnValue)
    handleTransfer(burnEvent)

    assert.fieldEquals("Account", holder.toHexString(), "balance", "0")
    assert.fieldEquals("GlobalStat", statId, "holderCount", "0")
  })
})
