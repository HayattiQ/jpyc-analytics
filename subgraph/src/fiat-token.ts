import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts"
import { Transfer as TransferEvent } from "../generated/FiatToken/FiatToken"
import { Account, DailyStat, GlobalStat, Transfer } from "../generated/schema"

const ZERO_ADDRESS = Address.zero()
const ONE = BigInt.fromI32(1)
const SECONDS_PER_DAY = 60 * 60 * 24
const STAT_ID = Bytes.fromUTF8("global")
// 既定の issuer（web/src/config.json と同一）。
const ISSUER_ADDRESS = Address.fromString("0x8549e82239a88f463ab6e55ad1895b629a00def3")

function loadOrCreateAccount(address: Address): Account {
  let account = Account.load(address)
  if (account == null) {
    account = new Account(address)
    account.balance = BigInt.zero()
    account.updatedAtBlock = BigInt.zero()
    account.updatedAtTimestamp = BigInt.zero()
  }
  return account
}

function loadOrCreateGlobalStat(): GlobalStat {
  let stat = GlobalStat.load(STAT_ID)
  if (stat == null) {
    stat = new GlobalStat(STAT_ID)
    stat.holderCount = BigInt.zero()
    stat.totalSupply = BigInt.zero()
    stat.updatedAtBlock = BigInt.zero()
    stat.updatedAtTimestamp = BigInt.zero()
  }
  return stat
}

function getDayStartTimestamp(timestamp: BigInt): BigInt {
  let day = timestamp.toI64() / SECONDS_PER_DAY
  return BigInt.fromI64(day * SECONDS_PER_DAY as i64)
}

function getDayId(timestamp: BigInt): string {
  let day = timestamp.toI64() / SECONDS_PER_DAY
  return day.toString()
}

function loadOrCreateDailyStat(timestamp: BigInt): DailyStat {
  let dayId = getDayId(timestamp)
  let stat = DailyStat.load(dayId)
  if (stat == null) {
    stat = new DailyStat(dayId)
    stat.dayStartTimestamp = getDayStartTimestamp(timestamp)
    stat.holderCount = BigInt.zero()
    stat.totalSupply = BigInt.zero()
    stat.updatedAtBlock = BigInt.zero()
    stat.updatedAtTimestamp = BigInt.zero()
  }
  return stat
}

export function handleTransfer(event: TransferEvent): void {
  let entity = new Transfer(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.from = event.params.from
  entity.to = event.params.to
  entity.value = event.params.value

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()

  let stat = loadOrCreateGlobalStat()
  let minted = event.params.from.equals(ZERO_ADDRESS)
  let burned = event.params.to.equals(ZERO_ADDRESS)

  if (!minted) {
    let fromAccount = loadOrCreateAccount(event.params.from)
    let previousBalance = fromAccount.balance
    fromAccount.balance = previousBalance.minus(event.params.value)
    if (
      previousBalance.gt(BigInt.zero()) &&
      fromAccount.balance.equals(BigInt.zero())
    ) {
      stat.holderCount = stat.holderCount.minus(ONE)
    }
    fromAccount.updatedAtBlock = event.block.number
    fromAccount.updatedAtTimestamp = event.block.timestamp
    fromAccount.save()
  }

  if (!burned) {
    let toAccount = loadOrCreateAccount(event.params.to)
    let previousBalance = toAccount.balance
    toAccount.balance = previousBalance.plus(event.params.value)
    if (
      previousBalance.equals(BigInt.zero()) &&
      toAccount.balance.gt(BigInt.zero())
    ) {
      stat.holderCount = stat.holderCount.plus(ONE)
    }
    toAccount.updatedAtBlock = event.block.number
    toAccount.updatedAtTimestamp = event.block.timestamp
    toAccount.save()
  }

  if (minted) {
    stat.totalSupply = stat.totalSupply.plus(event.params.value)
  } else if (burned) {
    stat.totalSupply = stat.totalSupply.minus(event.params.value)
  }

  stat.updatedAtBlock = event.block.number
  stat.updatedAtTimestamp = event.block.timestamp
  stat.save()

  let daily = loadOrCreateDailyStat(event.block.timestamp)
  daily.holderCount = stat.holderCount
  // 循環供給量 = 総発行量 - issuer 残高
  let issuerAccount = loadOrCreateAccount(ISSUER_ADDRESS)
  let circulating = stat.totalSupply.minus(issuerAccount.balance)
  if (circulating.lt(BigInt.zero())) {
    circulating = BigInt.zero()
  }
  daily.totalSupply = circulating
  daily.updatedAtBlock = event.block.number
  daily.updatedAtTimestamp = event.block.timestamp
  if (daily.dayStartTimestamp.equals(BigInt.zero())) {
    daily.dayStartTimestamp = getDayStartTimestamp(event.block.timestamp)
  }
  daily.save()
}
