// fair demo for JS
axios = require('axios')
l = console.log
crypto = require('crypto')
rand = () => crypto.randomBytes(6).toString('hex')

fs = require('fs')
users = {}

process.on('unhandledRejection', l)
process.on('uncaughtException', l)

// define merchant node path
if (fs.existsSync('/root/fs/data8002/offchain/pk.json')) {
  FS_PATH = '/root/fs/data8002/offchain'
  FS_RPC = 'http://127.0.0.1:8202/rpc'
} else {
  FS_PATH = '/Users/homakov/work/fs/data8002/offchain'
  FS_RPC = 'http://127.0.0.1:8002/rpc'
}

// pointing browser SDK to user node
LOCAL_FS_RPC = 'http://127.0.0.1:8001'

processUpdates = async () => {
  r = await FS('receivedAndFailed')

  if (!r.data.receivedAndFailed) return l("No receivedAndFailed")

  for (var obj of r.data.receivedAndFailed) {
    //if (obj.asset != 1) return // only FRD accepted

    let uid = Buffer.from(obj.invoice, 'hex').slice(1).toString()

    // checking if uid is valid
    if (users.hasOwnProperty(uid)) {
      l(uid+(obj.is_inward ? ' receive':' refund'), obj)

      // add or create asset balance
      if (users[uid][obj.asset]) {
        users[uid][obj.asset] += obj.amount
      } else {
        users[uid][obj.asset] = obj.amount
      }
    } else {
      l('No such user '+uid)
    }
  }

  setTimeout(processUpdates, 1000)
}

post = async (url, params) => {
  return new Promise((resolve) => {})
}

FS = (method, params = {}) => {
  return axios.post(FS_RPC, {
    method: method,
    auth_code: auth_code,
    params: params
  })
}




httpcb = async (req, res) => {
  var id = false

  if (req.headers.cookie) {
    var id = req.headers.cookie.split('id=')[1]
  }

  res.status = 200

  if (req.url == '/') {
    if (!id) {
      id = Math.round(Math.random() * 10000000) //rand()
      l('Set cookie')
      res.setHeader('Set-Cookie', 'id=' + id)
      repl.context.res = res
    }
    if (!users[id]) users[id] = {}

    res.end(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <link rel="stylesheet" href="/bootstrap.min.css">
  <script src="/axios.js"></script>
  <script src="/common.js"></script>
  <title>Fairlayer Integration Demo</title>

  <script>
  fs_origin = '${LOCAL_FS_RPC}'
  address = '${address}'
  invoice = '${id}'
  user = ${JSON.stringify(users[id])}
  assets = ${JSON.stringify(assets)}
  </script>
</head>

<body>
  <main role="main" class="container" id="main">
    <h1 class="mt-5">Fairlayer Integration Demo (JS)</h1>

    <p>Your account in this service: <span id="yourid"></span></p>
    <p><select id="picker">
    </select></p>
    <p>Deposit Address: <a href="#" id="deposit"></a></p>
    <p><input type="text" id="destination" placeholder="Withdraw Address"></p>
    <p><input type="text" id="amount" placeholder="Amount"></p>
    <p><button class="btn btn-success" id="withdraw">Withdraw</button></p>

    <p><b>How to play with it?</b></p>
    <p>1. <a href="https://fairlayer.com/#install">Install Fairlayer</a></p>
    <p>2. Buy some Fair assets or use Testnet Faucet inside the wallet</p>
    <p>3. Select an asset and click on deposit address to send arbitrary amount</p>
    <p>4. ... (trade or somehow use the asset within the app)</p>
    <p>5. Withdraw the asset from demoapp to your wallet or other app</p>
 </main>
</body></html>`)
  } else if (req.url == '/init') {
    var queryData = ''
    req.on('data', function(data) {
      queryData += data
    })

    req.on('end', async function() {
      var p = JSON.parse(queryData)

      if (p.destination) {
        var amount = Math.round(parseFloat(p.amount) * 100)

        if (!users[id][p.asset] || users[id][p.asset] < amount) {
          l('Not enough balance: ', users[id], p.asset)
          return false
        }
        users[id][p.asset] -= amount
        r = await FS('send', {
          destination: p.destination,
          amount: amount,
          invoice: id,
          asset: p.asset
        })
        l(r.data)

        // if fail, do not withdraw?
        res.end(JSON.stringify({status: 'paid'}))
      }
    })
  } else {
    require('serve-static')(require('path').resolve(__dirname, '.'))(req, res, require('finalhandler')(req, res))
  }
}



init = async () => {

  if (fs.existsSync(FS_PATH + '/pk.json')) {
    auth_code = JSON.parse(fs.readFileSync(FS_PATH + '/pk.json')).auth_code
    l('Auth code to our node: ' + auth_code)
  } else {
    l("No auth")
    return setTimeout(init, 1000)
  }

  r = await FS('getinfo')
  if (!r.data.address) {
    l('No address')
    return setTimeout(init, 1000)
  }

  address = r.data.address
  assets = r.data.assets
  
  // assets you support
  whitelist = [1, 2]
  assets = assets.filter(a=>whitelist.includes(a.id))

  l('Our address: ' + address)
  processUpdates()


  require('http')
    .createServer(httpcb)
    .listen(3010)

  /*
  try{
    require('../lib/opn')('http://127.0.0.1:3010')
  } catch(e){} */
}

init()

repl = require('repl').start()
