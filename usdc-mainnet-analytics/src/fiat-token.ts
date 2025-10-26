import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts"
import { Transfer as TransferEvent } from "../generated/FiatToken/FiatToken"
import { Account, GlobalStat, Transfer } from "../generated/schema"

const ZERO_ADDRESS = Address.zero()
const ONE = BigInt.fromI32(1)

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
  let statId = Bytes.fromUTF8("global")
  let stat = GlobalStat.load(statId)
  if (stat == null) {
    stat = new GlobalStat(statId)
    stat.holderCount = BigInt.zero()
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

  if (event.params.from.notEqual(ZERO_ADDRESS)) {
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

  if (event.params.to.notEqual(ZERO_ADDRESS)) {
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

  stat.updatedAtBlock = event.block.number
  stat.updatedAtTimestamp = event.block.timestamp
  stat.save()
}
