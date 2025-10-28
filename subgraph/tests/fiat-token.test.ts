import { assert, clearStore, describe, test, beforeEach, afterEach } from "matchstick-as/assembly/index"
import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts"
import { handleTransfer } from "../src/fiat-token"
import { createTransferEvent } from "./fiat-token-utils"

const ZERO_ADDRESS = Address.fromString("0x0000000000000000000000000000000000000000")
const SECONDS_PER_DAY = 60 * 60 * 24
const WEEK_ADDRESSES = [
  "0x0000000000000000000000000000000000000010",
  "0x0000000000000000000000000000000000000011",
  "0x0000000000000000000000000000000000000012",
  "0x0000000000000000000000000000000000000013",
  "0x0000000000000000000000000000000000000014",
  "0x0000000000000000000000000000000000000015",
  "0x0000000000000000000000000000000000000016"
].map<Address>((addr) => Address.fromString(addr))

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
    event.block.timestamp = BigInt.fromI32(SECONDS_PER_DAY)
    event.block.number = BigInt.fromI32(1)

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
    mintEvent.block.timestamp = BigInt.fromI32(SECONDS_PER_DAY + 100)
    mintEvent.block.number = BigInt.fromI32(10)
    handleTransfer(mintEvent)

    assert.fieldEquals("Account", holder.toHexString(), "balance", mintValue.toString())
    let statId = Bytes.fromUTF8("global").toHexString()
    assert.fieldEquals("GlobalStat", statId, "holderCount", "1")
    assert.fieldEquals("GlobalStat", statId, "totalSupply", mintValue.toString())
    let dayId = ((SECONDS_PER_DAY + 100) / SECONDS_PER_DAY).toString()
    assert.fieldEquals("DailyStat", dayId, "holderCount", "1")
    assert.fieldEquals("DailyStat", dayId, "totalSupply", mintValue.toString())

    // Burn entire balance (to zero address)
    let burnEvent = createTransferEvent(holder, ZERO_ADDRESS, burnValue)
    burnEvent.block.timestamp = BigInt.fromI32(SECONDS_PER_DAY + 500)
    burnEvent.block.number = BigInt.fromI32(20)
    handleTransfer(burnEvent)

    assert.fieldEquals("Account", holder.toHexString(), "balance", "0")
    assert.fieldEquals("GlobalStat", statId, "holderCount", "0")
    assert.fieldEquals("GlobalStat", statId, "totalSupply", "0")
    assert.fieldEquals("DailyStat", dayId, "holderCount", "0")
    assert.fieldEquals("DailyStat", dayId, "totalSupply", "0")
  })

  test("tracks daily stats over a week", () => {
    let cumulativeSupply = BigInt.zero()
    let statId = Bytes.fromUTF8("global").toHexString()

    for (let i = 0; i < WEEK_ADDRESSES.length; i++) {
      let address = WEEK_ADDRESSES[i]
      let amount = BigInt.fromI32(100 * (i + 1))
      cumulativeSupply = cumulativeSupply.plus(amount)

      let event = createTransferEvent(ZERO_ADDRESS, address, amount)
      event.block.timestamp = BigInt.fromI32(i * SECONDS_PER_DAY + 123)
      event.block.number = BigInt.fromI32(i + 100)
      handleTransfer(event)

      let dayId = i.toString()
      let dayStart = ((i * SECONDS_PER_DAY) as i32).toString()
      assert.fieldEquals("DailyStat", dayId, "holderCount", (i + 1).toString())
      assert.fieldEquals("DailyStat", dayId, "totalSupply", cumulativeSupply.toString())
      assert.fieldEquals(
        "DailyStat",
        dayId,
        "dayStartTimestamp",
        BigInt.fromI32(i * SECONDS_PER_DAY).toString()
      )
    }

    assert.fieldEquals("GlobalStat", statId, "holderCount", WEEK_ADDRESSES.length.toString())
    assert.fieldEquals("GlobalStat", statId, "totalSupply", cumulativeSupply.toString())
  })
})
