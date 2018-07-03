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
if (fs.existsSync('/root/fair/data8002/offchain/pk.json')) {
  fair_path = '/root/fair/data8002/offchain'
  our_fair_rpc = 'http://127.0.0.1:8202/rpc'
} else {
  fair_path = '/Users/homakov/work/fair/data8002/offchain'
  our_fair_rpc = 'http://127.0.0.1:8002/rpc'
}

// pointing browser SDK to user node
local_fair_rpc = 'http://127.0.0.1:8001'

processUpdates = async () => {
  r = await Fair('receivedAndFailed')

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

Fair = (method, params = {}) => {
  return axios.post(our_fair_rpc, {
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
  fair_origin = '${local_fair_rpc}'
  our_address = '${our_address}'
  invoice = '${id}'
  user = ${JSON.stringify(users[id])}
  assets = ${JSON.stringify(assets).replace("/",'\\/')}
  </script>
</head>

<body>
  <main role="main" class="container" id="main">
    <h1 class="mt-5">Fairlayer Integration Demo (JS)</h1>

    <p>Your account in this service: <span id="yourid"></span></p>
    <p><select id="picker">
    </select></p>
    <p>Deposit Address: <a href="#" id="deposit"></a></p>
    <p><input type="text" id="address" placeholder="Withdraw Address"></p>
    <p><input type="text" id="amount" placeholder="Amount"></p>
    <p><button class="btn btn-success" id="withdraw">Withdraw</button></p>

    <p><b>How to play with it?</b></p>
    <p>1. <a href="https://fairlayer.com/#install">Install Fairlayer</a></p>
    <p>2. Buy some Fair assets or use Testnet Faucet inside the wallet</p>
    <p>3. Select an asset and click on deposit address to send arbitrary amount</p>
    <p>4. ... (trade or somehow use the asset within the app)</p>
    <p>5. Withdraw the asset from demoapp to your wallet or other app</p>
    <p>6. <a href="https://github.com/fairlayer/demos">Read sources</a>. <a href="https://github.com/fairlayer/fair/blob/master/wiki/9_receive_and_pay.md">Implement receive/pay API on your own service</a></p>
 </main>
</body></html>`)
  } else if (req.url == '/init') {
    var queryData = ''
    req.on('data', function(data) {
      queryData += data
    })

    req.on('end', async function() {
      var p = JSON.parse(queryData)

      if (p.address) {
        var amount = Math.round(parseFloat(p.amount) * 100)

        if (!users[id][p.asset] || users[id][p.asset] < amount) {
          l('Not enough balance: ', users[id], p.asset)
          return false
        }
        users[id][p.asset] -= amount
        r = await Fair('send', {
          address: p.address,
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

  if (fs.existsSync(fair_path + '/pk.json')) {
    auth_code = JSON.parse(fs.readFileSync(fair_path + '/pk.json')).auth_code
    l('Auth code to our node: ' + auth_code)
  } else {
    l("No auth")
    return setTimeout(init, 1000)
  }

  r = await Fair('getinfo')
  if (!r.data.address) {
    l('No address')
    return setTimeout(init, 1000)
  }

  our_address = r.data.address
  assets = r.data.assets
  
  // assets you support
  whitelist = [1, 2]
  assets = assets.filter(a=>whitelist.includes(a.id))

  l('Our address: ' + our_address)
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
