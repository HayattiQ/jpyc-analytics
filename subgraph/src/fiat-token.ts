import { Address, BigInt, Bytes, Value } from "@graphprotocol/graph-ts"
import { Transfer as TransferEvent } from "../generated/FiatToken/FiatToken"
import { Account, DailyStat, GlobalStat, Transfer } from "../generated/schema"

const ZERO_ADDRESS = Address.zero()
const ONE = BigInt.fromI32(1)
const SECONDS_PER_DAY = 60 * 60 * 24
const STAT_ID = Bytes.fromUTF8("global")
// 既定の issuer / redeem（web/src/config.json と同一想定）。
const ISSUER_ADDRESS = Address.fromString("0x8549e82239a88f463ab6e55ad1895b629a00def3")
const REDEEM_ADDRESS = Address.fromString("0xb808af91bdc577bfb3f9c91470f3286dd076e5c1")

// Holder balance thresholds (smallest units; JPYC assumed 18 decimals)
const DECIMALS = 18
function pow10(exp: i32): BigInt {
  let x = BigInt.fromI32(1)
  for (let i = 0; i < exp; i++) x = x.times(BigInt.fromI32(10))
  return x
}
const ONE_TOKEN = pow10(DECIMALS)
const T_10K = ONE_TOKEN.times(BigInt.fromI32(10000))
const T_100K = ONE_TOKEN.times(BigInt.fromI32(100000))
const T_1M = ONE_TOKEN.times(BigInt.fromI32(1000000))
const T_10M = ONE_TOKEN.times(BigInt.fromI32(10000000))

function bucketIndex(balance: BigInt): i32 {
  if (balance.equals(BigInt.zero())) return -1
  if (balance.le(T_10K)) return 0 // <=10k
  if (balance.le(T_100K)) return 1 // (10k,100k]
  if (balance.le(T_1M)) return 2 // (100k,1M]
  if (balance.le(T_10M)) return 3 // (1M,10M]
  return 4 // >10M
}

function decLe(stat: GlobalStat, idx: i32): void {
  if (idx <= 0) stat.holdersLe10k = stat.holdersLe10k.minus(ONE)
  if (idx <= 1) stat.holdersLe100k = stat.holdersLe100k.minus(ONE)
  if (idx <= 2) stat.holdersLe1m = stat.holdersLe1m.minus(ONE)
  if (idx <= 3) stat.holdersLe10m = stat.holdersLe10m.minus(ONE)
  if (idx == 4) stat.holdersGt10m = stat.holdersGt10m.minus(ONE)
}

function incLe(stat: GlobalStat, idx: i32): void {
  if (idx <= 0) stat.holdersLe10k = stat.holdersLe10k.plus(ONE)
  if (idx <= 1) stat.holdersLe100k = stat.holdersLe100k.plus(ONE)
  if (idx <= 2) stat.holdersLe1m = stat.holdersLe1m.plus(ONE)
  if (idx <= 3) stat.holdersLe10m = stat.holdersLe10m.plus(ONE)
  if (idx == 4) stat.holdersGt10m = stat.holdersGt10m.plus(ONE)
}

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
    stat.circulatingSupply = BigInt.zero()
    stat.transactionVolume = BigInt.zero()
    stat.inflowVolume = BigInt.zero()
    stat.outflowVolume = BigInt.zero()
    stat.netInflow = BigInt.zero()
    stat.inflowCount = BigInt.zero()
    stat.outflowCount = BigInt.zero()
    stat.updatedAtBlock = BigInt.zero()
    stat.updatedAtTimestamp = BigInt.zero()
    // initialize new bucket fields
    stat.holdersLe10k = BigInt.zero()
    stat.holdersLe100k = BigInt.zero()
    stat.holdersLe1m = BigInt.zero()
    stat.holdersLe10m = BigInt.zero()
    stat.holdersGt10m = BigInt.zero()
  } else {
    // Backward compatibility for preexisting entities when schema adds non-null fields
    if (stat.get("circulatingSupply") == null) stat.set("circulatingSupply", Value.fromBigInt(BigInt.zero()))
    if (stat.get("transactionVolume") == null) stat.set("transactionVolume", Value.fromBigInt(BigInt.zero()))
    if (stat.get("inflowVolume") == null) stat.set("inflowVolume", Value.fromBigInt(BigInt.zero()))
    if (stat.get("outflowVolume") == null) stat.set("outflowVolume", Value.fromBigInt(BigInt.zero()))
    if (stat.get("netInflow") == null) stat.set("netInflow", Value.fromBigInt(BigInt.zero()))
    if (stat.get("inflowCount") == null) stat.set("inflowCount", Value.fromBigInt(BigInt.zero()))
    if (stat.get("outflowCount") == null) stat.set("outflowCount", Value.fromBigInt(BigInt.zero()))
    if (stat.get("holdersLe10k") == null) stat.set("holdersLe10k", Value.fromBigInt(BigInt.zero()))
    if (stat.get("holdersLe100k") == null) stat.set("holdersLe100k", Value.fromBigInt(BigInt.zero()))
    if (stat.get("holdersLe1m") == null) stat.set("holdersLe1m", Value.fromBigInt(BigInt.zero()))
    if (stat.get("holdersLe10m") == null) stat.set("holdersLe10m", Value.fromBigInt(BigInt.zero()))
    if (stat.get("holdersGt10m") == null) stat.set("holdersGt10m", Value.fromBigInt(BigInt.zero()))
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
    stat.transactionVolume = BigInt.zero()
    stat.inflowVolume = BigInt.zero()
    stat.outflowVolume = BigInt.zero()
    stat.netInflow = BigInt.zero()
    stat.inflowCount = BigInt.zero()
    stat.outflowCount = BigInt.zero()
    stat.updatedAtBlock = BigInt.zero()
    stat.updatedAtTimestamp = BigInt.zero()
    // initialize new bucket fields
    stat.holdersLe10k = BigInt.zero()
    stat.holdersLe100k = BigInt.zero()
    stat.holdersLe1m = BigInt.zero()
    stat.holdersLe10m = BigInt.zero()
    stat.holdersGt10m = BigInt.zero()
  } else {
    if (stat.get("transactionVolume") == null) stat.set("transactionVolume", Value.fromBigInt(BigInt.zero()))
    if (stat.get("inflowVolume") == null) stat.set("inflowVolume", Value.fromBigInt(BigInt.zero()))
    if (stat.get("outflowVolume") == null) stat.set("outflowVolume", Value.fromBigInt(BigInt.zero()))
    if (stat.get("netInflow") == null) stat.set("netInflow", Value.fromBigInt(BigInt.zero()))
    if (stat.get("inflowCount") == null) stat.set("inflowCount", Value.fromBigInt(BigInt.zero()))
    if (stat.get("outflowCount") == null) stat.set("outflowCount", Value.fromBigInt(BigInt.zero()))
    if (stat.get("holdersLe10k") == null) stat.set("holdersLe10k", Value.fromBigInt(BigInt.zero()))
    if (stat.get("holdersLe100k") == null) stat.set("holdersLe100k", Value.fromBigInt(BigInt.zero()))
    if (stat.get("holdersLe1m") == null) stat.set("holdersLe1m", Value.fromBigInt(BigInt.zero()))
    if (stat.get("holdersLe10m") == null) stat.set("holdersLe10m", Value.fromBigInt(BigInt.zero()))
    if (stat.get("holdersGt10m") == null) stat.set("holdersGt10m", Value.fromBigInt(BigInt.zero()))
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
  let fromIssuer = event.params.from.equals(ISSUER_ADDRESS)
  let toRedeem = event.params.to.equals(REDEEM_ADDRESS)

  if (!minted) {
    let fromAccount = loadOrCreateAccount(event.params.from)
    let previousBalance = fromAccount.balance
    let prevIdx = previousBalance.gt(BigInt.zero()) ? bucketIndex(previousBalance) : -1
    let newFromBalance = previousBalance.minus(event.params.value)
    if (newFromBalance.lt(BigInt.zero())) newFromBalance = BigInt.zero()
    let newIdx = newFromBalance.gt(BigInt.zero()) ? bucketIndex(newFromBalance) : -1
    fromAccount.balance = newFromBalance
    if (previousBalance.gt(BigInt.zero()) && newFromBalance.equals(BigInt.zero())) {
      stat.holderCount = stat.holderCount.minus(ONE)
    }
    // circulating adjustment for non-issuer and non-redeem
    if (!event.params.from.equals(ISSUER_ADDRESS) && !event.params.from.equals(REDEEM_ADDRESS)) {
      let reduced = previousBalance.minus(newFromBalance)
      if (reduced.gt(BigInt.zero())) {
        stat.circulatingSupply = stat.circulatingSupply.minus(reduced)
      }
    }
    if (prevIdx != newIdx) {
      if (prevIdx != -1) decLe(stat, prevIdx)
      if (newIdx != -1) incLe(stat, newIdx)
    }
    fromAccount.updatedAtBlock = event.block.number
    fromAccount.updatedAtTimestamp = event.block.timestamp
    fromAccount.save()
  }

  if (!burned) {
    let toAccount = loadOrCreateAccount(event.params.to)
    let previousBalance = toAccount.balance
    let prevIdxTo = previousBalance.gt(BigInt.zero()) ? bucketIndex(previousBalance) : -1
    let newToBalance = previousBalance.plus(event.params.value)
    let newIdxTo = newToBalance.gt(BigInt.zero()) ? bucketIndex(newToBalance) : -1
    toAccount.balance = newToBalance
    if (previousBalance.equals(BigInt.zero()) && newToBalance.gt(BigInt.zero())) {
      stat.holderCount = stat.holderCount.plus(ONE)
    }
    // circulating adjustment for non-issuer and non-redeem
    if (!event.params.to.equals(ISSUER_ADDRESS) && !event.params.to.equals(REDEEM_ADDRESS)) {
      let added = newToBalance.minus(previousBalance)
      if (added.gt(BigInt.zero())) {
        stat.circulatingSupply = stat.circulatingSupply.plus(added)
      }
    }
    if (prevIdxTo != newIdxTo) {
      if (prevIdxTo != -1) decLe(stat, prevIdxTo)
      if (newIdxTo != -1) incLe(stat, newIdxTo)
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
  stat.transactionVolume = stat.transactionVolume.plus(event.params.value)
  if (fromIssuer) {
    stat.inflowVolume = stat.inflowVolume.plus(event.params.value)
    stat.inflowCount = stat.inflowCount.plus(ONE)
  }
  if (toRedeem) {
    stat.outflowVolume = stat.outflowVolume.plus(event.params.value)
    stat.outflowCount = stat.outflowCount.plus(ONE)
  }
  stat.netInflow = stat.inflowVolume.minus(stat.outflowVolume)
  stat.save()

  let daily = loadOrCreateDailyStat(event.block.timestamp)
  daily.transactionVolume = daily.transactionVolume.plus(event.params.value)
  if (fromIssuer) {
    daily.inflowVolume = daily.inflowVolume.plus(event.params.value)
    daily.inflowCount = daily.inflowCount.plus(ONE)
  }
  if (toRedeem) {
    daily.outflowVolume = daily.outflowVolume.plus(event.params.value)
    daily.outflowCount = daily.outflowCount.plus(ONE)
  }
  daily.netInflow = daily.inflowVolume.minus(daily.outflowVolume)
  daily.holderCount = stat.holderCount
  // 循環供給量（non-issuer 残高の合計）をスナップショット
  daily.totalSupply = stat.circulatingSupply
  // Snapshot holder buckets
  daily.holdersLe10k = stat.holdersLe10k
  daily.holdersLe100k = stat.holdersLe100k
  daily.holdersLe1m = stat.holdersLe1m
  daily.holdersLe10m = stat.holdersLe10m
  daily.holdersGt10m = stat.holdersGt10m
  daily.updatedAtBlock = event.block.number
  daily.updatedAtTimestamp = event.block.timestamp
  if (daily.dayStartTimestamp.equals(BigInt.zero())) {
    daily.dayStartTimestamp = getDayStartTimestamp(event.block.timestamp)
  }
  daily.save()
}
