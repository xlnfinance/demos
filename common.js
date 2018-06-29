// common JS utils shared among demo apps
l=console.log

var fallback = setTimeout(()=>{
//main.innerHTML="Couldn't connect to local node at "+fs_origin+". <a href='https://fairlayer.com/#install'>Please install Fairlayer first</a>"
}, 3000)


commy = (b, dot = true) => {
  let prefix = b < 0 ? '-' : ''

  b = Math.abs(b).toString()
  if (dot) {
    if (b.length == 1) {
      b = '0.0' + b
    } else if (b.length == 2) {
      b = '0.' + b
    } else {
      var insert_dot_at = b.length - 2
      b = b.slice(0, insert_dot_at) + '.' + b.slice(insert_dot_at)
    }
  }
  return prefix + b.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

window.onload = function(){
  // invoice can also be included as #hash to the address
  deposit.innerHTML = address + '#' + invoice
  yourid.innerHTML = invoice

  var opts = '<option disabled>Select Fair asset to operate with</option>'
  for (var a of assets) {
    opts += `<option value="${a.id}">${a.ticker}: ${user[a.id] ? commy(user[a.id]) : '0.00'}</option>`
  }

  picker.innerHTML = opts
  picker.onchange = (e)=>localStorage.last_asset=picker.value
  picker.value = localStorage.last_asset ? localStorage.last_asset : '1'

  withdraw.onclick = function(){
    axios.post('/init', {
      destination: destination.value,
      amount: amount.value,
      asset: parseInt(picker.value)
    }).then((r)=>{
      if (r.data.status == 'paid') {
        alert("Sent!")
        location.reload()
      } else {
        alert(r.data.error)
      }
    })
  }

  deposit.onclick = function(){
    fs_w = window.open(fs_origin+'#wallet?address='+address+'&invoice='+invoice+'&editable=amount&asset='+picker.value)

    window.addEventListener('message', function(e){
      if(e.origin != fs_origin) return

      // the wallet claims the payment has gone through
      if (e.data.status == 'paid') {
        fs_w.close()
        setTimeout(()=>{
          location.reload()
        }, 1000)
      } else if (e.data.status == 'login') {
        // login token shared
      }

    })
  }
}