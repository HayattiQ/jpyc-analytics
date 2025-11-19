GeckoTerminal API V2
 v2-beta 
OAS3
GeckoTerminal Public API endpoints.

Beta Release
The API is in its Beta release, and is subject to frequent changes. However, we aim to provide minimal disruption, and setting the request version would help avoid unexpected issues.

Please subscribe via this form to be notified of important API updates.

Base URL
All endpoints below use the base URL: https://api.geckoterminal.com/api/v2

Versioning
It is recommended to set the API version via the Accept header. The current version is 20230203.

For example, to specify the current version, set header Accept: application/json;version=20230203.

If no version is specified, the latest version will be used.

Data Freshness
All endpoints listed below are cached for 1 minute

All data is updated as fast as 2-3 seconds after a transaction is confirmed on the blockchain, subject to the network's availability.

Rate Limit
Our free API is limited to 30 calls/minute. Should you require a higher rate limit, you may subscribe to any CoinGecko API paid plan to access higher rate limit for GeckoTerminal endpoints (known as /onchain endpoints) or learn more at CoinGecko.

To share with us your feedback about the public API, let us know here!

OHLCV


GET
/networks/{network}/pools/{pool_address}/ohlcv/{timeframe}
Pool OHLCV chart by Pool Address
Dexes


GET
/networks/{network}/dexes
Supported Dexes List by Network (ID Map)
Networks


GET
/networks
Supported Networks List (ID Map)
Pools


GET
/networks/trending_pools
Trending Pools List

GET
/networks/{network}/trending_pools
Trending Pools by Network

GET
/networks/{network}/pools/{address}
Specific Pool Data by Pool Address

GET
/networks/{network}/pools/multi/{addresses}
Multiple Pools Data by Pool Addresses

GET
/networks/{network}/pools
Top Pools by Network

GET
/networks/{network}/dexes/{dex}/pools
Top Pools by Dex

GET
/networks/{network}/new_pools
New Pools by Network

GET
/networks/new_pools
New Pools List

GET
/search/pools
Search Pools
Tokens


GET
/networks/{network}/tokens/{token_address}/pools
Top Pools by Token Address

GET
/networks/{network}/tokens/{address}
Token Data by Token Address

GET
/networks/{network}/tokens/multi/{addresses}
Tokens Data by Token Addresses

GET
/networks/{network}/tokens/{address}/info
Token Info by Token Address

GET
/networks/{network}/pools/{pool_address}/info
Pool Tokens Info by Pool Address

GET
/tokens/info_recently_updated
Most Recently Updated Tokens List
Trades


GET
/networks/{network}/pools/{pool_address}/trades
Past 24 Hour Trades by Pool Address
Simple


GET
/simple/networks/{network}/token_price/{addresses}
Token Price by Token Addresses

Schemas